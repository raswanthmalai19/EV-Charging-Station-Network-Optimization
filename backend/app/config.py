from pathlib import Path

# backend/app/config.py -> project root is two levels up
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"

ZONES_CSV = DATA_DIR / "zones.csv"
STATIONS_CSV = DATA_DIR / "stations.csv"
SUMMARY_JSON = DATA_DIR / "summary.json"
DEFAULT_SCENARIO_JSON = DATA_DIR / "optimize_default.json"

# Defaults / bounds mirrored from the notebook (Section 3.4 / 5.1)
DEFAULT_RADIUS_KM = 5.0
DEFAULT_BUDGET = 10
MIN_RADIUS_KM = 1.0
MAX_RADIUS_KM = 30.0
MIN_BUDGET = 1
MAX_BUDGET = 100
MILP_TIME_LIMIT_SEC = 20

# Knapsack charger-allocation economics (DOE/AFDC 2023 estimates)
COST_L2 = 6_000
COST_DCFC = 40_000
CAP_L2_KW = 7
CAP_DCFC_KW = 150
MAX_CHARGERS_PER_SITE = 6
SITE_BUDGET_USD = 60_000

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
