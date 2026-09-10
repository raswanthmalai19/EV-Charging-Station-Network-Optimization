# OhioCharge — EV Charging Network Optimization

An Operations Research decision-support system for planning Ohio's public EV charging
network: where existing coverage actually reaches people today, and where a limited budget
of new stations should go to close the biggest gaps.

Three parts, one pipeline:

1. **`EV_Charging_Optimization.ipynb`** — the full analysis: data cleaning, exploratory
   analysis, and two optimization algorithms, from raw CSVs to results.
2. **`backend/`** — a FastAPI service that serves the notebook's processed data and can
   re-run the optimizer live with a user-chosen budget and service radius.
3. **`frontend/`** — a React dashboard (map, optimizer controls, data tables) for exploring
   the network and running "what if we built N more stations" scenarios interactively.

## The problem

Given Ohio's existing public EV charging stations and population by ZIP Code Tabulation
Area (ZCTA), decide where to build a limited number of new stations to cover the most
currently-underserved residents. This is a **Maximal Covering Location Problem (MCLP)** —
solved both exactly (integer programming, PuLP/CBC) and with a greedy heuristic — followed
by a **knapsack** sub-problem allocating Level 2 vs. DC Fast chargers at each chosen site
under a per-site budget.

### Two fixes that mattered more than the algorithm

An earlier pass at this analysis approximated each ZIP zone's coordinate as the mean
location of the stations already inside it — which meant a ZCTA with *zero* stations had no
coordinate and could never be evaluated as a build candidate. **811 of Ohio's 1,215
populated ZCTAs (3.24M people)** were silently excluded from the model entirely. Replacing
that approximation with official **US Census Gazetteer** ZCTA centroids fixed it: every
populated zone now has a real coordinate regardless of whether it currently has a station.

Separately, the original optimizer planned new stations as if none existed yet, so it kept
"rediscovering" already-served, high-population ZIPs instead of targeting real gaps. The
model now treats zones already within the service radius of an *existing* station as
pre-covered, so budget is spent only on the marginal, currently-uncovered population. At the
dashboard's default radius (5 km) and a 10-station budget, that change alone moved the
optimizer from picking 1-of-5 genuinely underserved sites to 9-of-10.

Full derivation, formulation, and honestly-stated limitations are in the notebook and in the
dashboard's **Methodology** page.

## Data sources

| Source | What | Scope |
|---|---|---|
| NREL / Alternative Fuels Data Center | Public EV charging station locations | 2,143 raw Ohio records → 1,916 after cleaning (public, currently-open) |
| US Census Bureau, ACS 5-Year 2019–2023 (table B01003) | Population by ZCTA | 1,215 populated Ohio ZCTAs |
| US Census Bureau, 2023 Gazetteer Files | Official ZCTA5 centroid coordinates | Ohio ZCTAs (`data/external/2023_gaz_zcta_oh.csv`) |

Raw files live in `dataset/`. The notebook writes its cleaned, joined output to
`data/processed/` (`zones.csv`, `stations.csv`, `summary.json`, `optimize_default.json`),
which is what the backend actually serves — the notebook is the single source of truth for
the data pipeline.

## Running it

**1. Notebook** (regenerates everything in `data/processed/`):

```bash
pip install pandas numpy matplotlib pulp jupyter
jupyter nbconvert --to notebook --execute --inplace EV_Charging_Optimization.ipynb
```

**2. Backend** (FastAPI, serves the processed data + live optimizer):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**3. Frontend** (React + Vite dashboard, talks to the backend on `localhost:8000`):

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Dashboard

- **Overview** — network-wide KPIs, existing-coverage-vs-radius chart, top cities, coverage
  gap map, highest-priority gap zones.
- **Map Explorer** — every station and ZCTA on an interactive map, filterable by city,
  network, and minimum DC Fast port count.
- **Optimizer** — budget and service-radius sliders re-solve live with a greedy heuristic;
  a "Solve Exact" button certifies the current scenario with the exact MILP; shows
  recommended new sites, before/after coverage, charger-mix allocation and cost, and a
  coverage-vs-budget sensitivity chart.
- **Stations & Zones** — sortable, searchable tables of the underlying data.
- **Methodology** — data sources, both algorithms' formulations, and known limitations.

## API

FastAPI serves interactive docs at `http://localhost:8000/docs`. Key endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/stats/summary` | Top-level KPIs and the existing-coverage-vs-radius sweep |
| `GET /api/stations` | Station list, filterable by city/network/min DC Fast ports/search |
| `GET /api/zones` / `GET /api/zones/gaps` | ZCTA-level population + coverage data |
| `POST /api/optimize` | Re-solve the MCLP live — `{budget, radius_km, method: "greedy" \| "milp"}` |
| `GET /api/optimize/sweep` | Fast greedy coverage-vs-budget sweep at a given radius |
| `GET /api/optimize/default` | Notebook's precomputed default scenario (MILP + greedy + sensitivity) |

## Project structure

```
dataset/                     raw source data (NREL stations, Census ACS population)
data/
  external/                  Census Gazetteer ZCTA centroids (downloaded once, committed)
  processed/                 notebook output -- what the backend actually reads
EV_Charging_Optimization.ipynb   full pipeline: clean -> EDA -> MCLP -> knapsack -> export
backend/
  app/
    main.py                  FastAPI app, CORS, router registration
    data_store.py             loads processed data + distance matrix at startup
    optimization.py           MCLP (exact + greedy) and knapsack solvers
    routers/                  stations, zones, stats, optimize endpoints
frontend/
  src/
    pages/                    Overview, MapExplorer, Optimizer, DataExplorer, Methodology
    components/                MapView (Leaflet), KpiCard, Sidebar, ...
    api/client.ts              typed API client
images/                        chart exports from the notebook
```

## Known limitations

- Straight-line (Haversine) distance is used instead of actual road-network distance.
- Coverage is a binary threshold at the chosen radius, not a gradual decay by distance.
- Charger costs are fixed DOE/AFDC 2023 averages; real costs vary by site and utility.
- The model optimizes population coverage; it does not directly model EV adoption rate,
  grid capacity, land availability, or equity weighting.
- ZCTA population is a proxy for charging demand, not a direct traffic or ownership count.
