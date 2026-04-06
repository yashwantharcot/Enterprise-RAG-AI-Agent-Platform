from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.api.pdf_qa import router as pdf_qa_router
from app.api.auth import router as auth_router

app = FastAPI(title="Retrieval Augmented Generation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://devqa.dealdox.io",
        "https://devqa-api.dealdox.io"
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.up\.railway\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
def read_root():
    return {"message": "Agent API is running"}

# Include Auth router
app.include_router(auth_router, prefix="/api")

# Include PDF QA router
app.include_router(pdf_qa_router, prefix="/api/pdf-qa")