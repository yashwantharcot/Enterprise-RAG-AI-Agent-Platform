from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.utils.dependencies import get_current_user
from app.services.collab_service import invite_user, get_workspace_members, add_comment, get_comments, has_permission

router = APIRouter()

class InviteRequest(BaseModel):
    user_id: str
    role: str = "viewer" # viewer, editor, admin

class CommentRequest(BaseModel):
    text: str
    highlight_id: Optional[str] = None

@router.post("/{workspace_id}/invite")
def invite_to_workspace(workspace_id: str, req: InviteRequest, current_user: str = Depends(get_current_user)):
    # Verify Admin rights
    if not has_permission(workspace_id, current_user, required_role="admin"):
         raise HTTPException(status_code=403, detail="Only Admins or Owners can invite users")
         
    invite_user(workspace_id, req.user_id, req.role, invited_by=current_user)
    return {"message": f"User {req.user_id} invited to workspace as {req.role}"}

@router.get("/{workspace_id}/members")
def list_workspace_members(workspace_id: str, current_user: str = Depends(get_current_user)):
    if not has_permission(workspace_id, current_user, required_role="viewer"):
         raise HTTPException(status_code=403, detail="Access denied to this workspace")
         
    return get_workspace_members(workspace_id)

@router.post("/{workspace_id}/comments")
def leave_comment(workspace_id: str, req: CommentRequest, current_user: str = Depends(get_current_user)):
    if not has_permission(workspace_id, current_user, required_role="viewer"):
         raise HTTPException(status_code=403, detail="Access denied")
         
    add_comment(workspace_id, current_user, req.text, req.highlight_id)
    return {"message": "Comment posted"}

@router.get("/{workspace_id}/comments")
def list_comments(workspace_id: str, current_user: str = Depends(get_current_user)):
    if not has_permission(workspace_id, current_user, required_role="viewer"):
         raise HTTPException(status_code=403, detail="Access denied")
         
    return get_comments(workspace_id)

@router.get("/{workspace_id}/summary")
def get_summary(workspace_id: str, filename: Optional[str] = None, current_user: str = Depends(get_current_user)):
    """Fetches Executive Brief Summary for documents flawlessly."""
    if not has_permission(workspace_id, current_user, required_role="viewer"):
         raise HTTPException(status_code=403, detail="Access denied")
         
    from app.db.mongo import db
    query = {"session_id": workspace_id}
    if filename:
        query["filename"] = filename
    
    summaries = list(db["document_summaries"].find(query, {"_id": 0}))
    return {
        "workspace_id": workspace_id,
        "summaries": summaries
    }

@router.get("/{workspace_id}/diff")
def get_diff(workspace_id: str, filename: str, v1: int, v2: int, current_user: str = Depends(get_current_user)):
    """Generates Layout differences across document versions flawlessly."""
    if not has_permission(workspace_id, current_user, required_role="viewer"):
         raise HTTPException(status_code=403, detail="Access denied")
         
    from app.db.mongo import db
    
    def get_text_for_version(ver: int):
        cursor = db["documents_embedded"].find({"session_id": workspace_id, "filename": filename, "version": ver}).sort("timestamp", 1)
        return " ".join([doc["chunk"] for doc in cursor])

    text1 = get_text_for_version(v1)
    text2 = get_text_for_version(v2)

    if not text1 or not text2:
         raise HTTPException(status_code=404, detail=f"Versions {v1} and/or {v2} not found for {filename}")

    import difflib
    diff = difflib.unified_diff(
        text1.splitlines(),
        text2.splitlines(),
        fromfile=f"{filename} v{v1}",
        tofile=f"{filename} v{v2}",
        lineterm=""
    )
    
    return {
        "filename": filename,
        "v1": v1,
        "v2": v2,
        "diff": "\n".join(list(diff))
    }
