import fitz  # PyMuPDF
from PIL import Image
import io

try:
    import pdfplumber
except ImportError:
    pdfplumber = None
try:
    import pytesseract
except Exception:
    pytesseract = None
try:
    from pdf2image import convert_from_path
except Exception:
    convert_from_path = None
import tempfile
import os
from typing import List


# --- PDF to text (hybrid: selectable text + OCR fallback) ---
def extract_pdf_text(pdf_path: str) -> str:
    text_content = ""
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"[ERROR] Failed to open PDF with PyMuPDF: {e}")
        return ""
        
    for i, page in enumerate(doc):
        try:
            # 1. Try regular selectable text extract 
            page_text = page.get_text()
            if page_text and len(page_text.strip()) > 50:
                text_content += page_text + "\n"
                continue
                
            # 2. Fallback to Gemini Multimodal OCR if selectable text is too thin
            print(f"[INFO] Page {i+1} is likely scanned (selectable text len={len(page_text.strip()) if page_text else 0}). Triggering Gemini OCR...")
            
            pix = page.get_pixmap()
            img_bytes = pix.tobytes("png")
            pil_img = Image.open(io.BytesIO(img_bytes))
            
            from app.core.llm import google_client
            if google_client:
                 resp = google_client.models.generate_content(
                     model="gemini-1.5-flash",
                     contents=["Extract all text from this page. If it has tables, maintain layout.", pil_img]
                 )
                 if resp.text:
                      text_content += resp.text + "\n"
            else:
                 print(f"[WARNING] google_client not initialized, skipping OCR for page {i+1}")
                 
        except Exception as e:
             print(f"[WARNING] OCR Fallback failed on page {i+1}: {e}")
             
    doc.close()
    return text_content


# --- Chunking for RAG ---
def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> List[str]:
    """Split text into character-based chunks with overlap.

    Args:
        text: full document text
        chunk_size: approx characters per chunk
        overlap: overlap in characters between chunks

    Returns:
        list of text chunks
    """
    if not text:
        return []
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == text_len:
            break
        start = end - overlap
    return chunks


if __name__ == "__main__":
    pdf_path = "TENDERDOCUMENT.pdf"  # Change to your PDF file
    if not os.path.exists(pdf_path):
        print("Place a PDF named TENDERDOCUMENT.pdf in this folder or change the path in the script.")
    else:
        text = extract_pdf_text(pdf_path)
        chunks = chunk_text(text)
        print(f"Extracted {len(chunks)} chunks")
