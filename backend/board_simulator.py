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

SETTINGS_POLL_SEC = 5

def get_settings(db) -> SimulatorSettings:
    settings = db.query(SimulatorSettings).filter(SimulatorSettings.id == 1).first()
    if not settings:
        settings = SimulatorSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ── 국가 코드 → 팀명 ──────────────────────────────────────────────────────────

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

# ── 국가별 주요 선수 ──────────────────────────────────────────────────────────

NATION_PLAYERS = {
    "kr": ["손흥민", "이강인", "김민재", "황희찬", "조현우", "이재성"],
    "br": ["비니시우스", "호드리구", "파케타", "에데르손", "마르키뇨스"],
    "ar": ["메시", "디마리아", "데파울", "알바레스", "마르티네스"],
    "fr": ["음바페", "그리즈만", "살리바", "테아 슈테겐", "카마뱅가"],
    "de": ["뮬러", "노이어", "귄도안", "키미히", "하베르츠"],
    "es": ["야말", "페드리", "모라타", "시몬", "카르바할"],
    "pt": ["호날두", "브루노 페르난데스", "루벤 디아스", "베르나르두 실바", "비티냐"],
    "nl": ["판다이크", "더리흐트", "시몬스", "베르호르스트", "플라펀"],
    "be": ["루카쿠", "데브라이너", "쿠르투아", "카스타뉴", "테이레"],
    "gb-eng": ["벨링엄", "살라", "폴든", "라쉬포드", "트리피어"],
    "gb-sct": ["맥토미니", "맥그리거", "타이어니", "로버트슨"],
    "us": ["풀리식", "위어", "아담스", "라이트", "터너"],
    "mx": ["로사노", "히메네스", "에레라", "안테우나", "오초아"],
    "jp": ["미토마", "도안", "마에다", "가마다", "엔도"],
    "ma": ["하키미", "엔-네시리", "암라바트", "마즈라위", "부파루스"],
    "hr": ["모드리치", "그발라르디올", "페리시치", "브로조비치", "수트알로"],
    "ch": ["샤키리", "아카니", "엘베디", "오마린", "자카"],
    "uy": ["발베르데", "아라우호", "벤탄쿠르", "수아레스", "카바니"],
    "ca": ["데이비스", "데이비드", "로아", "아데코예", "밀러"],
    "au": ["레키", "맥고완", "아이루", "보일", "라이언"],
    "sn": ["마네", "디알로", "사르", "쿠야테", "디아타베"],
    "eg": ["살라흐", "엘-샤하트", "가발라", "헤가지"],
    "co": ["디아스", "쿠아드라도", "코레아", "팔미에리"],
    "ec": ["카이세도", "발렌시아", "에스투피냔", "플라타스"],
    "tr": ["칼라파트", "젱긴", "오즈잔", "야지치"],
    "ir": ["아즈문", "타레미", "잔사데기", "베이란반드"],
    "dz": ["마레즈", "베나이샤", "구이리"],
    "gh": ["아유", "살리수", "카마라"],
    "se": ["이사크", "포르스베리", "올센", "칼스트룀"],
}

def get_national_team(user: User) -> str:
    return NATION_CODE_TEAM.get(user.national, "대한민국")

def get_player(user: User) -> str | None:
    players = NATION_PLAYERS.get(user.national)
    return random.choice(players) if players else None


# ── 맥락 접두사 (현실감) ─────────────────────────────────────────────────────

CONTEXT_PREFIXES = [
    "방금 뉴스 봤는데 ",
    "훈련 영상 봤더니 ",
    "커뮤니티에서 봤는데 ",
    "해외 반응 보니까 ",
    "어제 평가전 다시 보다가 ",
    "유튜브 분석 영상 보고 왔는데 ",
    "오늘 기사 읽었는데 ",
    "친구랑 얘기하다가 생각난 건데 ",
    "사실 예전부터 생각했던 건데 ",
    "",  # 접두사 없는 경우도 포함
    "",
    "",  # 접두사 없는 경우 더 많게
]

def maybe_prefix() -> str:
    return random.choice(CONTEXT_PREFIXES)

# ── 말투 변형 (인터넷 슬랭) ──────────────────────────────────────────────────

SLANG_SUFFIXES = [
    " ㅋㅋ", " ㄷㄷ", " ㅠㅠ", " ㄹㅇ", " ㄹㅇ임?", " ㅋㅋㅋ", " ...", " 진짜",
    " 대박", " 미쳤다", " 와", " 헐", " 아 진짜", "",  "", "", "", "",  # 없는 경우가 더 흔하게
]

def maybe_slang() -> str:
    return random.choice(SLANG_SUFFIXES)


# ── 글 제목 템플릿 (톤별) ─────────────────────────────────────────────────────

TITLE_HYPE = [
    "{team} 이번 대회 진짜 기대됩니다",
    "{team} 화이팅!! 우승까지 가자",
    "솔직히 {team} 우승 후보 아닌가요?",
    "{team} 첫 경기 너무 기다려진다",
    "다같이 {team} 응원해요!!",
    "{team} 역대급 멤버로 출전한다는 거 알죠?",
    "{team} 이번엔 진짜 다를 것 같음",
    "{player} 믿고 갑니다 {team} 화이팅!",
    "{player} 이번 대회 폼 보소",
    "{team} 이번 대회 포텐 터진다",
]

TITLE_WORRIED = [
    "{team} 이번 조편성 좀 빡세지 않나요?",
    "솔직히 {team} 걱정이 좀 됩니다",
    "{team} 부상자 나온다는 거 맞나요?",
    "{player} 컨디션 괜찮은 건가요?",
    "{team} 이번 상대 만만하게 보면 안 될 것 같은데",
    "{team} 수비 라인 좀 불안하지 않음?",
    "{team} 첫 경기가 사실 제일 걱정",
]

TITLE_DEBATE = [
    "{team} 실망스러운 경기력인데 나만 그렇게 느끼나요?",
    "{player} 이번 대회 주전이 맞는건가요?",
    "{team} 전술 방향성 좀 바꿔야 하지 않나",
    "솔직히 {team} 기대치 너무 높은 거 아닌가요?",
    "{team} 감독 선택 진짜 이해가 안 가는 부분이 있음",
    "{player} vs {player2} 누가 더 중요한 선수임?",
]

TITLE_CYNICAL = [
    "{team} 현실적으로 16강도 쉽지 않을 것 같은데",
    "매번 기대했다가 매번 실망... {team}",
    "{team} 솔직히 이번도 조별리그 탈락 각 아닌가",
    "기대는 하는데 {team} 실망시킬 것 같은 느낌적 느낌",
]

TITLE_SHORT = [
    "{team} 파이팅",
    "{player} 형 믿어",
    "우리 {team} 할 수 있다!!",
    "{team} 오늘도 응원해요",
    "{player} 득점 기대",
    "가자 {team}!!!",
    "{team} 최고",
]

# ── 글 본문 템플릿 (톤별, 길이별) ────────────────────────────────────────────

# 단문 (1~2줄)
CONTENT_SHORT = [
    "{prefix}{team} 이번엔 정말 잘 할 것 같아요{slang}",
    "{prefix}{player} 믿고 갑니다. 끝까지 응원{slang}",
    "{prefix}솔직히 너무 기대되는 거 저만 그런 건가요{slang}",
    "{prefix}{team} 첫 경기가 제일 중요한데 꼭 이겨줘야 함{slang}",
    "{prefix}다들 {team} 응원하죠? 같이 화이팅입시다{slang}",
    "{prefix}{player} 이번 대회 기대된다{slang}",
    "{prefix}{team} 오늘 훈련 영상 진짜 좋아 보이던데{slang}",
    "{prefix}뭔가 이번엔 느낌이 다름. {team} 해낼 것 같음{slang}",
]

# 중문 (3~4줄)
CONTENT_MEDIUM_HYPE = [
    "{prefix}{team} 최근 평가전에서 보여준 움직임이 정말 좋았어요. {player}도 폼이 올라오는 느낌이고, 이번 대회 진짜 기대해도 될 것 같습니다{slang}",
    "{prefix}{player} 저번 시즌 폼 그대로만 가져와도 충분히 해볼 만하다고 생각해요. {team} 조 통과는 문제없을 거라 봅니다{slang}",
    "{prefix}개인적으로 {team} 공격 조합이 마음에 들어요. 측면에서 {player}가 살아나면 진짜 무서운 팀이 됩니다. 우승까지 가봅시다{slang}",
    "{prefix}해외 축구 팬들도 이번 {team} 꽤 좋게 보더라고요. 객관적으로 봐도 충분히 경쟁력 있다고 생각합니다{slang}",
    "{prefix}{team} 수비 라인이 예전보다 훨씬 안정됐어요. {player} 역할이 핵심인데 이번 대회에서 제대로 보여줄 것 같습니다{slang}",
]

CONTENT_MEDIUM_WORRIED = [
    "{prefix}사실 {team} 걱정이 좀 됩니다. {player} 컨디션 기사 보셨어요? 제발 무사히 대회 치러줬으면... 첫 경기가 제일 중요한데{slang}",
    "{prefix}조편성 보니까 {team} 쉽지 않겠던데요. 솔직히 이번 조 2위 안에 드는 것도 쉽지 않을 것 같아서 걱정이에요{slang}",
    "{prefix}{team} 수비 불안함이 아직 해결이 안 된 것 같아요. {player} 한 명한테 너무 의존하는 게 좀 리스크가 크다고 생각합니다{slang}",
    "{prefix}기대는 하지만 또 기대했다가 실망할까봐... {team} 이번엔 제발 좋은 모습 보여줬으면 합니다{slang}",
]

CONTENT_MEDIUM_DEBATE = [
    "{prefix}솔직히 {player} 이번 대회 주전 기용이 맞나 싶어요. 폼 보면 다른 선수 써야 하는 거 아닌지... 여러분은 어떻게 생각하세요?{slang}",
    "{prefix}{team} 감독 전술이 좀 의문이에요. 저번 평가전에서 보니까 중원 싸움에서 계속 밀리는데 보완이 됐는지 모르겠네요{slang}",
    "{prefix}주변에서 {team} 이번에 잘 할 거라는 얘기 많이 하는데 저는 좀 회의적이에요. 근거 없는 낙관론 아닌가 싶기도 하고{slang}",
]

CONTENT_MEDIUM_CYNICAL = [
    "{prefix}매번 기대했다가 매번 실망했던 기억이 있어서... {team} 이번엔 좀 보수적으로 기대하고 있어요. 잘 되면 좋고{slang}",
    "{prefix}현실적으로 {team} 이번 조에서 1등 통과는 힘들 것 같고요. 2위로 올라가면 성공이라 봅니다{slang}",
    "{prefix}해외 베팅사 배당 보면 {team} 우승 확률 많이 낮게 잡혀있던데. 그게 현실적인 평가 아닐까 싶기도 해요{slang}",
]

# 장문 (5줄+)
CONTENT_LONG = [
    "{prefix}{team} 이번 대회 분석을 좀 해봤는데요. 일단 {player}가 건강하게 대회를 치르는 게 제일 중요한 변수라고 봐요. 중원 구성도 이전보다 훨씬 탄탄해진 것 같고, 공격진 옵션도 다양해졌어요. 물론 수비 쪽에서 불안한 요소가 없는 건 아니지만, 전체적으로 봤을 때 충분히 기대해도 될 것 같습니다. 다 같이 응원해요{slang}",
    "{prefix}솔직히 말하면 {team} 이번 조편성이 쉽지 않아요. 근데 또 그렇다고 불가능한 것도 아니거든요. {player} 포함해서 주요 선수들이 폼 좋을 때 출전한다면 충분히 조 1위도 노려볼 수 있다고 봐요. 감독이 전술적으로 어떻게 가져가느냐가 관건인 것 같습니다{slang}",
    "{prefix}커뮤니티 보면 {team} 관련해서 너무 극단적인 의견들이 많더라고요. 우승한다 vs 조별리그 탈락한다 이렇게 나뉘는데. 저는 현실적으로 16강 통과를 목표로 보고 있고, 그 이상은 대진 운이랑 그날 컨디션에 달렸다고 봐요. {player} 같은 선수가 있으면 언제든 이변을 일으킬 수 있으니까요{slang}",
]


def pick_tone() -> str:
    return random.choices(
        ["hype", "worried", "debate", "cynical", "short"],
        weights=[40, 25, 20, 10, 30],
        k=1,
    )[0]


def pick_post_text(team: str, player: str | None) -> tuple[str, str]:
    p = player or team
    players_list = [p]
    # 제목에 두 선수 이름 쓰는 경우를 위해 두 번째 선수 준비
    p2 = p  # 기본값

    tone = pick_tone()
    prefix = maybe_prefix()
    slang = maybe_slang()

    fmt = dict(team=team, player=p, player2=p2, prefix=prefix, slang=slang)

    if tone == "hype":
        title = random.choice(TITLE_HYPE).format(**fmt)
        content = random.choice(CONTENT_MEDIUM_HYPE).format(**fmt)
    elif tone == "worried":
        title = random.choice(TITLE_WORRIED).format(**fmt)
        content = random.choice(CONTENT_MEDIUM_WORRIED).format(**fmt)
    elif tone == "debate":
        title = random.choice(TITLE_DEBATE).format(**fmt)
        content = random.choice(CONTENT_MEDIUM_DEBATE).format(**fmt)
    elif tone == "cynical":
        title = random.choice(TITLE_CYNICAL).format(**fmt)
        content = random.choice(CONTENT_MEDIUM_CYNICAL).format(**fmt)
    else:  # short
        title = random.choice(TITLE_SHORT).format(**fmt)
        content = random.choice(CONTENT_SHORT).format(**fmt)

    # 20% 확률로 장문으로 교체
    if random.random() < 0.2:
        content = random.choice(CONTENT_LONG).format(**fmt)

    return title, content


# ── 댓글 템플릿 (반응별) ─────────────────────────────────────────────────────

COMMENT_AGREE = [
    "저도 완전 공감이에요 ㅋㅋ 끝까지 응원합시다",
    "맞아요 진짜 이번엔 느낌이 다름 ㄹㅇ",
    "공감 100%입니다. 같이 응원해요!",
    "오 저도 그렇게 생각했어요. 좋은 글 감사합니다 ㅎㅎ",
    "ㄹㅇ 저도 기대됩니다. 화이팅!",
    "이 글 보고 저도 기대감이 올라왔어요 ㅋㅋ",
    "맞습니다!! 같이 응원해요 🔥",
]

COMMENT_DISAGREE = [
    "음... 저는 좀 다르게 봐요. 기대치를 좀 낮추는 게 나을 것 같기도 한데",
    "근데 저는 좀 걱정이 되기도 하더라고요. 조편성이 쉽지 않아서",
    "솔직히 저는 회의적이에요 ㅠㅠ 매번 기대했다가 실망해서",
    "동의하는 부분도 있는데 수비 쪽은 좀 불안하지 않나요?",
    "음 저는 좀 보수적으로 보고 있어요. 기대는 하되 너무 확신하면 또 실망하니까",
]

COMMENT_QUESTION = [
    "혹시 부상 선수 명단 아시는 분? 걱정되던데",
    "근데 첫 경기 일정이 어떻게 됩니까?",
    "배당률 보면 어떻게 나와요? 궁금하네요",
    "해외 반응은 어떤지 아시는 분 계세요?",
    "조편성 어디서 자세히 볼 수 있어요?",
]

COMMENT_SHORT = [
    "ㄷㄷ",
    "ㄹㅇ ㄷㄷ",
    "화이팅!",
    "응원합니다 ㅎㅎ",
    "좋은 글이에요",
    "저도요 ㅋㅋ",
    "맞아요!!",
    "ㅠㅠ 공감",
    "진짜요?? 몰랐네요",
    "와 대박",
]

COMMENT_REACTION = [
    "글 잘 읽었습니다. 저도 같은 마음이에요 ㅎㅎ",
    "분석 잘 보고 갑니다. 좋은 결과 있었으면 좋겠네요",
    "이런 글 보면 나도 더 응원하고 싶어짐 ㅋㅋ",
    "공감되는 부분이 많네요. 감사합니다",
    "저도 그 경기 봤는데 인상적이었어요",
]

def pick_comment() -> str:
    pool = random.choices(
        [COMMENT_AGREE, COMMENT_DISAGREE, COMMENT_QUESTION, COMMENT_SHORT, COMMENT_REACTION],
        weights=[35, 20, 15, 20, 10],
        k=1,
    )[0]
    return random.choice(pool)


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
    player = get_player(user)
    title, content = pick_post_text(team, player)
    post = Post(user_id=user.id, title=title, content=content)
    db.add(post)
    db.commit()
    return title


def do_write_comment(db, user: User) -> tuple[str, str] | None:
    post = get_random_post(db)
    if not post:
        return None
    content = pick_comment()
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
