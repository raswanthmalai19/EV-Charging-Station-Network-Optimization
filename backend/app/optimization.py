"""
Core OR routines shared by the API layer.

These mirror EV_Charging_Optimization.ipynb (Sections 3.3, 5.1, 5.3, 6.1) exactly, so
results returned by the API match what the notebook reports. See the notebook for the
full derivation / formulation writeup.
"""
from __future__ import annotations

import time

import numpy as np
import pandas as pd
import pulp

from . import config


def haversine_distance_matrix(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Fully vectorized n x n great-circle distance matrix (km)."""
    R = 6371.0
    lat_r = np.radians(lat)[:, None]
    lon_r = np.radians(lon)[:, None]
    dlat = lat_r - lat_r.T
    dlon = lon_r - lon_r.T
    a = np.sin(dlat / 2) ** 2 + np.cos(lat_r) * np.cos(lat_r.T) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def haversine_to_points(lat1: float, lon1: float, lats2: np.ndarray, lons2: np.ndarray) -> np.ndarray:
    """Great-circle distance (km) from one point to an array of points."""
    R = 6371.0
    lat1r, lon1r = np.radians(lat1), np.radians(lon1)
    lats2r, lons2r = np.radians(lats2), np.radians(lons2)
    dlat, dlon = lats2r - lat1r, lons2r - lon1r
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1r) * np.cos(lats2r) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def existing_coverage(dist_to_nearest_station_km: np.ndarray, radius_km: float) -> np.ndarray:
    """e_j: 1 if zone j is already covered by an existing station within radius_km."""
    return (dist_to_nearest_station_km <= radius_km).astype(int)


def solve_mclp(
    population: np.ndarray,
    dist_matrix: np.ndarray,
    existing_covered: np.ndarray,
    radius_km: float,
    budget: int,
    time_limit: int = config.MILP_TIME_LIMIT_SEC,
) -> dict:
    """Exact Maximal Covering Location Problem via PuLP/CBC. See notebook Section 5.1."""
    n = len(population)
    e = np.asarray(existing_covered).astype(int)
    covered_by = [np.where(dist_matrix[:, j] <= radius_km)[0] for j in range(n)]

    prob = pulp.LpProblem("MCLP_EV_Charging_Ohio", pulp.LpMaximize)
    x = pulp.LpVariable.dicts("build", range(n), cat="Binary")
    y = pulp.LpVariable.dicts("covered", range(n), cat="Binary")

    prob += pulp.lpSum(int(population[j]) * y[j] for j in range(n)), "maximize_covered_pop"
    prob += pulp.lpSum(x[i] for i in range(n)) <= budget, "budget"
    for j in range(n):
        sites = covered_by[j]
        rhs = int(e[j]) + (pulp.lpSum(x[i] for i in sites) if len(sites) else 0)
        prob += y[j] <= rhs, f"cover_{j}"

    t0 = time.time()
    prob.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=time_limit))
    solve_time = time.time() - t0

    selected_sites = [i for i in range(n) if pulp.value(x[i]) > 0.5]
    covered_zones = [j for j in range(n) if pulp.value(y[j]) > 0.5]
    covered_pop = int(population[covered_zones].sum())
    total_pop = int(population.sum())

    return {
        "method": "milp",
        "status": pulp.LpStatus[prob.status],
        "solve_time_sec": round(solve_time, 3),
        "selected_sites": selected_sites,
        "covered_zones": covered_zones,
        "covered_population": covered_pop,
        "total_population": total_pop,
        "coverage_pct": round(100 * covered_pop / total_pop, 2) if total_pop else 0,
        "baseline_population": int(population[e == 1].sum()),
    }


def solve_greedy_mclp(
    population: np.ndarray,
    dist_matrix: np.ndarray,
    existing_covered: np.ndarray,
    radius_km: float,
    budget: int,
) -> dict:
    """Fast greedy heuristic for the same problem. See notebook Section 5.3."""
    n = len(population)
    e = np.asarray(existing_covered).astype(int)
    covers = [np.where(dist_matrix[i] <= radius_km)[0] for i in range(n)]
    covered = set(np.where(e == 1)[0].tolist())
    selected: list[int] = []
    remaining = set(range(n))

    t0 = time.time()
    for _ in range(budget):
        best_i, best_gain = None, -1
        for i in remaining:
            gain = sum(population[j] for j in covers[i] if j not in covered)
            if gain > best_gain:
                best_gain, best_i = gain, i
        if best_i is None or best_gain <= 0:
            break
        selected.append(best_i)
        covered |= set(covers[best_i].tolist())
        remaining.discard(best_i)
    solve_time = time.time() - t0

    covered_pop = int(population[list(covered)].sum())
    total_pop = int(population.sum())

    return {
        "method": "greedy",
        "status": "Heuristic (not certified optimal)",
        "solve_time_sec": round(solve_time, 4),
        "selected_sites": selected,
        "covered_zones": sorted(covered),
        "covered_population": covered_pop,
        "total_population": total_pop,
        "coverage_pct": round(100 * covered_pop / total_pop, 2) if total_pop else 0,
        "baseline_population": int(population[e == 1].sum()),
    }


def solve_charger_allocation(selected_sites: list[int], zones_df: pd.DataFrame) -> list[dict]:
    """Knapsack IP per selected site: how many L2 vs DCFC chargers. See notebook Section 6.1."""
    results = []
    for site in selected_sites:
        prob = pulp.LpProblem(f"charger_alloc_site_{site}", pulp.LpMaximize)
        z_l2 = pulp.LpVariable(f"l2_{site}", lowBound=0, cat="Integer")
        z_dcfc = pulp.LpVariable(f"dcfc_{site}", lowBound=0, cat="Integer")

        prob += config.CAP_L2_KW * z_l2 + config.CAP_DCFC_KW * z_dcfc
        prob += (
            config.COST_L2 * z_l2 + config.COST_DCFC * z_dcfc <= config.SITE_BUDGET_USD,
            "budget",
        )
        prob += z_l2 + z_dcfc <= config.MAX_CHARGERS_PER_SITE, "max_units"
        prob.solve(pulp.PULP_CBC_CMD(msg=0))

        l2_count = int(pulp.value(z_l2) or 0)
        dcfc_count = int(pulp.value(z_dcfc) or 0)
        row = zones_df.iloc[site]
        results.append(
            {
                "site_index": int(site),
                "zcta": str(row["zcta"]),
                "population": int(row["population"]),
                "was_zero_station_gap_zone": bool(row["existing_stations"] == 0),
                "l2_chargers": l2_count,
                "dcfc_chargers": dcfc_count,
                "total_capacity_kw": config.CAP_L2_KW * l2_count + config.CAP_DCFC_KW * dcfc_count,
                "site_cost_usd": config.COST_L2 * l2_count + config.COST_DCFC * dcfc_count,
            }
        )
    return results
