from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone, timedelta

from database import get_db
from models import Bet, Match, User, BetPrediction, BetStatus, MatchStatus
from schemas.bet import BetCreate, BetUpdate, BetResponse, OddsResponse
from auth import get_current_user

router = APIRouter(prefix="/api/bets", tags=["bets"])

HOUSE_COMMISSION = 0.05  # 수수료 5%


def calculate_odds(db: Session, match_id: int) -> OddsResponse:
    """파리무추엘 배당률 계산"""
    totals = (
        db.query(Bet.prediction, func.sum(Bet.amount).label("total"))
        .filter(Bet.match_id == match_id, Bet.status != BetStatus.REFUNDED)
        .group_by(Bet.prediction)
        .all()
    )

    pool = {BetPrediction.HOME: 0, BetPrediction.DRAW: 0, BetPrediction.AWAY: 0}
    for prediction, total in totals:
        pool[prediction] = total or 0

    total_pool = sum(pool.values())
    net_pool = total_pool * (1 - HOUSE_COMMISSION)

    def odds(side_total: int) -> float:
        if side_total == 0 or total_pool == 0:
            return 0.0
        return round(net_pool / side_total, 2)

    return OddsResponse(
        match_id=match_id,
        home_odds=odds(pool[BetPrediction.HOME]),
        draw_odds=odds(pool[BetPrediction.DRAW]),
        away_odds=odds(pool[BetPrediction.AWAY]),
        total_home=pool[BetPrediction.HOME],
        total_draw=pool[BetPrediction.DRAW],
        total_away=pool[BetPrediction.AWAY],
        total_pool=total_pool,
    )


@router.get("/odds/{match_id}", response_model=OddsResponse)
def get_odds(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    return calculate_odds(db, match_id)


@router.post("", response_model=BetResponse, status_code=status.HTTP_201_CREATED)
def place_bet(data: BetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    match = db.query(Match).filter(Match.id == data.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    if match.status != MatchStatus.UPCOMING:
        raise HTTPException(status_code=400, detail="이미 시작되었거나 종료된 경기입니다")
    match_dt = match.match_date if match.match_date.tzinfo else match.match_date.replace(tzinfo=timezone.utc)
    if match_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="경기 시작 시간이 지나 베팅할 수 없습니다")

    existing = db.query(Bet).filter(Bet.user_id == current_user.id, Bet.match_id == data.match_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 베팅한 경기입니다")

    if data.amount < 100:
        raise HTTPException(status_code=400, detail="최소 베팅 금액은 100P입니다")
    if data.amount > current_user.points:
        raise HTTPException(status_code=400, detail=f"포인트가 부족합니다 (보유: {current_user.points:,}P)")

    current_user.points -= data.amount
    bet = Bet(user_id=current_user.id, match_id=data.match_id, prediction=data.prediction, amount=data.amount)
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return bet


@router.put("/{bet_id}", response_model=BetResponse)
def update_bet(bet_id: int, data: BetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bet = db.query(Bet).filter(Bet.id == bet_id, Bet.user_id == current_user.id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="베팅을 찾을 수 없습니다")
    if bet.status != BetStatus.PENDING:
        raise HTTPException(status_code=400, detail="대기 중인 베팅만 수정할 수 있습니다")

    match = db.query(Match).filter(Match.id == bet.match_id).first()
    match_dt = match.match_date if match.match_date.tzinfo else match.match_date.replace(tzinfo=timezone.utc)
    if match_dt <= datetime.now(timezone.utc) + timedelta(hours=1):
        raise HTTPException(status_code=400, detail="경기 1시간 전부터는 베팅을 수정할 수 없습니다")

    diff = data.amount - bet.amount
    if diff > 0 and current_user.points < diff:
        raise HTTPException(status_code=400, detail=f"포인트가 부족합니다 (부족분: {diff:,}P)")

    current_user.points -= diff
    bet.prediction = data.prediction
    bet.amount = data.amount
    db.commit()
    db.refresh(bet)
    return bet


@router.get("/my", response_model=List[BetResponse])
def get_my_bets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Bet).filter(Bet.user_id == current_user.id).order_by(Bet.created_at.desc()).all()


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_admin == False).order_by(User.points.desc()).limit(20).all()
    return [{"rank": i + 1, "nickname": u.nickname, "points": u.points} for i, u in enumerate(users)]
