from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
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
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
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
    return [{"rank": i + 1, "nickname": u.nickname, "national": u.national, "points": u.points} for i, u in enumerate(users)]


@router.get("/rankings")
def get_rankings(db: Session = Depends(get_db)):
    """포인트 순위 + 베팅 통계 (공개)"""
    rows = (
        db.query(
            User.id,
            User.nickname,
            User.national,
            User.points,
            func.count(Bet.id).label("bet_count"),
            func.coalesce(func.sum(case((Bet.status == BetStatus.WON,     1), else_=0)), 0).label("won"),
            func.coalesce(func.sum(case((Bet.status == BetStatus.LOST,    1), else_=0)), 0).label("lost"),
            func.coalesce(func.sum(case((Bet.status == BetStatus.PENDING, 1), else_=0)), 0).label("pending"),
            func.coalesce(func.sum(Bet.amount), 0).label("total_bet"),
            func.coalesce(func.sum(
                case(
                    (Bet.status == BetStatus.WON,  Bet.payout - Bet.amount),
                    (Bet.status == BetStatus.LOST, -Bet.amount),
                    else_=0,
                )
            ), 0).label("net_profit"),
        )
        .outerjoin(Bet, Bet.user_id == User.id)
        .filter(User.is_admin == False)
        .group_by(User.id, User.nickname, User.national, User.points)
        .order_by(User.points.desc())
        .all()
    )
    return [
        {
            "rank": i + 1, "id": r.id, "nickname": r.nickname, "national": r.national,
            "points": r.points, "bet_count": r.bet_count,
            "won": r.won, "lost": r.lost, "pending": r.pending,
            "total_bet": r.total_bet, "net_profit": r.net_profit,
        }
        for i, r in enumerate(rows)
    ]


@router.get("/rankings/{user_id}")
def get_ranking_user_detail(user_id: int, db: Session = Depends(get_db)):
    """특정 유저 베팅 내역 공개 조회"""
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    bets = (
        db.query(Bet, Match)
        .join(Match, Bet.match_id == Match.id)
        .filter(Bet.user_id == user_id)
        .order_by(Match.match_date.desc())
        .all()
    )

    total_bet    = sum(b.amount for b, _ in bets)
    total_payout = sum(b.payout or 0 for b, _ in bets if b.status == BetStatus.WON)
    net_profit   = sum(
        (b.payout - b.amount) if b.status == BetStatus.WON else
        (-b.amount)            if b.status == BetStatus.LOST else 0
        for b, _ in bets
    )

    return {
        "user": {"id": user.id, "nickname": user.nickname, "national": user.national, "points": user.points},
        "summary": {
            "total_bet": total_bet, "total_payout": total_payout, "net_profit": net_profit,
            "won":     sum(1 for b, _ in bets if b.status == BetStatus.WON),
            "lost":    sum(1 for b, _ in bets if b.status == BetStatus.LOST),
            "pending": sum(1 for b, _ in bets if b.status == BetStatus.PENDING),
        },
        "bets": [
            {
                "match_id":   m.id,
                "group_name": m.group_name,
                "home_team":  m.home_team, "away_team":   m.away_team,
                "home_flag":  m.home_flag, "away_flag":   m.away_flag,
                "match_date": m.match_date.isoformat(),
                "match_status": m.status.value,
                "home_score": m.home_score, "away_score": m.away_score,
                "prediction": b.prediction.value,
                "amount":     b.amount,
                "bet_status": b.status.value,
                "payout":     b.payout,
            }
            for b, m in bets
        ],
    }
