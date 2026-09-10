from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from . import config


class OptimizeRequest(BaseModel):
    budget: int = Field(config.DEFAULT_BUDGET, ge=config.MIN_BUDGET, le=config.MAX_BUDGET)
    radius_km: float = Field(config.DEFAULT_RADIUS_KM, ge=config.MIN_RADIUS_KM, le=config.MAX_RADIUS_KM)
    method: Literal["greedy", "milp"] = "greedy"
    allocate_chargers: bool = True
