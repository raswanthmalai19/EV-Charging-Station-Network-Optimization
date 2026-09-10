from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .data_store import store
from .routers import optimize, stations, stats, zones


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.load()
    print(
        f"[startup] loaded {len(store.zones)} zones, {len(store.stations)} stations, "
        f"distance matrix {store.distance_matrix.shape}"
    )
    yield


app = FastAPI(
    title="OhioCharge API",
    description="EV charging network coverage + facility-location optimization for Ohio",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router)
app.include_router(zones.router)
app.include_router(stats.router)
app.include_router(optimize.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
