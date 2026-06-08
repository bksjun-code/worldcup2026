from pydantic import BaseModel, field_validator
from datetime import datetime


class SimulatorSettingsResponse(BaseModel):
    signup_enabled: bool
    signup_interval_sec: int
    board_enabled: bool
    board_interval_sec: int
    updated_at: datetime

    class Config:
        from_attributes = True


class SimulatorSettingsUpdate(BaseModel):
    signup_enabled: bool
    signup_interval_sec: int
    board_enabled: bool
    board_interval_sec: int

    @field_validator("signup_interval_sec", "board_interval_sec")
    @classmethod
    def interval_in_range(cls, v):
        if v < 5 or v > 3600:
            raise ValueError("주기는 5초 이상 3600초 이하로 설정해주세요")
        return v
