from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import engine, Base
from routers import auth, matches, bets, admin
from seed_data import seed

load_dotenv()

Base.metadata.create_all(bind=engine)
seed()

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
