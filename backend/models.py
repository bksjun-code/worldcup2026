from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import enum
from database import Base

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    """SQLite는 타임존 정보를 보존하지 못하므로, 저장 시각 자체를 KST 벽시계 시각으로 맞춘다."""
    return datetime.now(KST).replace(tzinfo=None)


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


class ReactionType(str, enum.Enum):
    LIKE = "like"           # 좋아요
    DISLIKE = "dislike"     # 싫어요


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(320), unique=True, nullable=False)
    nickname = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    points = Column(Integer, default=100000, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_simulated = Column(Boolean, default=False, nullable=False)
    national = Column(String(10), default="kr", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_kst)

    bets = relationship("Bet", back_populates="user")
    posts = relationship("Post", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    reactions = relationship("Reaction", back_populates="user")


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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, index=True)
    prediction = Column(Enum(BetPrediction), nullable=False)
    amount = Column(Integer, nullable=False)
    payout = Column(Integer)
    status = Column(Enum(BetStatus), default=BetStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_kst)

    user = relationship("User", back_populates="bets")
    match = relationship("Match", back_populates="bets")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_kst)

    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_kst)

    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_reaction_post_user"),
    )

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(ReactionType), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_kst)

    post = relationship("Post", back_populates="reactions")
    user = relationship("User", back_populates="reactions")


class SimulatorSettings(Base):
    """관리자 페이지에서 제어하는 시뮬레이터 활성화/주기 설정 (싱글턴 행, id=1)."""
    __tablename__ = "simulator_settings"

    id = Column(Integer, primary_key=True)

    # 회원가입 시뮬레이터 (simulator.py)
    signup_enabled = Column(Boolean, default=False, nullable=False)
    signup_interval_sec = Column(Integer, default=60, nullable=False)

    # 응원게시판 자동 활동 시뮬레이터 (board_simulator.py)
    board_enabled = Column(Boolean, default=False, nullable=False)
    board_interval_sec = Column(Integer, default=30, nullable=False)

    updated_at = Column(DateTime(timezone=True), default=now_kst, onupdate=now_kst)
