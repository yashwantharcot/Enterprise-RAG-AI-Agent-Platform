from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.utils.dependencies import get_current_user
from app.services.analytics_service import save_feedback, get_user_analytics

router = APIRouter()

class FeedbackRequest(BaseModel):
    session_id: str
    rating: int # 1 for Up, -1 for Down

@router.get("/usage")
def get_usage_metrics(current_user: str = Depends(get_current_user)):
    """Fetches combined analytics totals for the current user flawless."""
    return get_user_analytics(current_user)

@router.post("/feedback")
def submit_feedback(req: FeedbackRequest, current_user: str = Depends(get_current_user)):
    """Submits Thumbs rating for query quality auditing flawless."""
    if req.rating not in [1, -1]:
         raise HTTPException(status_code=400, detail="Rating must be 1 (Up) or -1 (Down)")
         
    save_feedback(req.session_id, current_user, req.rating)
    return {"message": "Feedback submitted successfully"}
