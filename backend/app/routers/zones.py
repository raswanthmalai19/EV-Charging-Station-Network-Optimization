from __future__ import annotations

from fastapi import APIRouter, Query

from ..data_store import store
from ..jsonutil import df_to_records

router = APIRouter(prefix="/api/zones", tags=["zones"])


@router.get("")
def list_zones(
    only_gaps: bool = Query(False, description="Only zones with zero existing stations"),
    limit: int = Query(1500, ge=1, le=1500),
):
    df = store.zones
    if only_gaps:
        df = df[df["existing_stations"] == 0]
    df = df.sort_values("population", ascending=False).head(limit)
    return {"count": len(df), "zones": df_to_records(df)}


@router.get("/gaps")
def top_gap_zones(limit: int = Query(20, ge=1, le=200)):
    df = store.zones[store.zones["existing_stations"] == 0].sort_values("population", ascending=False)
    return {"count": len(df), "zones": df_to_records(df.head(limit))}


@router.get("/coverage-by-radius")
def coverage_by_radius():
    """Existing-network coverage % swept across radii -- mirrors notebook Section 3.4/4.7."""
    return store.summary["radius_sweep"]
