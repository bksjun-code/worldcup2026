"""
테스트 유저 1000명 일괄 생성
email: user1~user1000@gmail.com
nickname: 한국 이름 (랜덤)
password: 1234
"""
import sys, io, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from database import SessionLocal
from models import User
from auth import hash_password

SURNAMES = [
    '김','이','박','최','정','강','조','윤','장','임',
    '한','오','서','신','권','황','안','송','류','전',
    '홍','고','문','양','손','배','백','허','유','남',
    '심','노','하','곽','성','차','주','우','구','민',
    '진','엄','채','원','방','지','공','현','함','변',
]

GIVEN_NAMES = [
    '민준','서준','도윤','예준','시우','주원','하준','지호','준서','준우',
    '현우','도현','지훈','민재','건우','우진','선우','서진','민성','재원',
    '지원','유준','현준','정우','민규','재현','준혁','은우','동현','수호',
    '지안','수빈','다은','지민','서연','하은','지유','채원','수아','나은',
    '예은','지수','윤서','다현','수연','예린','소윤','은서','지은','혜원',
    '민서','아름','보람','가은','다솜','예지','소희','채린','수민','지현',
    '태양','별','바다','하늘','나라','한결','단비','새벽','여름','가을',
    '태현','상현','병준','성민','영준','경수','동훈','재민','형준','성훈',
    '혜진','미래','소라','나영','지영','수정','민정','혜린','보미','아영',
    '태인','우현','진호','상우','기현','민호','준영','성준','재훈','동우',
]

db = SessionLocal()

existing_emails = {u.email for u in db.query(User.email).all()}
existing_nicks  = {u.nickname for u in db.query(User.nickname).all()}

hashed_pw = hash_password('1234')
created = 0
skipped = 0

random.seed(42)
used_nicks = set(existing_nicks)

for i in range(1, 1001):
    email = f'user{i}@gmail.com'
    if email in existing_emails:
        skipped += 1
        continue

    # 중복 없는 닉네임 생성
    while True:
        nick = random.choice(SURNAMES) + random.choice(GIVEN_NAMES)
        # 동명이인 방지용 숫자 붙이기
        candidate = nick if nick not in used_nicks else f'{nick}{i}'
        if candidate not in used_nicks:
            used_nicks.add(candidate)
            break

    user = User(
        email=email,
        nickname=candidate,
        hashed_password=hashed_pw,
        points=100000,
        is_admin=False,
    )
    db.add(user)
    created += 1

    if created % 100 == 0:
        db.flush()
        print(f'  {created}명 처리 중...')

db.commit()
db.close()
print(f'\n완료: {created}명 생성, {skipped}명 스킵(이미 존재)')
