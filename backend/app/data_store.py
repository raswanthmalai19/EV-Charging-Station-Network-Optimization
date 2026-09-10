"""
In-memory data store loaded once at API startup from the notebook's exported
data/processed/*.csv|json files (see EV_Charging_Optimization.ipynb, Section 10).
"""
from __future__ import annotations

import json
import math

import numpy as np
import pandas as pd

from . import config
from .optimization import haversine_distance_matrix


class DataStore:
    zones: pd.DataFrame
    stations: pd.DataFrame
    summary: dict
    default_scenario: dict
    distance_matrix: np.ndarray

    def load(self) -> None:
        missing = [
            p
            for p in [config.ZONES_CSV, config.STATIONS_CSV, config.SUMMARY_JSON, config.DEFAULT_SCENARIO_JSON]
            if not p.exists()
        ]
        if missing:
            raise FileNotFoundError(
                "Missing processed data files: "
                + ", ".join(str(p) for p in missing)
                + ". Run EV_Charging_Optimization.ipynb (Section 10) first to generate them."
            )

        self.zones = pd.read_csv(config.ZONES_CSV, dtype={"zcta": str})
        self.stations = pd.read_csv(config.STATIONS_CSV, dtype={"zip": str})
        # NaN (e.g. missing `facility_type`) is cleaned to JSON `null` at the response
        # boundary in each router via jsonutil.df_to_records -- see that module for why.

        with open(config.SUMMARY_JSON) as f:
            self.summary = json.load(f)
        with open(config.DEFAULT_SCENARIO_JSON) as f:
            self.default_scenario = json.load(f)

        self.distance_matrix = haversine_distance_matrix(
            self.zones["latitude"].values, self.zones["longitude"].values
        )

    @property
    def population(self) -> np.ndarray:
        return self.zones["population"].values

    @property
    def dist_to_nearest_station(self) -> np.ndarray:
        return self.zones["dist_to_nearest_station_km"].values

    def zone_row(self, idx: int) -> dict:
        row = self.zones.iloc[idx]
        return {
            "zcta": str(row["zcta"]),
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "population": int(row["population"]),
            "existing_stations": int(row["existing_stations"]),
            "dist_to_nearest_station_km": _clean_float(row["dist_to_nearest_station_km"]),
        }


def _clean_float(value) -> float | None:
    f = float(value)
    return None if math.isnan(f) or math.isinf(f) else round(f, 3)


store = DataStore()
