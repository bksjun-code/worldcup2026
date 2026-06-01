"""
테스트 베팅 시드 스크립트
- 예선전(GROUP) 경기 전체에 대해
- 1000명 유저 각각이 임의의 경기 1~5개에 임의의 금액으로 베팅
"""
import random
import sys
from database import SessionLocal, engine, Base
from models import User, Match, Bet, MatchStage, MatchStatus, BetPrediction, BetStatus

random.seed(42)

# 유저당 베팅할 경기 수 범위
MIN_BETS_PER_USER = 1
MAX_BETS_PER_USER = 5

# 베팅 금액 범위 (1000 단위)
MIN_AMOUNT = 1000
MAX_AMOUNT = 20000
AMOUNT_STEP = 1000


def seed_bets():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 예선전 경기만 조회
        group_matches = (
            db.query(Match)
            .filter(Match.stage == MatchStage.GROUP)
            .all()
        )
        if not group_matches:
            print("예선전 경기가 없습니다. 먼저 seed_data.py를 실행하세요.")
            return

        match_ids = [m.id for m in group_matches]
        print(f"예선전 경기 수: {len(match_ids)}개")

        # 테스트 유저 조회
        users = (
            db.query(User)
            .filter(User.email.like("user%@gmail.com"))
            .order_by(User.id)
            .all()
        )
        if not users:
            print("테스트 유저가 없습니다. 먼저 seed_users.py를 실행하세요.")
            return

        print(f"테스트 유저 수: {len(users)}명")

        # 기존 베팅 확인
        existing = (
            db.query(Bet)
            .join(User)
            .filter(User.email.like("user%@gmail.com"))
            .count()
        )
        if existing > 0:
            print(f"이미 테스트 베팅 {existing}건 존재. 스킵합니다.")
            return

        predictions = [BetPrediction.HOME, BetPrediction.DRAW, BetPrediction.AWAY]

        bets = []
        total_deducted = {}  # user_id -> 총 차감 포인트

        for user in users:
            # 이 유저가 베팅할 경기 수 (1~5)
            n_bets = random.randint(MIN_BETS_PER_USER, MAX_BETS_PER_USER)
            # 중복 없이 경기 선택
            chosen_matches = random.sample(match_ids, min(n_bets, len(match_ids)))

            deducted = 0
            for match_id in chosen_matches:
                amount = random.randrange(MIN_AMOUNT, MAX_AMOUNT + AMOUNT_STEP, AMOUNT_STEP)
                prediction = random.choice(predictions)

                # 잔액 초과 방지
                remaining = user.points - deducted
                if remaining < MIN_AMOUNT:
                    break
                if amount > remaining:
                    amount = (remaining // MIN_AMOUNT) * MIN_AMOUNT
                if amount < MIN_AMOUNT:
                    break

                bets.append(Bet(
                    user_id=user.id,
                    match_id=match_id,
                    prediction=prediction,
                    amount=amount,
                    status=BetStatus.PENDING,
                ))
                deducted += amount

            total_deducted[user.id] = deducted

        # 베팅 일괄 삽입
        print(f"베팅 데이터 {len(bets)}건 삽입 중...")
        db.bulk_save_objects(bets)

        # 유저 포인트 차감
        print("유저 포인트 차감 중...")
        for user in users:
            deducted = total_deducted.get(user.id, 0)
            if deducted > 0:
                user.points -= deducted

        db.commit()

        avg_bets = len(bets) / len(users)
        print(f"\n완료!")
        print(f"  총 베팅 건수  : {len(bets):,}건")
        print(f"  유저당 평균   : {avg_bets:.1f}건")
        print(f"  베팅 금액 범위: {MIN_AMOUNT:,} ~ {MAX_AMOUNT:,} 포인트")

    except Exception as e:
        db.rollback()
        print(f"오류 발생: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_bets()
