from fastapi import APIRouter, Depends
from app.schemas.user import UserCreate, UserLogin
from app.services.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(user: UserCreate):
    new_user = register_user(user.name, user.email, user.password)
    # Return string id
    return {"message": "User registered successfully", "user_id": new_user["id"]}

@router.post("/login")
def login(user: UserLogin):
    return login_user(user.email, user.password)
