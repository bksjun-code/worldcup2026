"""
DB 마이그레이션: matches 테이블에 home_slot / away_slot 컬럼 추가 후 R32 슬롯 레이블 입력
"""
from database import engine, SessionLocal
from models import Match, MatchStage
from sqlalchemy import text

R32_SLOTS = [
    ("A조 2위",  "B조 2위"),
    ("E조 1위",  "3위(A/B/C/D/F조)"),
    ("F조 1위",  "C조 2위"),
    ("C조 1위",  "F조 2위"),
    ("I조 1위",  "3위(C/D/F/G/H조)"),
    ("E조 2위",  "I조 2위"),
    ("A조 1위",  "3위(C/E/F/H/I조)"),
    ("L조 1위",  "3위(E/H/I/J/K조)"),
    ("D조 1위",  "3위(B/E/F/I/J조)"),
    ("G조 1위",  "3위(A/E/H/I/J조)"),
    ("K조 2위",  "L조 2위"),
    ("H조 1위",  "J조 2위"),
    ("B조 1위",  "3위(E/F/G/I/J조)"),
    ("J조 1위",  "H조 2위"),
    ("K조 1위",  "3위(D/E/I/J/L조)"),
    ("D조 2위",  "G조 2위"),
]

def migrate():
    with engine.connect() as conn:
        # 컬럼이 없으면 추가
        try:
            conn.execute(text("ALTER TABLE matches ADD COLUMN home_slot VARCHAR"))
            print("home_slot 컬럼 추가됨")
        except Exception:
            print("home_slot 컬럼 이미 존재")
        try:
            conn.execute(text("ALTER TABLE matches ADD COLUMN away_slot VARCHAR"))
            print("away_slot 컬럼 추가됨")
        except Exception:
            print("away_slot 컬럼 이미 존재")
        conn.commit()

    db = SessionLocal()
    try:
        r32_matches = (
            db.query(Match)
            .filter(Match.stage == MatchStage.R32)
            .order_by(Match.match_date)
            .all()
        )
        if len(r32_matches) != 16:
            print(f"경고: R32 경기 수가 {len(r32_matches)}개 (16개 예상)")

        for i, match in enumerate(r32_matches):
            if i < len(R32_SLOTS):
                match.home_slot, match.away_slot = R32_SLOTS[i]

        db.commit()
        print(f"R32 {len(r32_matches)}경기 슬롯 레이블 업데이트 완료")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
