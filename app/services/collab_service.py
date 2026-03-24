from app.db.mongo import db
from datetime import datetime
from typing import List, Dict, Any

def invite_user(workspace_id: str, user_id: str, role: str, invited_by: str):
    """Adds a user to workspace_members with granular role."""
    members_col = db["workspace_members"]
    members_col.update_one(
        {"workspace_id": workspace_id, "user_id": user_id},
        {"$set": {
            "role": role,
            "invited_by": invited_by,
            "joined_at": datetime.utcnow()
        }},
        upsert=True
    )

def get_workspace_members(workspace_id: str) -> List[Dict[str, Any]]:
    members_col = db["workspace_members"]
    return list(members_col.find({"workspace_id": workspace_id}, {"_id": 0}))

def add_comment(workspace_id: str, user_id: str, text: str, highlight_id: str = None):
    comments_col = db["workspace_comments"]
    comments_col.insert_one({
        "workspace_id": workspace_id,
        "user_id": user_id,
        "text": text,
        "highlight_id": highlight_id,
        "timestamp": datetime.utcnow()
    })

def get_comments(workspace_id: str) -> List[Dict[str, Any]]:
    comments_col = db["workspace_comments"]
    return list(comments_col.find({"workspace_id": workspace_id}, {"_id": 0}).sort("timestamp", 1))

def has_permission(workspace_id: str, user_id: str, required_role: str = "viewer") -> bool:
    """Verifies if user has sufficient access tier on workspace."""
    # 1. Check Workspace Creator (Super Admin)
    sessions_col = db["pdf_sessions"]
    session = sessions_col.find_one({"_id": workspace_id}, {"owner_id": 1})
    if session and session.get("owner_id") == user_id:
        return True
        
    # 2. Check granular role permissions
    members_col = db["workspace_members"]
    member = members_col.find_one({"workspace_id": workspace_id, "user_id": user_id})
    if not member:
        return False

    user_role = member.get("role", "viewer")
    role_hierarchy = {"viewer": 1, "editor": 2, "admin": 3}
    return role_hierarchy.get(user_role, 1) >= role_hierarchy.get(required_role, 1)
