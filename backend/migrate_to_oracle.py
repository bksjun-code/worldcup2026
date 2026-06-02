"""
SQLite → Oracle DB 마이그레이션 (raw SQL)
실행: python migrate_to_oracle.py
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import oracledb

load_dotenv()

# SQLite 연결
sqlite_engine = create_engine("sqlite:///./worldcup.db", connect_args={"check_same_thread": False})
SqliteSession = sessionmaker(bind=sqlite_engine)

# Oracle raw 연결
_host = os.getenv("DB_HOST", "58.120.31.229")
_port = int(os.getenv("DB_PORT", "1522"))
_sid  = os.getenv("DB_SID", "CSONLINE")
_user = os.getenv("DB_USER", "worldcup")
_pw   = os.getenv("DB_PASSWORD", "Gtplus#700")
_dsn  = f"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={_host})(PORT={_port}))(CONNECT_DATA=(SID={_sid})))"

print(f"Oracle 연결 중: {_host}:{_port}/{_sid} ...")
ora = oracledb.connect(user=_user, password=_pw, dsn=_dsn)
ora_cur = ora.cursor()
print("Oracle 연결 성공")

# Oracle에 테이블 생성
from models import Base
oracle_engine = create_engine(
    "oracle+oracledb://",
    creator=lambda: oracledb.connect(user=_user, password=_pw, dsn=_dsn),
)
print("Oracle 테이블 생성 중...")
Base.metadata.create_all(bind=oracle_engine)
print("테이블 생성 완료\n")

src = SqliteSession()

try:
    # ── Matches ──────────────────────────────────────────────────────────
    ora_cur.execute("SELECT id FROM matches")
    existing_match_ids = {row[0] for row in ora_cur.fetchall()}

    rows = src.execute(text("SELECT id, home_team, away_team, home_flag, away_flag, match_date, venue, city, stage, group_name, status, home_score, away_score, is_korea_match, home_slot, away_slot FROM matches")).fetchall()
    def parse_dt(s):
        if not s:
            return None
        s = str(s).split(".")[0]  # 마이크로초 제거
        dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=timezone.utc)

    new_matches = 0
    for r in rows:
        if r[0] not in existing_match_ids:
            ora_cur.execute("""
                INSERT INTO matches (id, home_team, away_team, home_flag, away_flag, match_date, venue, city, stage, group_name, status, home_score, away_score, is_korea_match, home_slot, away_slot)
                VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16)
            """, [
                r[0], r[1], r[2], r[3], r[4],
                parse_dt(r[5]),
                r[6], r[7], r[8], r[9], r[10],
                r[11], r[12], int(r[13]) if r[13] is not None else 0,
                r[14], r[15]
            ])
            new_matches += 1
    ora.commit()
    print(f"[Match] 신규 {new_matches}건 / 기존 {len(existing_match_ids)}건 스킵")

    # ── Users ─────────────────────────────────────────────────────────────
    ora_cur.execute("SELECT email FROM users")
    existing_emails = {row[0] for row in ora_cur.fetchall()}

    rows = src.execute(text("SELECT id, email, nickname, hashed_password, points, is_admin FROM users")).fetchall()
    new_users = 0
    for r in rows:
        if r[1] not in existing_emails:
            ora_cur.execute("""
                INSERT INTO users (id, email, nickname, hashed_password, points, is_admin)
                VALUES (:1,:2,:3,:4,:5,:6)
            """, [r[0], r[1], r[2], r[3], r[4], int(r[5])])
            new_users += 1
    ora.commit()
    print(f"[User]  신규 {new_users}건 / 기존 {len(existing_emails)}건 스킵")

    # ── Bets ──────────────────────────────────────────────────────────────
    ora_cur.execute("SELECT id FROM bets")
    existing_bet_ids = {row[0] for row in ora_cur.fetchall()}

    rows = src.execute(text("SELECT id, user_id, match_id, prediction, amount, status, payout FROM bets")).fetchall()
    new_bets = 0
    for r in rows:
        if r[0] not in existing_bet_ids:
            ora_cur.execute("""
                INSERT INTO bets (id, user_id, match_id, prediction, amount, status, payout)
                VALUES (:1,:2,:3,:4,:5,:6,:7)
            """, [r[0], r[1], r[2], r[3], r[4], r[5], r[6]])
            new_bets += 1
    ora.commit()
    print(f"[Bet]   신규 {new_bets}건 / 기존 {len(existing_bet_ids)}건 스킵")

    print("\n마이그레이션 완료 ✓")

except Exception as e:
    ora.rollback()
    print(f"\n마이그레이션 실패: {e}")
    raise
finally:
    src.close()
    ora_cur.close()
    ora.close()
