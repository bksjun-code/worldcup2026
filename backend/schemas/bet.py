from pydantic import BaseModel, field_validator
from datetime import datetime
from models import BetPrediction, BetStatus


class BetCreate(BaseModel):
    match_id: int
    prediction: BetPrediction
    amount: int

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("베팅 금액은 1포인트 이상이어야 합니다")
        if v > 100000:
            raise ValueError("베팅 금액은 100,000포인트를 초과할 수 없습니다")
        return v


class BetResponse(BaseModel):
    id: int
    match_id: int
    prediction: BetPrediction
    amount: int
    payout: int | None
    status: BetStatus
    created_at: datetime

    class Config:
        from_attributes = True


class BetUpdate(BaseModel):
    prediction: BetPrediction
    amount: int

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("베팅 금액은 1포인트 이상이어야 합니다")
        if v > 100000:
            raise ValueError("베팅 금액은 100,000포인트를 초과할 수 없습니다")
        return v


class OddsResponse(BaseModel):
    match_id: int
    home_odds: float
    draw_odds: float
    away_odds: float
    total_home: int
    total_draw: int
    total_away: int
    total_pool: int
