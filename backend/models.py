from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class MatchStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    FINISHED = "finished"


class MatchStage(str, enum.Enum):
    GROUP = "group"
    R32 = "round_of_32"
    R16 = "round_of_16"
    QF = "quarterfinal"
    SF = "semifinal"
    THIRD = "third_place"
    FINAL = "final"


class BetPrediction(str, enum.Enum):
    HOME = "home"       # 홈팀 승
    DRAW = "draw"       # 무승부
    AWAY = "away"       # 어웨이팀 승


class BetStatus(str, enum.Enum):
    PENDING = "pending"     # 경기 전
    WON = "won"             # 적중
    LOST = "lost"           # 미적중
    REFUNDED = "refunded"   # 환불 (취소 경기)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nickname = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    points = Column(Integer, default=100000, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bets = relationship("Bet", back_populates="user")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    home_flag = Column(String)         # 국기 이모지 or 코드
    away_flag = Column(String)
    match_date = Column(DateTime(timezone=True), nullable=False)
    venue = Column(String, nullable=False)
    city = Column(String, nullable=False)
    stage = Column(Enum(MatchStage), default=MatchStage.GROUP, nullable=False)
    group_name = Column(String)        # "A", "B" ... 조별리그만
    status = Column(Enum(MatchStatus), default=MatchStatus.UPCOMING, nullable=False)

    home_score = Column(Integer)       # 결과 입력 전 null
    away_score = Column(Integer)
    is_korea_match = Column(Boolean, default=False, nullable=False)
    home_slot = Column(String, nullable=True)  # 대진 슬롯 레이블 (예: "A조 1위", "3위(A/B/C/D/F조)")
    away_slot = Column(String, nullable=True)

    bets = relationship("Bet", back_populates="match")


class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    prediction = Column(Enum(BetPrediction), nullable=False)
    amount = Column(Integer, nullable=False)     # 베팅 포인트
    payout = Column(Integer)                     # 정산 후 지급액
    status = Column(Enum(BetStatus), default=BetStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bets")
    match = relationship("Match", back_populates="bets")
