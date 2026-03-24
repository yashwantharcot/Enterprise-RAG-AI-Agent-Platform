from fastapi import HTTPException
from app.db.mongo import db
from app.utils.security import hash_password, verify_password
from app.services.token_service import create_access_token, create_refresh_token
from bson.objectid import ObjectId

def register_user(name: str, email: str, password: str):
    users_col = db["users"]
    existing = users_col.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "name": name,
        "email": email,
        "password": hash_password(password),
        "is_verified": False
    }
    result = users_col.insert_one(new_user)
    # Map _id to string id for output consistency
    new_user["id"] = str(result.inserted_id)
    return new_user

def login_user(email: str, password: str):
    users_col = db["users"]
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token({"sub": str(user["_id"])})
    refresh = create_refresh_token({"sub": str(user["_id"])})

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer"
    }
