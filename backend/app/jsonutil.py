"""
pandas (as of the 3.x string-dtype default) re-introduces its own NaN/NA sentinel for
missing values as soon as data passes through a DataFrame again, even after an earlier
cleaning pass -- so `df.to_dict(orient="records")` can still hand back raw float `nan`.
Starlette's JSONResponse serializes with allow_nan=False and raises on that.

pandas' own `to_json` serializer *does* emit correct `null`, so round-tripping through
it right before building a response is the reliable way to get plain, JSON-safe records.
"""
from __future__ import annotations

import json

import pandas as pd


def df_to_records(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []
    return json.loads(df.to_json(orient="records"))
