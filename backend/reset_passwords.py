"""
관리자 제외 전체 회원 비밀번호를 123456으로 일괄 변경
"""
from database import SessionLocal
from models import User
from auth import hash_password

db = SessionLocal()

try:
    new_hash = hash_password("123456")
    updated = db.query(User).filter(User.is_admin == False).update(
        {"hashed_password": new_hash},
        synchronize_session=False
    )
    db.commit()
    print(f"완료: {updated}명의 비밀번호를 123456으로 변경했습니다.")
except Exception as e:
    db.rollback()
    print(f"오류: {e}")
finally:
    db.close()
