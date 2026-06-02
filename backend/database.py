from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./worldcup.db")

_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # 앱 시작 시 연결 풀을 미리 생성 — 매 요청마다 TCP/SSL 핸드셰이크 비용 제거
    # Supabase Direct Connection(port 5432) 전용. Pooler URL(port 6543) 사용 시 NullPool 필요
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,          # 상시 유지 연결 수
        max_overflow=5,       # 순간 트래픽 시 추가 허용 연결 수
        pool_pre_ping=True,   # 끊긴 연결 자동 감지 후 재연결
        pool_recycle=300,     # 5분마다 연결 갱신 (Supabase idle timeout 대비)
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
