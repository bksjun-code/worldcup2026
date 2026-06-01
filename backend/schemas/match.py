from pydantic import BaseModel
from datetime import datetime
from models import MatchStatus, MatchStage


class MatchResponse(BaseModel):
    id: int
    home_team: str
    away_team: str
    home_flag: str | None
    away_flag: str | None
    match_date: datetime
    venue: str
    city: str
    stage: MatchStage
    group_name: str | None
    status: MatchStatus
    home_score: int | None
    away_score: int | None
    is_korea_match: bool
    home_slot: str | None = None
    away_slot: str | None = None

    class Config:
        from_attributes = True


class MatchResultInput(BaseModel):
    home_score: int
    away_score: int
