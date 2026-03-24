from app.db.mongo import db
from datetime import datetime
from typing import Dict, Any

def log_usage(user_id: str, session_id: str, model: str, prompt_tokens: int, response_tokens: int, latency_sec: float):
    """Logs LLM token usage and estimates cost streams flawlessly."""
    logs_col = db["usage_logs"]
    
    # Cost heuristic (per 1k tokens)
    # Gemini 1.5/2.0 Flash approx: Input $0.000075 / 1k, Output $0.0003 / 1k
    cost_estimate = (prompt_tokens * 0.000075 / 1000) + (response_tokens * 0.0003 / 1000)

    logs_col.insert_one({
        "user_id": user_id,
        "session_id": session_id,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "response_tokens": response_tokens,
        "latency_sec": latency_sec,
        "cost_estimate": round(cost_estimate, 6),
        "timestamp": datetime.utcnow()
    })

def save_feedback(session_id: str, user_id: str, rating: int):
    """Saves Thumb Up (1) or Thumb Down (-1) feedbacks securely."""
    feedback_col = db["query_feedback"]
    feedback_col.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "rating": rating,
        "timestamp": datetime.utcnow()
    })

def get_user_analytics(user_id: str) -> Dict[str, Any]:
    """Aggregates totals for user analytics dashboard flawlessly."""
    logs_col = db["usage_logs"]
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_requests": {"$sum": 1},
            "total_prompt_tokens": {"$sum": "$prompt_tokens"},
            "total_response_tokens": {"$sum": "$response_tokens"},
            "total_cost": {"$sum": "$cost_estimate"},
            "avg_latency": {"$avg": "$latency_sec"}
        }}
    ]
    result = list(logs_col.aggregate(pipeline))
    if not result:
         return {
             "total_requests": 0,
             "total_prompt_tokens": 0,
             "total_response_tokens": 0,
             "total_cost": 0.0,
             "avg_latency": 0.0
         }
         
    res = result[0]
    res.pop("_id", None)
    return res
