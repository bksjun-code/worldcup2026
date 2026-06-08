"""
2026 월드컵 베팅 시뮬레이터
- 1분마다 가상 회원 1명 가입
- 가입 즉시 예선전 경기에 전략적으로 베팅 (포인트 소진 시까지)
  · 자국팀 예선 3경기는 반드시 모두 베팅에 포함 (애국 베팅 규칙 우선 적용)
- 매 사이클마다 포인트가 남은 기존 가입자 일부도 임의로 골라 추가 베팅 시도
  (이미 베팅한 경기는 제외, 한도 내에서만 베팅)
- 예선전 마지막 경기 시작 전까지 반복
"""

import random
import time
import sys
from datetime import datetime, timezone
from database import SessionLocal
from models import User, Match, Bet, MatchStage, MatchStatus, BetPrediction, SimulatorSettings
from auth import hash_password

# 설정 비활성화 상태일 때 재확인 주기 (초)
SETTINGS_POLL_SEC = 5


def get_settings(db) -> SimulatorSettings:
    settings = db.query(SimulatorSettings).filter(SimulatorSettings.id == 1).first()
    if not settings:
        settings = SimulatorSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

# ── 이름 풀 ──────────────────────────────────────────────────────────────────

LAST_NAMES = [
    ("김", "kim"), ("이", "lee"), ("박", "park"), ("최", "choi"), ("정", "jung"),
    ("강", "kang"), ("조", "cho"), ("윤", "yoon"), ("장", "jang"), ("임", "lim"),
    ("한", "han"), ("오", "oh"), ("서", "seo"), ("신", "shin"), ("권", "kwon"),
    ("황", "hwang"), ("안", "an"), ("송", "song"), ("전", "jeon"), ("홍", "hong"),
]

MALE_FIRST = [
    ("민준", "minjun"), ("서준", "seojun"), ("도윤", "doyun"), ("시우", "siwoo"),
    ("주원", "juwon"), ("하준", "hajun"), ("지호", "jiho"), ("준서", "junseo"),
    ("현우", "hyunwoo"), ("도현", "dohyun"), ("지훈", "jihoon"), ("건우", "geonwoo"),
    ("우진", "woojin"), ("승민", "seungmin"), ("태양", "taeyang"), ("재원", "jaewon"),
    ("성민", "sungmin"), ("민혁", "minhyuk"), ("준혁", "junhyuk"), ("찬호", "chanho"),
    ("영준", "youngjun"), ("동현", "donghyun"), ("민수", "minsu"), ("기현", "gihyun"),
    ("상현", "sanghyun"), ("태민", "taemin"), ("규현", "kyuhyun"), ("진호", "jinho"),
    ("선우", "sunwoo"), ("재민", "jaemin"),
]

FEMALE_FIRST = [
    ("서연", "seoyeon"), ("서윤", "seoyoon"), ("지우", "jiwoo"), ("서현", "seohyun"),
    ("하은", "haeun"), ("하린", "harin"), ("지민", "jimin"), ("채원", "chaewon"),
    ("수아", "sua"), ("지아", "jia"), ("민서", "minseo"), ("예린", "yerin"),
    ("예은", "yeeun"), ("수빈", "subin"), ("지수", "jisu"), ("나연", "nayeon"),
    ("다현", "dahyun"), ("채영", "chaeyoung"), ("정연", "jeongyeon"), ("미나", "mina"),
    ("솔지", "solji"), ("혜린", "hyerin"), ("유나", "yuna"), ("아영", "ayoung"),
    ("은지", "eunji"), ("보미", "bomi"), ("남주", "namjoo"), ("초롱", "chorong"),
    ("보영", "boyoung"), ("하영", "hayoung"),
]

DOMAINS = ["naver.com", "hanmail.com", "gmail.com"]

PASSWORD = "123456"
INITIAL_POINTS = 100000
MIN_BET = 5000

# ── 팀 전력 데이터 (frontend/src/utils/rankings.js의 파워랭킹과 동일) ─────────
# 숫자가 낮을수록 강팀. 베팅 확률 추론의 근거로 사용한다.

POWER_RANKINGS = {
    "프랑스": 1, "스페인": 2, "잉글랜드": 3, "콜롬비아": 4, "아르헨티나": 5,
    "포르투갈": 6, "브라질": 7, "네덜란드": 8, "독일": 9, "크로아티아": 10,
    "벨기에": 11, "미국": 12, "멕시코": 13, "모로코": 14, "우루과이": 15,
    "스위스": 16, "노르웨이": 17, "에콰도르": 18, "일본": 19, "대한민국": 20,
    "터키": 21, "캐나다": 22, "세네갈": 23, "오스트리아": 24, "스웨덴": 25,
    "파라과이": 26, "스코틀랜드": 27, "가나": 28, "체코": 29, "이란": 30,
    "사우디아라비아": 31, "보스니아·헤르체고비나": 32, "알제리": 33, "이집트": 34,
    "코트디부아르": 35, "호주": 36, "요르단": 37, "튀니지": 38, "콩고민주공화국": 39,
    "우즈베키스탄": 40, "카타르": 41, "이라크": 42, "뉴질랜드": 43, "카보베르데": 44,
    "남아공": 45, "남아프리카공화국": 45, "파나마": 46, "퀴라소": 47, "아이티": 48,
}

DEFAULT_RANK = 49  # 랭킹 정보가 없는 팀(슬롯 미정 등)에 적용할 기본값

# 2026 월드컵 본선 진출 48개국의 국가 코드 → 팀명 (frontend/src/utils/flags.js TEAM_ISO 참고)
# Match.home_team / away_team 의 팀명과 매칭하기 위해 사용한다.
NATION_CODE_TEAM = {
    "gh": "가나", "za": "남아프리카공화국", "nl": "네덜란드", "no": "노르웨이", "nz": "뉴질랜드",
    "kr": "대한민국", "de": "독일", "mx": "멕시코", "ma": "모로코", "us": "미국",
    "be": "벨기에", "ba": "보스니아·헤르체고비나", "br": "브라질", "sa": "사우디아라비아", "sn": "세네갈",
    "se": "스웨덴", "ch": "스위스", "gb-sct": "스코틀랜드", "es": "스페인", "ar": "아르헨티나",
    "ht": "아이티", "dz": "알제리", "ec": "에콰도르", "at": "오스트리아", "jo": "요르단",
    "uy": "우루과이", "uz": "우즈베키스탄", "iq": "이라크", "ir": "이란", "eg": "이집트",
    "jp": "일본", "gb-eng": "잉글랜드", "cz": "체코", "cv": "카보베르데", "qa": "카타르",
    "ca": "캐나다", "ci": "코트디부아르", "co": "콜롬비아", "cd": "콩고민주공화국", "cw": "퀴라소",
    "hr": "크로아티아", "tr": "터키", "tn": "튀니지", "pa": "파나마", "py": "파라과이",
    "pt": "포르투갈", "fr": "프랑스", "au": "호주",
}

NATION_CODES = list(NATION_CODE_TEAM.keys())

# 1차 원칙(전력 추론) 베팅 비중. 나머지는 2차 원칙(이변 노림) 베팅.
# (자국팀이 출전하는 경기에는 이 비율 대신 애국 베팅 규칙이 우선 적용된다)
PRIMARY_STRATEGY_RATIO = 0.65

# 자국팀 경기에서 "승리 또는 무승부"에 베팅할 확률 (나머지는 "패배"에 베팅)
PATRIOTIC_WIN_OR_DRAW_RATIO = 0.65


def get_national_team(user: User) -> str | None:
    return NATION_CODE_TEAM.get(user.national)


def decide_patriotic_prediction(national_team: str, home_team: str, away_team: str) -> BetPrediction:
    """자국팀 경기 전용 예측: 65% 확률로 자국팀 승리/무승부, 35% 확률로 자국팀 패배에 베팅."""
    is_home = (home_team == national_team)

    if random.random() < PATRIOTIC_WIN_OR_DRAW_RATIO:
        win_pred = BetPrediction.HOME if is_home else BetPrediction.AWAY
        return random.choice([win_pred, BetPrediction.DRAW])
    else:
        return BetPrediction.AWAY if is_home else BetPrediction.HOME


def get_power_rank(team_name: str) -> int:
    return POWER_RANKINGS.get(team_name, DEFAULT_RANK)


def estimate_outcome_probabilities(home_team: str, away_team: str) -> dict:
    """파워랭킹 차이를 바탕으로 승/무/패 확률을 추론한다.

    랭킹 차이가 클수록 강팀의 승리 확률이 커지고, 차이가 작을수록 무승부
    확률이 커지는 단순 로지스틱 모델을 사용한다 (체스 Elo 기대승률과 유사한 형태).
    """
    home_rank = get_power_rank(home_team)
    away_rank = get_power_rank(away_team)
    diff = away_rank - home_rank  # 양수면 홈팀이 강함

    # 랭킹 차이를 승률 추정치로 변환 (값이 클수록 강팀 쪽으로 쏠림)
    home_edge = 1 / (1 + 10 ** (-diff / 12))

    draw_prob = max(0.18, 0.32 - abs(diff) * 0.01)
    home_prob = home_edge * (1 - draw_prob)
    away_prob = (1 - home_edge) * (1 - draw_prob)

    return {
        BetPrediction.HOME: home_prob,
        BetPrediction.DRAW: draw_prob,
        BetPrediction.AWAY: away_prob,
    }


def pick_primary_prediction(probabilities: dict) -> BetPrediction:
    """1차 원칙: 추론한 확률이 가장 높은 결과(최적 적중 확률)에 베팅."""
    return max(probabilities, key=probabilities.get)


def pick_underdog_prediction(probabilities: dict) -> BetPrediction:
    """2차 원칙: 확률은 낮지만 적중 시 배당이 큰 의외의 결과(이변)에 베팅."""
    return min(probabilities, key=probabilities.get)


def decide_bet_prediction(home_team: str, away_team: str) -> tuple:
    """경기에 대한 베팅 예측과 적용한 전략, 추정 확률을 반환한다."""
    probabilities = estimate_outcome_probabilities(home_team, away_team)

    if random.random() < PRIMARY_STRATEGY_RATIO:
        prediction = pick_primary_prediction(probabilities)
        strategy = "전력분석"
    else:
        prediction = pick_underdog_prediction(probabilities)
        strategy = "이변노림"

    return prediction, strategy, probabilities[prediction]


def get_last_group_match_time(db) -> datetime:
    match = (
        db.query(Match)
        .filter(Match.stage == MatchStage.GROUP)
        .order_by(Match.match_date.desc())
        .first()
    )
    if not match:
        raise RuntimeError("예선전 경기를 찾을 수 없습니다")
    dt = match.match_date
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def generate_user_info(db) -> dict:
    for _ in range(100):
        last_kr, last_en = random.choice(LAST_NAMES)
        gender = random.choice(["m", "f"])
        first_pool = MALE_FIRST if gender == "m" else FEMALE_FIRST
        first_kr, first_en = random.choice(first_pool)

        nickname = last_kr + first_kr
        email_local = last_en + first_en + str(random.randint(10, 99))
        domain = random.choice(DOMAINS)
        email = f"{email_local}@{domain}"

        if db.query(User).filter(User.nickname == nickname).first():
            continue
        if db.query(User).filter(User.email == email).first():
            continue

        return {"nickname": nickname, "email": email}

    raise RuntimeError("고유한 닉네임/이메일 생성 실패 (100회 시도)")


def create_user(db) -> User:
    info = generate_user_info(db)
    user = User(
        email=info["email"],
        nickname=info["nickname"],
        hashed_password=hash_password(PASSWORD),
        points=INITIAL_POINTS,
        is_admin=False,
        is_simulated=True,
        national=random.choice(NATION_CODES),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_bettable_matches(db) -> list:
    now = datetime.now(timezone.utc)
    matches = (
        db.query(Match)
        .filter(
            Match.stage == MatchStage.GROUP,
            Match.status == MatchStatus.UPCOMING,
            Match.match_date > now,
        )
        .all()
    )
    return matches


def get_existing_bettors(db) -> list:
    """포인트가 남아 있어 추가 베팅이 가능한 기존 시뮬레이터 회원 목록."""
    return (
        db.query(User)
        .filter(User.is_simulated == True, User.points >= MIN_BET)
        .all()
    )


def place_bets_for_user(db, user: User, matches: list) -> int:
    db.refresh(user)

    # 실제 서비스와 동일하게 한 경기에는 한 번만 베팅 가능 (이미 베팅한 경기 제외)
    already_bet_match_ids = {
        row[0] for row in db.query(Bet.match_id).filter(Bet.user_id == user.id).all()
    }
    available = [m for m in matches if m.id not in already_bet_match_ids]
    random.shuffle(available)

    # ── 최상위 규칙: 자국팀이 출전하는 예선 3경기는 모두 베팅에 포함 ─────────
    # (1차/2차 원칙보다 우선 적용되며, 애국 베팅 규칙으로 예측을 결정한다)
    national_team = get_national_team(user)
    national_matches = []
    if national_team:
        national_matches = [m for m in available if m.home_team == national_team or m.away_team == national_team]
    national_match_ids = {m.id for m in national_matches}

    rest = [m for m in available if m.id not in national_match_ids]
    available = national_matches + rest

    bet_count = 0
    for match in available:
        if user.points < MIN_BET:
            break

        is_national_match = (match.id in national_match_ids)

        if is_national_match:
            prediction = decide_patriotic_prediction(national_team, match.home_team, match.away_team)
            strategy = "자국팀우선"
            confidence = PATRIOTIC_WIN_OR_DRAW_RATIO
        else:
            prediction, strategy, confidence = decide_bet_prediction(match.home_team, match.away_team)

        # 전력분석(고확률)·자국팀 베팅은 확신이 클수록 크게, 이변노림(저확률) 베팅은
        # 잃어도 부담 없도록 작게 베팅한다.
        max_units = user.points // MIN_BET
        if strategy in ("전력분석", "자국팀우선"):
            target_units = max(1, round(max_units * confidence * random.uniform(0.6, 1.0)))
        else:
            target_units = max(1, round(max_units * confidence * random.uniform(0.3, 0.6)))

        units = min(max_units, target_units)
        amount = units * MIN_BET

        bet = Bet(
            user_id=user.id,
            match_id=match.id,
            prediction=prediction,
            amount=amount,
        )
        user.points -= amount
        db.add(bet)
        bet_count += 1

        # 랜덤하게 중간에 멈추기 (단, 자국팀 베팅은 반드시 포함되어야 하므로 건너뛰지 않는다)
        if not is_national_match and random.random() < 0.15:
            break

    db.commit()
    return bet_count


def log(msg: str):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)


def main():
    log("시뮬레이터 시작")

    db = SessionLocal()
    try:
        deadline = get_last_group_match_time(db)
        log(f"예선전 마지막 경기: {deadline.strftime('%Y-%m-%d %H:%M')} UTC")
    finally:
        db.close()

    cycle = 0
    while True:
        now = datetime.now(timezone.utc)
        if now >= deadline:
            log("예선전 마지막 경기 시작. 시뮬레이터 종료.")
            break

        db = SessionLocal()
        try:
            settings = get_settings(db)
        finally:
            db.close()

        if not settings.signup_enabled:
            log(f"  관리자 설정에서 비활성화 상태 - {SETTINGS_POLL_SEC}초 후 재확인...")
            time.sleep(SETTINGS_POLL_SEC)
            continue

        remaining = deadline - now
        hours, rem = divmod(int(remaining.total_seconds()), 3600)
        minutes = rem // 60
        log(f"[사이클 {cycle + 1}] 마감까지 {hours}시간 {minutes}분 남음")

        db = SessionLocal()
        try:
            user = create_user(db)
            log(f"  회원 가입: {user.nickname} ({user.email}), {user.points:,}P")

            matches = get_bettable_matches(db)
            if not matches:
                log("  베팅 가능한 경기 없음")
            else:
                bet_count = place_bets_for_user(db, user, matches)
                db.refresh(user)
                log(f"  베팅 완료: {bet_count}건, 잔여 포인트 {user.points:,}P")

                # 기존 가입자 중 포인트가 남은 회원도 임의의 시점에 추가 베팅 시도
                bettors = [b for b in get_existing_bettors(db) if b.id != user.id]
                random.shuffle(bettors)
                for bettor in bettors[:random.randint(0, 3)]:
                    if random.random() >= 0.4:
                        continue
                    extra_count = place_bets_for_user(db, bettor, matches)
                    if extra_count:
                        db.refresh(bettor)
                        log(f"  추가 베팅: {bettor.nickname} {extra_count}건, 잔여 포인트 {bettor.points:,}P")
        except Exception as e:
            log(f"  오류: {e}")
            db.rollback()
        finally:
            db.close()

        cycle += 1

        # 다음 사이클까지 설정된 주기만큼 대기 (남은 시간이 더 짧으면 그때까지만 대기)
        remaining_sec = (deadline - datetime.now(timezone.utc)).total_seconds()
        wait = min(settings.signup_interval_sec, max(0, remaining_sec))
        if wait <= 0:
            break
        log(f"  다음 가입까지 {int(wait)}초 대기...")
        time.sleep(wait)

    log("시뮬레이터 완료.")


if __name__ == "__main__":
    main()
