from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.utils.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import os
import numpy as np
from uuid import uuid4

from app.core.embeddings import get_query_embedding
from app.core.llm import llm_engine
from pdf_synopsis.pdf_vector_pipeline import extract_pdf_text

router = APIRouter()

# Simple in-memory store for sessions: session_id -> {chunks, embeddings}
pdf_sessions = {}


def chunk_text_simple(text: str, chunk_size_chars: int = 1200, overlap: int = 200):
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size_chars, length)
        chunk = text[start:end]
        chunks.append(chunk.strip())
        start = end - overlap if end < length else end
    return [c for c in chunks if c]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    dot = np.dot(a_arr, b_arr)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


class UploadResponse(BaseModel):
    session_id: str
    chunks: int


@router.post('/upload_pdf', response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), session_id: Optional[str] = Form(None), user_id: str = Depends(get_current_user)):
    # Save uploaded file to temp and extract text
    suffix = os.path.splitext(file.filename)[1] if file.filename else '.pdf'
    sid = session_id or str(uuid4())
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = extract_pdf_text(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")

    os.unlink(tmp_path)

    chunks = chunk_text_simple(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No text extracted from PDF")

    # Compute embeddings using cloud provider (Gemini/OpenAI)
    embeddings = []
    for chunk in chunks:
        try:
            emb = get_query_embedding(chunk)
            embeddings.append(emb)
        except Exception as e:
            print(f"[WARNING] Failed to embed chunk: {e}")
            continue

    if not embeddings:
        raise HTTPException(status_code=500, detail="Failed to generate embeddings for PDF chunks")

    # Multi-PDF Support: Append to existing session in memory if available
    if sid not in pdf_sessions:
        pdf_sessions[sid] = { 'chunks': [], 'embeddings': [] }
    
    pdf_sessions[sid]['chunks'].extend(chunks[:len(embeddings)])
    pdf_sessions[sid]['embeddings'].extend(embeddings)

    # Persist chunks to MongoDB for scaling across restarts
    try:
        from app.db.mongo import db
        from datetime import datetime
        db_docs = []
        for c, e in zip(chunks[:len(embeddings)], embeddings):
            db_docs.append({
                "session_id": sid,
                "filename": file.filename,
                "chunk": c,
                "embedding": e,
                "timestamp": datetime.utcnow()
            })
        if db_docs:
            db["documents_embedded"].insert_many(db_docs)
    except Exception as e:
        print(f"[WARNING] Failed to save chunks to MongoDB: {e}")

    return UploadResponse(session_id=sid, chunks=len(embeddings))


class QueryRequest(BaseModel):
    session_id: str
    query: str
    top_k: Optional[int] = 5


@router.post('/query')
def query_pdf(req: QueryRequest, user_id: str = Depends(get_current_user)):
    session = pdf_sessions.get(req.session_id)
    
    # Fallback: Restore session from MongoDB if memory is flushed
    if not session:
        try:
            from app.db.mongo import db
            cursor = db["documents_embedded"].find({"session_id": req.session_id})
            db_chunks = []
            db_embs = []
            for doc in cursor:
                db_chunks.append(doc["chunk"])
                db_embs.append(doc["embedding"])
            
            if db_chunks:
                pdf_sessions[req.session_id] = {
                    'chunks': db_chunks,
                    'embeddings': db_embs
                }
                session = pdf_sessions[req.session_id]
        except Exception as e:
            print(f"[WARNING] Failed to restore session from DB: {e}")

    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    # Get query embedding using same cloud provider
    q_emb = get_query_embedding(req.query)

    # Find top_k most similar chunks using cosine similarity
    similarities = []
    for i, emb in enumerate(session['embeddings']):
        sim = _cosine_similarity(q_emb, emb)
        similarities.append((i, sim))

    similarities.sort(key=lambda x: x[1], reverse=True)
    top_results = similarities[:req.top_k]

    # Build context from retrieved chunks
    context_blocks = []
    sources = []
    for idx, score in top_results:
        try:
            context_blocks.append(session['chunks'][idx])
            sources.append({'idx': idx, 'score': round(score, 4)})
        except Exception:
            pass

    prompt = "Use the following extracted document excerpts to answer the question.\n\nContext:\n"
    for i, cb in enumerate(context_blocks):
        prompt += f"Excerpt {i+1}: {cb}\n\n"
    prompt += f"Question: {req.query}\nAnswer concisely and cite which excerpt you used (e.g., Excerpt 1)."

    # Use existing cloud LLM engine instead of local flan-t5
    answer = llm_engine.chat(prompt)

    # Save conversation to history
    try:
        from app.db.mongo import save_conversation
        save_conversation(req.session_id, req.query, req.query, answer)
    except Exception as e:
        print(f"Failed to save conversation: {e}")

    return {
        'answer': answer,
        'sources': sources,
        'session_id': req.session_id
    }

@router.get("/history/{session_id}")
def get_history(session_id: str, user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    hist = list(db["conversation_history"].find({"session_id": session_id}).sort("timestamp", 1))
    
    messages = []
    for item in hist:
        messages.append({"role": "user", "content": item.get("original_query", "")})
        messages.append({"role": "assistant", "content": item.get("response", "")})
        
    return messages
