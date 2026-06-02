from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./worldcup.db")

# Railway/Heroku postgres:// 호환
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_is_oracle = DATABASE_URL.startswith("oracle") or bool(os.getenv("DB_HOST"))

if _is_oracle:
    import oracledb

    _host = os.getenv("DB_HOST", "")
    _port = int(os.getenv("DB_PORT", "1522"))
    _sid  = os.getenv("DB_SID", "")
    _user = os.getenv("DB_USER", "")
    _pw   = os.getenv("DB_PASSWORD", "")

    # 풀 연결 생성 함수 — 특수문자 포함 비밀번호를 URL 인코딩 없이 안전하게 전달
    _dsn = f"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={_host})(PORT={_port}))(CONNECT_DATA=(SID={_sid})))"

    def _oracle_creator():
        return oracledb.connect(user=_user, password=_pw, dsn=_dsn)

    engine = create_engine(
        "oracle+oracledb://",
        creator=_oracle_creator,
        pool_size=3,
        max_overflow=2,
        pool_pre_ping=True,
        pool_recycle=600,
    )

elif DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

else:
    # PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 10},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
