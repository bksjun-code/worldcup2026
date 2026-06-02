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

    id = Column(Integer, primary_key=True)
    email = Column(String(320), unique=True, nullable=False)
    nickname = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    points = Column(Integer, default=100000, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bets = relationship("Bet", back_populates="user")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    home_flag = Column(String(20))
    away_flag = Column(String(20))
    match_date = Column(DateTime(timezone=True), nullable=False)
    venue = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    stage = Column(Enum(MatchStage), default=MatchStage.GROUP, nullable=False)
    group_name = Column(String(10))
    status = Column(Enum(MatchStatus), default=MatchStatus.UPCOMING, nullable=False)

    home_score = Column(Integer)
    away_score = Column(Integer)
    is_korea_match = Column(Boolean, default=False, nullable=False)
    home_slot = Column(String(100), nullable=True)
    away_slot = Column(String(100), nullable=True)

    bets = relationship("Bet", back_populates="match")


class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    prediction = Column(Enum(BetPrediction), nullable=False)
    amount = Column(Integer, nullable=False)
    payout = Column(Integer)
    status = Column(Enum(BetStatus), default=BetStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bets")
    match = relationship("Match", back_populates="bets")
