from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Match, MatchStatus
from schemas.match import MatchResponse

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("", response_model=List[MatchResponse])
def get_all_matches(db: Session = Depends(get_db)):
    return db.query(Match).order_by(Match.match_date).all()


@router.get("/korea", response_model=List[MatchResponse])
def get_korea_matches(db: Session = Depends(get_db)):
    return db.query(Match).filter(Match.is_korea_match == True).order_by(Match.match_date).all()


@router.get("/group/{group_name}", response_model=List[MatchResponse])
def get_group_matches(group_name: str, db: Session = Depends(get_db)):
    return db.query(Match).filter(Match.group_name == group_name.upper()).order_by(Match.match_date).all()


@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    return match
