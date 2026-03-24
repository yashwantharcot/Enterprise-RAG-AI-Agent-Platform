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
from app.services.scraper import scrape_url

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

class UrlRequest(BaseModel):
    url: str
    session_id: Optional[str] = None

@router.post('/upload_url', response_model=UploadResponse)
async def upload_url(req: UrlRequest, user_id: str = Depends(get_current_user)):
    sid = req.session_id or str(uuid4())
    
    try:
        text = scrape_url(req.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    chunks = chunk_text_simple(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No text extracted from URL")

    embeddings = []
    for chunk in chunks:
        try:
            emb = get_query_embedding(chunk)
            embeddings.append(emb)
        except Exception as e:
            print(f"[WARNING] Failed to embed chunk: {e}")
            continue

    if not embeddings:
         raise HTTPException(status_code=500, detail="Failed to generate embeddings for URL")

    if sid not in pdf_sessions:
        pdf_sessions[sid] = { 'chunks': [], 'embeddings': [] }
    
    pdf_sessions[sid]['chunks'].extend([{"text": c, "filename": req.url} for c in chunks[:len(embeddings)]])
    pdf_sessions[sid]['embeddings'].extend(embeddings)

    try:
        from app.db.mongo import db
        from datetime import datetime
        db_docs = []
        for c, e in zip(chunks[:len(embeddings)], embeddings):
            db_docs.append({
                "session_id": sid,
                "filename": req.url,
                "chunk": {"text": c},
                "embedding": e,
                "created_at": datetime.utcnow()
            })
        if db_docs:
            db["documents_embedded"].insert_many(db_docs)
    except Exception as e:
        print(f"[WARNING] Mongo backup failed: {e}")

    return UploadResponse(session_id=sid, chunks=len(embeddings))


@router.post('/upload_pdf', response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), session_id: Optional[str] = Form(None), user_id: str = Depends(get_current_user)):
    sid = session_id or str(uuid4())
    # Save uploaded file to app/uploads/{sid}
    upload_dir = f"app/uploads/{sid}"
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, file.filename)
    
    content = await file.read()
    with open(save_path, 'wb') as f:
        f.write(content)

    try:
        text = extract_pdf_text(save_path)
    except Exception as e:
        if os.path.exists(save_path):
            os.unlink(save_path)
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")

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
    
    pdf_sessions[sid]['chunks'].extend([{"text": c, "filename": file.filename} for c in chunks[:len(embeddings)]])
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
    model: Optional[str] = "gemini-1.5-flash"
    system_prompt: Optional[str] = None


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
            context_blocks.append(session['chunks'][idx]['text'])
            sources.append({
                'idx': idx, 
                'score': float(round(score, 4)),
                'text': session['chunks'][idx]['text'],
                'filename': session['chunks'][idx]['filename']
            })
        except Exception:
            pass

    prompt = "Use the following extracted document excerpts to answer the question.\n\nContext:\n"
    for i, cb in enumerate(context_blocks):
        prompt += f"Excerpt {i+1}: {cb}\n\n"
    prompt += f"Question: {req.query}\nAnswer concisely and cite which excerpt you used (e.g., Excerpt 1)."

    # Use existing cloud LLM engine instead of local flan-t5
    from fastapi.responses import StreamingResponse
    import json

    def generate_sse():
        full_answer = ""
        try:
            # Send sources in first frame to optimize bandwidth
            yield f"data: {json.dumps({'answer': '', 'sources': sources, 'session_id': req.session_id})}\n\n"
            
            for chunk in llm_engine.chat_stream(prompt, model_name=req.model, system_prompt=req.system_prompt):
                full_answer += chunk
                yield f"data: {json.dumps({'answer': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return
        
        # Save conversation after full stream loads cleanly
        try:
            from app.db.mongo import save_conversation, db
            from datetime import datetime
            save_conversation(req.session_id, req.query, req.query, full_answer)
            
            # Create session if not present for sidebar Renaming Tracking
            if not db["sessions"].find_one({"session_id": req.session_id}):
                db["sessions"].insert_one({
                    "session_id": req.session_id,
                    "name": req.query[:40] + "..." if len(req.query) > 40 else req.query,
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                })
        except Exception as e:
            print(f"Failed to save conversation: {e}")

    return StreamingResponse(generate_sse(), media_type="text/event-stream")

@router.get("/documents/{session_id}")
def get_documents(session_id: str, user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    try:
        distinct_files = db["documents_embedded"].aggregate([
            {"$match": {"session_id": session_id}},
            {"$group": {
                "_id": "$filename",
                "chunks": {"$sum": 1},
                "uploaded_at": {"$first": "$timestamp"}
            }}
        ])
        result = []
        for f in distinct_files:
            result.append({
                "filename": f["_id"] if f["_id"] else "Unknown",
                "chunks": f["chunks"],
                "uploaded_at": f.get("uploaded_at")
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {e}")

@router.delete("/documents/{session_id}/{filename}")
def delete_document(session_id: str, filename: str, user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    try:
        result = db["documents_embedded"].delete_many({
            "session_id": session_id,
            "filename": filename
        })
        # Invalidate memory cache so next query reloads from Mongo
        if session_id in pdf_sessions:
            del pdf_sessions[session_id]
        return {"message": f"Deleted {result.deleted_count} chunks for {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {e}")

@router.get("/history/{session_id}")
def get_history(session_id: str, user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    hist = list(db["conversation_history"].find({"session_id": session_id}).sort("timestamp", 1))
    
    messages = []
    for item in hist:
        messages.append({"role": "user", "content": item.get("original_query", "")})
        messages.append({"role": "assistant", "content": item.get("response", "")})
        
    return messages

@router.get("/recent_sessions")
def get_recent_sessions(user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    cursor = db["sessions"].find({"user_id": user_id}).sort("created_at", -1)
    result = []
    for doc in cursor:
        result.append({
            "session_id": doc["session_id"],
            "name": doc.get("name", "Untitled")
        })
    return result

@router.put("/sessions/{session_id}")
def rename_session(session_id: str, name: str, user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    db["sessions"].update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": {"name": name}}
    )
    return {"message": "Session renamed"}

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user_id: str = Depends(get_current_user)):
    from app.db.mongo import db
    db["sessions"].delete_one({"session_id": session_id, "user_id": user_id})
    db["conversation_history"].delete_many({"session_id": session_id})
    db["documents_embedded"].delete_many({"session_id": session_id})
    if session_id in pdf_sessions:
        del pdf_sessions[session_id]
    return {"message": "Session deleted fully"}

@router.get("/file/{session_id}/{filename}")
def get_pdf_file(session_id: str, filename: str, user_id: str = Depends(get_current_user)):
    file_path = f"app/uploads/{session_id}/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    from fastapi.responses import FileResponse
    return FileResponse(file_path, media_type='application/pdf')
