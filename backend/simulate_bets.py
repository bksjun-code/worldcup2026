"""
테스트 유저 1000명 랜덤 베팅 시뮬레이션
- 조별리그(UPCOMING) 경기 중 무작위 선택
- 유저당 100,000P 한도 내에서 베팅
"""
import sys, io, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from database import SessionLocal
from models import User, Match, Bet, MatchStatus, MatchStage, BetPrediction, BetStatus

random.seed(2026)

db = SessionLocal()

# 베팅 가능 경기 (조별리그 UPCOMING)
matches = db.query(Match).filter(
    Match.status == MatchStatus.UPCOMING,
    Match.stage  == MatchStage.GROUP,
).all()
match_ids = [m.id for m in matches]
print(f'베팅 가능 경기: {len(matches)}개')

# 테스트 유저 목록
users = db.query(User).filter(
    User.email.like('user%@gmail.com'),
    User.is_admin == False,
).all()
print(f'테스트 유저: {len(users)}명')

PREDICTIONS = [BetPrediction.HOME, BetPrediction.DRAW, BetPrediction.AWAY]

total_bets  = 0
total_pts   = 0
skipped_usr = 0

for idx, user in enumerate(users):
    budget = user.points  # 100,000P
    if budget <= 0:
        skipped_usr += 1
        continue

    # 유저당 3~8개 경기 무작위 선택 (중복 없음)
    n_bets   = random.randint(3, 8)
    selected = random.sample(match_ids, min(n_bets, len(match_ids)))

    remaining = budget
    user_bets = 0

    for mid in selected:
        if remaining < 1000:
            break

        # 잔여 포인트의 10~35% 랜덤 베팅 (1,000P 단위 반올림)
        max_amt = min(remaining, 30000)
        raw     = random.randint(1000, max(1000, max_amt))
        amount  = (raw // 1000) * 1000
        if amount < 1000 or amount > remaining:
            continue

        prediction = random.choice(PREDICTIONS)

        bet = Bet(
            user_id    = user.id,
            match_id   = mid,
            prediction = prediction,
            amount     = amount,
            status     = BetStatus.PENDING,
        )
        db.add(bet)
        user.points -= amount
        remaining   -= amount
        user_bets   += 1
        total_bets  += 1
        total_pts   += amount

    if (idx + 1) % 100 == 0:
        db.flush()
        print(f'  {idx+1}명 처리 완료...')

db.commit()
db.close()

print(f'\n베팅 시뮬레이션 완료')
print(f'  총 베팅 건수 : {total_bets:,}건')
print(f'  총 베팅 금액 : {total_pts:,}P')
print(f'  평균 베팅/유저: {total_bets/len(users):.1f}건')
print(f'  평균 금액/건  : {total_pts//total_bets if total_bets else 0:,}P')
