import os
import fitz  # PyMuPDF
from google import genai
from google.genai.types import Part

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None

def extract_multimodal_pdf(pdf_path: str) -> str:
    """Renders PDF pages to images and uses Gemini for structured layout extractions."""
    if not client:
        print("[Multimodal] Gemini Client not initialized. Falling back.")
        return ""

    if not os.path.exists(pdf_path):
        print(f"[Multimodal] PDF not found: {pdf_path}")
        return ""

    full_text = []
    try:
        doc = fitz.open(pdf_path)
        for i in range(len(doc)):
            page = doc[i]
            # Convert page to Pixmap (Image)
            pix = page.get_pixmap(dpi=150) # Balanced DPI for speed & layout quality
            img_bytes = pix.tobytes("png")

            # Create Part object
            image_part = Part.from_bytes(data=img_bytes, mime_type='image/png')

            prompt = """
            Analyze this document page image in detail.
            1. Extract all legible text smoothly maintaining reading order flow flawlessly.
            2. Any datasets, grids, or visual structures representing numeric values must be rendered as Markdown Tables only.
            3. Describe any charts, schematics, or graphics comprehensively detailing metrics.
            Ensure output is cohesive Markdown. Do not include page headings unless strictly visible.
            """

            try:
                # Use Gemini-2.0-Flash as benchmark fallback
                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=[image_part, prompt]
                )
                if response.text:
                    full_text.append(f"## Page {i+1}\n\n" + response.text.strip())
                    print(f"[Multimodal] Page {i+1} extracted successfully with Gemini.")
            except Exception as e:
                print(f"[Multimodal] Page {i+1} failed: {e}")
                full_text.append(f"## Page {i+1}\n\n[Vision Extraction Failed for this Page]")

        doc.close()
    except Exception as e:
         print(f"[Multimodal] PDF Processing failed: {e}")
         return ""

    return "\n\n---\n\n".join(full_text)
