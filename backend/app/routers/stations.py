from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..data_store import store
from ..jsonutil import df_to_records

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("")
def list_stations(
    city: str | None = Query(None, description="Case-insensitive exact city match"),
    network: str | None = Query(None, description="Case-insensitive exact EV network match"),
    search: str | None = Query(None, description="Substring match on station name, city, or address"),
    min_dcfc: int = Query(0, ge=0, description="Only stations with at least this many DC Fast ports"),
    limit: int = Query(3000, ge=1, le=5000),
):
    df = store.stations

    if city:
        df = df[df["city"].str.lower() == city.lower()]
    if network:
        df = df[df["ev_network"].str.lower() == network.lower()]
    if search:
        s = search.lower()
        mask = (
            df["station_name"].str.lower().str.contains(s, na=False)
            | df["city"].str.lower().str.contains(s, na=False)
            | df["street_address"].str.lower().str.contains(s, na=False)
        )
        df = df[mask]
    if min_dcfc > 0:
        df = df[df["ev_dc_fast_count"] >= min_dcfc]

    df = df.head(limit)
    return {"count": len(df), "stations": df_to_records(df)}


@router.get("/cities")
def list_cities():
    counts = store.stations["city"].value_counts()
    return [{"city": c, "station_count": int(n)} for c, n in counts.items()]


@router.get("/networks")
def list_networks():
    counts = store.stations["ev_network"].value_counts()
    return [{"network": nw, "station_count": int(n)} for nw, n in counts.items()]


@router.get("/{station_id}")
def get_station(station_id: int):
    row = store.stations[store.stations["id"] == station_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    return df_to_records(row)[0]
