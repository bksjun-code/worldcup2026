"""
응원게시판 자동 활동 시뮬레이터
- 임의의 회원이 임의의 시점에 로그인한 것처럼 동작하여
  · 응원글 작성 (자국팀 선수 응원, 감독 전술 평가 등 임의의 내용)
  · 기존 글에 댓글 작성
  · 게시글에 좋아요/싫어요 클릭 (토글: 같은 종류 재클릭 시 취소, 다른 종류 클릭 시 전환)
  을 임의로 반복 수행한다.
- Ctrl+C 로 종료할 때까지 계속 실행된다.
"""

import random
import time
from datetime import datetime

from database import SessionLocal
from models import User, Post, Comment, Reaction, ReactionType, SimulatorSettings

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

# ── 국가 코드 → 팀명 (simulator.py 와 동일) ──────────────────────────────────

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


def get_national_team(user: User) -> str:
    return NATION_CODE_TEAM.get(user.national, "대한민국")


# ── 글 작성 템플릿 (자국팀 선수 응원 / 감독 전술 평가 등) ────────────────────

POST_TITLE_TEMPLATES = [
    "{team} 이번 대회 진짜 기대됩니다 🔥",
    "{team} 선수들 컨디션 미쳤네요",
    "{team} 감독 전술 보고 소름 돋았습니다",
    "{team} 화이팅!! 우승까지 가자",
    "솔직히 {team} 우승 후보로 봐도 되지 않나요?",
    "{team} 첫 경기 너무 기다려진다",
    "{team} 이번엔 진짜 다를 것 같은 느낌",
    "{team} 응원 모임 다들 같이 보실 분",
    "{team} 대표팀 라인업 보고 왔는데 역대급",
    "다같이 {team} 응원해요!!",
]

POST_CONTENT_TEMPLATES = [
    "최근 평가전에서 보여준 {team} 선수들의 움직임을 보면 이번 대회 정말 기대해도 될 것 같습니다. 다 같이 끝까지 응원해요!",
    "{team} 감독님 전술 운영 보면 디테일이 살아있어요. 상대 분석을 정말 꼼꼼하게 한 게 느껴집니다. 이번엔 좋은 결과 있을 거라 믿습니다.",
    "개인적으로 {team} 공격진 조합이 정말 마음에 듭니다. 측면 침투랑 연계 플레이가 물 흐르듯 자연스러워요. 우리 화이팅입시다!",
    "{team} 수비 라인 조직력이 예전보다 훨씬 안정된 느낌이에요. 이 정도면 어떤 팀을 만나도 해볼 만하다고 생각합니다.",
    "사실 큰 기대 안 하고 있었는데 최근 경기력 보고 마음이 바뀌었어요. {team} 이번엔 정말 좋은 성적 거둘 것 같은 예감이 듭니다.",
    "{team} 선수단 분위기가 역대 최고라고 하더라고요. 팀워크가 좋으면 경기력도 따라온다고 생각해요. 끝까지 믿고 응원하겠습니다.",
    "젊은 선수들이 대거 발탁된 게 신선하면서도 기대됩니다. {team} 새로운 세대의 활약, 이번 대회에서 제대로 보여줬으면 좋겠어요.",
    "{team} 감독의 과감한 선수 기용을 보면서 확신이 생겼습니다. 이번 대회엔 정말 다를 거라고 봐요. 끝까지 믿습니다!",
    "주장을 중심으로 똘똘 뭉친 모습이 보기 좋습니다. {team} 이번엔 한 단계 더 올라가는 모습 보여줄 거라 믿어요.",
    "경기 보면서 진짜 소름 돋았던 장면이 많았어요. {team} 선수 한 명 한 명의 기량이 눈에 띄게 늘었더라고요. 우승까지 가봅시다!",
]

COMMENT_TEMPLATES = [
    "저도 완전 공감합니다! 끝까지 응원해요 👏",
    "오 좋은 글 감사합니다. 저도 기대하고 있어요!",
    "맞아요 진짜 이번엔 느낌이 다릅니다",
    "화이팅입니다! 같이 끝까지 응원해요 🔥",
    "분석 잘 보고 갑니다. 좋은 결과 있었으면 좋겠네요",
    "저도 그 경기 봤는데 정말 인상적이었어요",
    "공감 100%입니다. 우리 팀 믿습니다!",
    "글 잘 읽었습니다. 같이 응원하니 더 힘이 나네요",
    "이번 대회는 정말 다를 거라고 봐요. 끝까지 가봅시다!",
    "좋은 글이네요 ㅎㅎ 저도 같은 마음입니다. 화이팅!",
]


def pick_post_text(team: str) -> tuple[str, str]:
    title = random.choice(POST_TITLE_TEMPLATES).format(team=team)
    content = random.choice(POST_CONTENT_TEMPLATES).format(team=team)
    return title, content


# ── DB 헬퍼 ──────────────────────────────────────────────────────────────────

def get_random_user(db) -> User | None:
    users = db.query(User).filter(User.is_admin.is_(False)).all()
    if not users:
        return None
    return random.choice(users)


def get_random_post(db) -> Post | None:
    posts = db.query(Post).all()
    if not posts:
        return None
    return random.choice(posts)


# ── 행동 함수 ────────────────────────────────────────────────────────────────

def do_write_post(db, user: User) -> str | None:
    team = get_national_team(user)
    title, content = pick_post_text(team)
    post = Post(user_id=user.id, title=title, content=content)
    db.add(post)
    db.commit()
    return title


def do_write_comment(db, user: User) -> tuple[str, str] | None:
    post = get_random_post(db)
    if not post:
        return None
    content = random.choice(COMMENT_TEMPLATES)
    comment = Comment(post_id=post.id, user_id=user.id, content=content)
    db.add(comment)
    db.commit()
    return post.title, content


def do_react(db, user: User) -> tuple[str, str] | None:
    post = get_random_post(db)
    if not post:
        return None
    reaction_type = random.choice([ReactionType.LIKE, ReactionType.DISLIKE])

    existing = (
        db.query(Reaction)
        .filter(Reaction.post_id == post.id, Reaction.user_id == user.id)
        .first()
    )
    if existing and existing.type == reaction_type:
        db.delete(existing)
        action = f"{reaction_type.value} 취소"
    elif existing:
        existing.type = reaction_type
        action = f"{reaction_type.value}(으)로 전환"
    else:
        db.add(Reaction(post_id=post.id, user_id=user.id, type=reaction_type))
        action = reaction_type.value

    db.commit()
    return post.title, action


# ── 메인 루프 ────────────────────────────────────────────────────────────────

def log(msg: str):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)


def run_cycle(db):
    user = get_random_user(db)
    if not user:
        log("활동 가능한 회원이 없습니다.")
        return

    db.refresh(user)
    label = f"{user.nickname}({get_national_team(user)})"

    # 글 작성 15% / 댓글 작성 40% / 반응(좋아요·싫어요) 45%
    action = random.choices(
        ["post", "comment", "react"],
        weights=[15, 40, 45],
        k=1,
    )[0]

    if action == "post":
        title = do_write_post(db, user)
        log(f"  [글 작성] {label} → \"{title}\"")
    elif action == "comment":
        result = do_write_comment(db, user)
        if result:
            post_title, content = result
            log(f"  [댓글 작성] {label} → \"{post_title}\"에 댓글: \"{content}\"")
        else:
            log(f"  [댓글 작성] {label} → 댓글 달 게시글이 없어 건너뜀")
    else:
        result = do_react(db, user)
        if result:
            post_title, react_action = result
            log(f"  [반응] {label} → \"{post_title}\"에 {react_action}")
        else:
            log(f"  [반응] {label} → 반응할 게시글이 없어 건너뜀")


def main():
    log("응원게시판 자동 활동 시뮬레이터 시작 (Ctrl+C 로 종료)")

    cycle = 0
    while True:
        db = SessionLocal()
        try:
            settings = get_settings(db)
        finally:
            db.close()

        if not settings.board_enabled:
            log(f"  관리자 설정에서 비활성화 상태 - {SETTINGS_POLL_SEC}초 후 재확인...")
            time.sleep(SETTINGS_POLL_SEC)
            continue

        cycle += 1
        db = SessionLocal()
        try:
            log(f"[사이클 {cycle}]")
            run_cycle(db)
        except Exception as e:
            log(f"  오류: {e}")
            db.rollback()
        finally:
            db.close()

        wait = settings.board_interval_sec
        log(f"  다음 활동까지 {wait}초 대기...")
        time.sleep(wait)


if __name__ == "__main__":
    main()
