"""
테스트 유저 1000명 삽입 스크립트
user1@gmail.com ~ user1000@gmail.com, 비번 1234, 포인트 100000
"""
import sys
from database import SessionLocal, engine, Base
from models import User
from auth import hash_password

# 한국 성씨 (빈도순)
SURNAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "전",
    "홍", "고", "문", "양", "손", "배", "백", "허", "유", "남",
    "심", "노", "하", "곽", "성", "차", "주", "우", "구", "민",
]

# 남자 이름 음절
MALE_SYLLABLES = [
    "준", "현", "민", "재", "영", "진", "우", "석", "훈", "규",
    "혁", "성", "원", "태", "승", "호", "경", "동", "철", "기",
    "선", "찬", "빈", "수", "강", "환", "건", "형", "범", "일",
    "상", "윤", "종", "희", "혜", "연", "아", "미", "나", "은",
]

# 여자 이름 음절
FEMALE_SYLLABLES = [
    "지", "수", "은", "아", "민", "예", "윤", "서", "채", "하",
    "나", "미", "연", "혜", "정", "희", "영", "린", "빈", "주",
    "솔", "유", "다", "래", "봄", "해", "별", "결", "온", "찬",
]

def generate_name(index: int) -> str:
    """index 기반으로 결정적으로 한국 이름 생성 (중복 최소화)"""
    surname = SURNAMES[index % len(SURNAMES)]
    # 이름 2글자: 각 음절 조합
    s1 = MALE_SYLLABLES[(index // len(SURNAMES)) % len(MALE_SYLLABLES)]
    s2 = FEMALE_SYLLABLES[(index // (len(SURNAMES) * len(MALE_SYLLABLES))) % len(FEMALE_SYLLABLES)]
    return surname + s1 + s2


def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email.like("user%@gmail.com")).count()
        if existing >= 1000:
            print(f"이미 테스트 유저 {existing}명 존재. 스킵.")
            return

        hashed = hash_password("1234")
        print("비밀번호 해싱 완료. 유저 삽입 시작...")

        # 닉네임 중복 방지용 set
        used_nicknames: set[str] = set()
        users = []

        for i in range(1, 1001):
            name = generate_name(i - 1)
            # 닉네임 중복이면 숫자 접미사 추가
            nickname = name
            suffix = 1
            while nickname in used_nicknames:
                nickname = f"{name}{suffix}"
                suffix += 1
            used_nicknames.add(nickname)

            users.append(User(
                email=f"user{i}@gmail.com",
                nickname=nickname,
                hashed_password=hashed,
                points=100000,
                is_admin=False,
            ))

            if i % 100 == 0:
                print(f"  {i}/1000 준비 완료...")

        db.bulk_save_objects(users)
        db.commit()
        print(f"\n✅ 테스트 유저 1000명 삽입 완료!")
        print(f"   이메일: user1@gmail.com ~ user1000@gmail.com")
        print(f"   비밀번호: 1234")
        print(f"   포인트: 100,000")

    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
