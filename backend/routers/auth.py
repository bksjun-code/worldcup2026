from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os

from database import get_db
from models import User
from schemas.user import UserRegister, UserLogin, UserResponse, Token
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

INITIAL_POINTS = int(os.getenv("INITIAL_POINTS", 100000))
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@worldcup2026.com")


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")
    if db.query(User).filter(User.nickname == data.nickname).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다")

    user = User(
        email=data.email,
        nickname=data.nickname,
        hashed_password=hash_password(data.password),
        points=INITIAL_POINTS,
        is_admin=(data.email == ADMIN_EMAIL),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
