from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
import os

from database import engine, Base, get_db, DATABASE_URL
from routers import auth, matches, bets, admin
from seed_data import seed

load_dotenv()

try:
    Base.metadata.create_all(bind=engine)
    seed()
except Exception as e:
    print(f"[startup] DB 초기화 실패 (무시하고 계속): {e}")

app = FastAPI(
    title="2026 FIFA World Cup API",
    description="2026 북중미 월드컵 홈페이지 백엔드",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://bksjun-code.github.io",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(bets.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "2026 FIFA World Cup API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ping")
def ping(db: Session = Depends(get_db)):
    """Oracle 커넥션 웜업 — UptimeRobot 등으로 5분마다 호출 권장"""
    sql = "SELECT 1 FROM DUAL" if not DATABASE_URL.startswith("sqlite") else "SELECT 1"
    db.execute(text(sql))
    return {"status": "ok", "db": "connected"}
