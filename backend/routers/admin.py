import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List

from database import get_db
from models import Match, Bet, User, MatchStatus, MatchStage, BetPrediction, BetStatus
from schemas.match import MatchResponse, MatchResultInput
from auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.put("/matches/{match_id}/result", response_model=MatchResponse)
def set_match_result(
    match_id: int,
    result: MatchResultInput,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    if match.status == MatchStatus.FINISHED:
        raise HTTPException(status_code=400, detail="이미 결과가 입력된 경기입니다")

    match.home_score = result.home_score
    match.away_score = result.away_score
    match.status = MatchStatus.FINISHED

    _settle_bets(db, match)
    db.commit()
    db.refresh(match)
    return match


def _settle_bets(db: Session, match: Match):
    """파리무추엘 배당 정산"""
    from sqlalchemy.orm import joinedload

    if match.home_score > match.away_score:
        winning_side = BetPrediction.HOME
    elif match.home_score < match.away_score:
        winning_side = BetPrediction.AWAY
    else:
        winning_side = BetPrediction.DRAW

    # joinedload로 N+1 쿼리 방지
    bets = (
        db.query(Bet)
        .options(joinedload(Bet.user))
        .filter(Bet.match_id == match.id, Bet.status == BetStatus.PENDING)
        .all()
    )

    if not bets:
        return

    total_pool   = sum(b.amount for b in bets)
    winning_pool = sum(b.amount for b in bets if b.prediction == winning_side)
    net_pool     = total_pool * 0.95  # 수수료 5%

    # 아무도 정답 안 맞춘 경우 → 전액 환불 (수수료 없음)
    if winning_pool == 0:
        for bet in bets:
            bet.payout = bet.amount
            bet.status = BetStatus.REFUNDED
            bet.user.points += bet.amount
        return

    winning_bets = [b for b in bets if b.prediction == winning_side]
    losing_bets  = [b for b in bets if b.prediction != winning_side]

    total_distributed = 0
    for i, bet in enumerate(winning_bets):
        if i < len(winning_bets) - 1:
            payout = int((bet.amount / winning_pool) * net_pool)
        else:
            # 마지막 승자에게 잔여 포인트 전부 배분 (int 내림으로 인한 소각 방지)
            payout = int(net_pool) - total_distributed
        bet.payout = payout
        bet.status = BetStatus.WON
        bet.user.points += payout
        total_distributed += payout

    for bet in losing_bets:
        bet.payout = 0
        bet.status = BetStatus.LOST


@router.delete("/matches/{match_id}/result", response_model=MatchResponse)
def reset_match_result(
    match_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    if match.status != MatchStatus.FINISHED:
        raise HTTPException(status_code=400, detail="종료된 경기만 초기화할 수 있습니다")

    from sqlalchemy.orm import joinedload
    bets = (
        db.query(Bet)
        .options(joinedload(Bet.user))
        .filter(Bet.match_id == match_id)
        .filter(Bet.status.in_([BetStatus.WON, BetStatus.LOST, BetStatus.PENDING]))
        .all()
    )
    for bet in bets:
        if bet.status == BetStatus.WON and bet.payout is not None:
            bet.user.points -= bet.payout
        bet.payout = None
        bet.status = BetStatus.PENDING

    match.home_score = None
    match.away_score = None
    match.status = MatchStatus.UPCOMING

    db.commit()
    db.refresh(match)
    return match


@router.put("/matches/{match_id}/status")
def update_match_status(
    match_id: int,
    new_status: MatchStatus,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    match.status = new_status
    db.commit()
    return {"message": f"경기 상태가 {new_status}로 변경되었습니다"}


@router.delete("/matches/{match_id}/bets")
def reset_match_bets(
    match_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")
    if match.status == MatchStatus.FINISHED:
        raise HTTPException(status_code=400, detail="종료된 경기는 결과 초기화를 먼저 하세요")

    from sqlalchemy.orm import joinedload
    bets = (
        db.query(Bet)
        .options(joinedload(Bet.user))
        .filter(Bet.match_id == match_id, Bet.status == BetStatus.PENDING)
        .all()
    )
    if not bets:
        raise HTTPException(status_code=400, detail="초기화할 베팅이 없습니다")

    refund_count = 0
    for bet in bets:
        bet.user.points += bet.amount
        bet.status = BetStatus.REFUNDED
        refund_count += 1

    db.commit()
    return {"message": f"{refund_count}건 베팅이 환불 처리되었습니다"}


@router.post("/matches/finish-by-date")
def finish_matches_by_date(
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """특정 날짜(KST YYYY-MM-DD)의 미종료 경기 전체에 임의 점수 부여 후 베팅 정산"""
    date_str = body.get("date")  # "2026-06-12"
    if not date_str:
        raise HTTPException(status_code=400, detail="date 필드가 필요합니다")

    try:
        kst_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)")

    # KST(UTC+9) 기준 날짜를 UTC로 변환하여 timezone-aware 범위 사용
    KST_OFFSET = timedelta(hours=9)
    utc_start = (kst_date - KST_OFFSET).replace(tzinfo=timezone.utc)
    utc_end   = utc_start + timedelta(days=1)

    matches = (
        db.query(Match)
        .filter(
            Match.match_date >= utc_start,
            Match.match_date <  utc_end,
            Match.status != MatchStatus.FINISHED,
        )
        .all()
    )

    if not matches:
        raise HTTPException(status_code=400, detail="해당 날짜에 종료할 경기가 없습니다")

    # 축구 현실적 점수 분포 (0~3골 위주)
    SCORE_WEIGHTS = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3]

    results = []
    for match in matches:
        home_score = random.choice(SCORE_WEIGHTS)
        away_score = random.choice(SCORE_WEIGHTS)

        match.home_score = home_score
        match.away_score = away_score
        match.status     = MatchStatus.FINISHED

        _settle_bets(db, match)

        results.append({
            "match_id":   match.id,
            "home_team":  match.home_team,
            "away_team":  match.away_team,
            "home_score": home_score,
            "away_score": away_score,
        })

    db.commit()
    return {
        "message": f"{len(results)}경기 종료 및 정산 완료",
        "results": results,
    }


@router.post("/bets/simulate")
def simulate_bets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """모든 비관리자 회원이 예선전 경기에 임의 베팅 시뮬레이션"""
    # 베팅 가능한 예선전 경기 (종료되지 않은 경기)
    group_matches = (
        db.query(Match)
        .filter(Match.stage == MatchStage.GROUP, Match.status != MatchStatus.FINISHED)
        .all()
    )
    if not group_matches:
        raise HTTPException(status_code=400, detail="베팅 가능한 예선전 경기가 없습니다")

    match_ids = [m.id for m in group_matches]

    # 비관리자 회원 전체
    users = db.query(User).filter(User.is_admin == False).all()
    if not users:
        raise HTTPException(status_code=400, detail="회원이 없습니다")

    # 유저별 이미 베팅한 경기 ID 조회 (중복 방지)
    existing_bets = (
        db.query(Bet.user_id, Bet.match_id)
        .filter(Bet.match_id.in_(match_ids))
        .all()
    )
    already_bet: dict[int, set[int]] = {}
    for user_id, match_id in existing_bets:
        already_bet.setdefault(user_id, set()).add(match_id)

    predictions = [BetPrediction.HOME, BetPrediction.DRAW, BetPrediction.AWAY]
    AMOUNT_CHOICES = list(range(1000, 21000, 1000))  # 1000~20000 (1000단위)

    new_bets = []
    skipped_users = 0

    for user in users:
        available = [m for m in match_ids if m not in already_bet.get(user.id, set())]
        if not available:
            skipped_users += 1
            continue

        n = random.randint(1, min(5, len(available)))
        chosen = random.sample(available, n)

        deducted = 0
        for match_id in chosen:
            amount = random.choice(AMOUNT_CHOICES)
            remaining = user.points - deducted
            if remaining < 1000:
                break
            if amount > remaining:
                amount = (remaining // 1000) * 1000
            if amount < 1000:
                break

            new_bets.append(Bet(
                user_id=user.id,
                match_id=match_id,
                prediction=random.choice(predictions),
                amount=amount,
                status=BetStatus.PENDING,
            ))
            deducted += amount

        user.points -= deducted

    db.bulk_save_objects(new_bets)
    db.commit()

    return {
        "message": f"시뮬레이션 완료: {len(new_bets)}건 베팅 생성 ({skipped_users}명 스킵)",
        "bet_count": len(new_bets),
        "user_count": len(users) - skipped_users,
        "skipped_users": skipped_users,
    }


@router.delete("/bets/all")
def reset_all_bets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """모든 베팅 삭제 + 비관리자 회원 포인트 10만으로 초기화"""
    bet_count = db.query(Bet).count()
    db.query(Bet).delete(synchronize_session=False)

    user_count = (
        db.query(User)
        .filter(User.is_admin == False)
        .update({"points": 100000}, synchronize_session=False)
    )

    # 모든 경기 결과·상태도 초기화
    db.query(Match).update(
        {"home_score": None, "away_score": None, "status": MatchStatus.UPCOMING},
        synchronize_session=False,
    )

    db.commit()
    return {
        "message": f"베팅 {bet_count}건 삭제, 회원 {user_count}명 포인트 초기화 완료",
        "bet_count": bet_count,
        "user_count": user_count,
    }


@router.get("/bets/pending-counts")
def get_pending_bet_counts(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    rows = (
        db.query(Bet.match_id, func.count(Bet.id).label("cnt"))
        .filter(Bet.status == BetStatus.PENDING)
        .group_by(Bet.match_id)
        .all()
    )
    return {row.match_id: row.cnt for row in rows}


@router.get("/matches/{match_id}/bets")
def get_match_bets(
    match_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="경기를 찾을 수 없습니다")

    bets = (
        db.query(Bet, User.nickname)
        .join(User, Bet.user_id == User.id)
        .filter(Bet.match_id == match_id)
        .order_by(Bet.amount.desc())
        .all()
    )

    agg = db.query(
        Bet.prediction,
        func.count(Bet.id).label("cnt"),
        func.sum(Bet.amount).label("total"),
    ).filter(
        Bet.match_id == match_id,
        Bet.status != BetStatus.REFUNDED,
    ).group_by(Bet.prediction).all()

    pool = {r.prediction.value: {"count": r.cnt, "total": r.total or 0} for r in agg}
    total_pool = sum(v["total"] for v in pool.values())

    return {
        "match": {
            "id": match.id,
            "home_team": match.home_team, "away_team": match.away_team,
            "home_flag": match.home_flag, "away_flag": match.away_flag,
            "status": match.status, "home_score": match.home_score, "away_score": match.away_score,
        },
        "summary": {
            "total_pool": total_pool,
            "bet_count": sum(v["count"] for v in pool.values()),
            "home":  pool.get("home",  {"count": 0, "total": 0}),
            "draw":  pool.get("draw",  {"count": 0, "total": 0}),
            "away":  pool.get("away",  {"count": 0, "total": 0}),
        },
        "bets": [
            {
                "nickname":   nick,
                "prediction": bet.prediction.value,
                "amount":     bet.amount,
                "status":     bet.status.value,
                "payout":     bet.payout,
            }
            for bet, nick in bets
        ],
    }


@router.get("/users/{user_id}/bets")
def get_user_bets(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다")

    bets = (
        db.query(Bet, Match)
        .join(Match, Bet.match_id == Match.id)
        .filter(Bet.user_id == user_id)
        .order_by(Match.match_date)
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
        "user": {
            "id": user.id, "nickname": user.nickname,
            "email": user.email, "points": user.points,
        },
        "summary": {
            "total_bet": total_bet, "total_payout": total_payout,
            "net_profit": net_profit,
            "won":     sum(1 for b, _ in bets if b.status == BetStatus.WON),
            "lost":    sum(1 for b, _ in bets if b.status == BetStatus.LOST),
            "pending": sum(1 for b, _ in bets if b.status == BetStatus.PENDING),
        },
        "bets": [
            {
                "match_id":   m.id,
                "group_name": m.group_name,
                "home_team":  m.home_team, "away_team":  m.away_team,
                "home_flag":  m.home_flag, "away_flag":  m.away_flag,
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


@router.get("/users/bet-summary")
def get_user_bet_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    rows = (
        db.query(
            User.id,
            User.nickname,
            User.email,
            User.points,
            func.count(Bet.id).label("bet_count"),
            func.coalesce(func.sum(Bet.amount), 0).label("total_bet"),
            func.coalesce(func.sum(
                case((Bet.status == BetStatus.WON, Bet.payout), else_=0)
            ), 0).label("total_payout"),
            func.coalesce(func.sum(
                case(
                    (Bet.status == BetStatus.WON,  Bet.payout - Bet.amount),
                    (Bet.status == BetStatus.LOST, -Bet.amount),
                    else_=0,
                )
            ), 0).label("net_profit"),
            func.coalesce(func.sum(case((Bet.status == BetStatus.WON,     1), else_=0)), 0).label("won"),
            func.coalesce(func.sum(case((Bet.status == BetStatus.LOST,    1), else_=0)), 0).label("lost"),
            func.coalesce(func.sum(case((Bet.status == BetStatus.PENDING, 1), else_=0)), 0).label("pending"),
        )
        .outerjoin(Bet, Bet.user_id == User.id)
        .filter(User.is_admin == False)
        .group_by(User.id)
        .order_by(func.coalesce(func.sum(
            case(
                (Bet.status == BetStatus.WON,  Bet.payout - Bet.amount),
                (Bet.status == BetStatus.LOST, -Bet.amount),
                else_=0,
            )
        ), 0).desc())
        .all()
    )
    return [
        {
            "id": r.id, "nickname": r.nickname, "email": r.email,
            "points": r.points, "bet_count": r.bet_count,
            "total_bet": r.total_bet, "total_payout": r.total_payout,
            "net_profit": r.net_profit,
            "won": r.won, "lost": r.lost, "pending": r.pending,
        }
        for r in rows
    ]


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    total_users = db.query(func.count(User.id)).scalar()
    total_bets = db.query(func.count(Bet.id)).scalar()
    total_bet_amount = db.query(func.sum(Bet.amount)).scalar() or 0
    return {
        "total_users": total_users,
        "total_bets": total_bets,
        "total_bet_amount": total_bet_amount,
    }


@router.get("/stats/points")
def get_point_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    INITIAL_POINTS = 100000

    # 비관리자 회원 수
    member_count = db.query(func.count(User.id)).filter(User.is_admin == False).scalar() or 0

    # 현재 보유 포인트 집계
    point_agg = db.query(
        func.sum(User.points).label("total"),
        func.max(User.points).label("max"),
        func.min(User.points).label("min"),
        func.avg(User.points).label("avg"),
    ).filter(User.is_admin == False).one()

    current_total = int(point_agg.total or 0)
    max_points    = int(point_agg.max or 0)
    min_points    = int(point_agg.min or 0)
    avg_points    = int(point_agg.avg or 0)

    # 베팅 상태별 집계
    bet_agg = db.query(
        Bet.status,
        func.count(Bet.id).label("cnt"),
        func.coalesce(func.sum(Bet.amount), 0).label("amount_sum"),
        func.coalesce(func.sum(Bet.payout),  0).label("payout_sum"),
    ).group_by(Bet.status).all()

    pending_amount  = 0
    won_amount      = 0
    won_payout      = 0
    lost_amount     = 0
    refunded_amount = 0
    pending_count   = 0
    won_count       = 0
    lost_count      = 0

    for row in bet_agg:
        s = row.status.value if hasattr(row.status, 'value') else row.status
        if s == "pending":
            pending_amount = int(row.amount_sum)
            pending_count  = row.cnt
        elif s == "won":
            won_amount  = int(row.amount_sum)
            won_payout  = int(row.payout_sum)
            won_count   = row.cnt
        elif s == "lost":
            lost_amount = int(row.amount_sum)
            lost_count  = row.cnt
        elif s == "refunded":
            refunded_amount = int(row.amount_sum)

    initial_total   = member_count * INITIAL_POINTS
    total_bet       = pending_amount + won_amount + lost_amount  # 환불 제외
    settled_pool    = won_amount + lost_amount                   # 정산 완료 풀
    fee_collected   = int(settled_pool * 0.05)                   # 수수료 5%
    net_payout      = won_payout                                 # 승자에게 지급된 포인트
    # 포인트 유출 = 초기 - 현재 (베팅 대기 포함)
    point_diff      = initial_total - current_total

    return {
        "member_count":    member_count,
        "initial_total":   initial_total,
        "current_total":   current_total,
        "point_diff":      point_diff,          # 초기 대비 증감 (보통 수수료만큼 감소)
        "pending_amount":  pending_amount,       # 현재 대기 중인 베팅 포인트
        "pending_count":   pending_count,
        "total_bet":       total_bet,            # 누적 총 베팅액 (환불 제외)
        "won_amount":      won_amount,
        "won_payout":      won_payout,
        "won_count":       won_count,
        "lost_amount":     lost_amount,
        "lost_count":      lost_count,
        "refunded_amount": refunded_amount,
        "fee_collected":   fee_collected,        # 수수료로 소각된 포인트
        "max_points":      max_points,
        "min_points":      min_points,
        "avg_points":      avg_points,
    }
