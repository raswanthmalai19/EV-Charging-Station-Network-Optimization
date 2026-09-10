from __future__ import annotations

from fastapi import APIRouter

from ..data_store import store
from ..jsonutil import df_to_records

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary")
def summary():
    s = store.summary
    zones = store.zones
    stations = store.stations
    return {
        **s,
        "live": {
            "total_stations_loaded": int(len(stations)),
            "total_zones_loaded": int(len(zones)),
            "networks_count": int(stations["ev_network"].nunique()),
            "cities_count": int(stations["city"].nunique()),
        },
    }


@router.get("/top-cities")
def top_cities(limit: int = 15):
    df = (
        store.stations.groupby("city")
        .agg(
            stations=("id", "count"),
            level2_ports=("ev_level2_evse_num", "sum"),
            dcfc_ports=("ev_dc_fast_count", "sum"),
        )
        .reset_index()
        .sort_values("stations", ascending=False)
        .head(limit)
    )
    return df_to_records(df)


@router.get("/population-vs-stations")
def population_vs_stations():
    """Scatter-plot-ready data: one point per zone. Mirrors notebook chart 4.4."""
    df = store.zones[["zcta", "population", "existing_stations", "covered_by_existing"]]
    return df_to_records(df)
