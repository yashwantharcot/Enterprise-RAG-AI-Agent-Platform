import os
from google import genai
from app.db.mongo import db
from datetime import datetime

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None

def generate_document_summary(session_id: str, filename: str, text: str):
    """Generates and stores a 1-page executive summary for an uploaded document flawlessly."""
    if not client:
        print("[Summary] Gemini Client not initialized.")
        return

    # Truncate text for prompt speed
    sample_text = text[:30000] 
    prompt = f"""
    You are an expert executive analyst. 
    Analyze the following document text and generate a 1-page Executive Summary.
    Structure it with:
    1. **Overview**: Background or purpose of the document flawlessly.
    2. **Key Findings**: Bulleted list of critical terms, numeric values, or dates.
    3. **Takeaways**: Next steps or conclusions.

    Document Title: {filename}
    Text content:
    {sample_text}
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        if response.text:
             db["document_summaries"].update_one(
                 {"session_id": session_id, "filename": filename},
                 {"$set": {
                     "summary": response.text.strip(),
                     "created_at": datetime.utcnow()
                 }},
                 upsert=True
             )
             print(f"[Summary] Generated and saved for {filename} securely.")
    except Exception as e:
        print(f"[Summary] Failed: {e}")
