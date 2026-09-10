from __future__ import annotations

from fastapi import APIRouter, Query

from .. import config
from ..data_store import store
from ..optimization import existing_coverage, solve_charger_allocation, solve_greedy_mclp, solve_mclp
from ..schemas import OptimizeRequest

router = APIRouter(prefix="/api/optimize", tags=["optimize"])


@router.get("/default")
def default_scenario():
    """Precomputed scenario from the notebook (radius=5km, budget=10, MILP+Greedy+sensitivity)."""
    return store.default_scenario


def _run(budget: int, radius_km: float, method: str, allocate_chargers: bool) -> dict:
    population = store.population
    e = existing_coverage(store.dist_to_nearest_station, radius_km)

    if method == "milp":
        result = solve_mclp(population, store.distance_matrix, e, radius_km, budget)
    else:
        result = solve_greedy_mclp(population, store.distance_matrix, e, radius_km, budget)

    selected = [store.zone_row(i) for i in result["selected_sites"]]

    allocation = None
    total_cost = None
    total_capacity = None
    if allocate_chargers and result["selected_sites"]:
        allocation = solve_charger_allocation(result["selected_sites"], store.zones)
        total_cost = sum(a["site_cost_usd"] for a in allocation)
        total_capacity = sum(a["total_capacity_kw"] for a in allocation)

    newly_covered = result["covered_population"] - result["baseline_population"]

    return {
        "method": result["method"],
        "status": result["status"],
        "solve_time_sec": result["solve_time_sec"],
        "radius_km": radius_km,
        "budget": budget,
        "baseline_population": result["baseline_population"],
        "baseline_coverage_pct": round(100 * result["baseline_population"] / result["total_population"], 2),
        "covered_population": result["covered_population"],
        "total_population": result["total_population"],
        "coverage_pct": result["coverage_pct"],
        "newly_covered_population": newly_covered,
        "selected_sites": selected,
        "charger_allocation": allocation,
        "total_cost_usd": total_cost,
        "total_capacity_kw": total_capacity,
    }


@router.post("")
def run_optimize(req: OptimizeRequest):
    """
    Re-solve the existing-infrastructure-aware MCLP live (see notebook Section 5).
    Runs as a sync endpoint so FastAPI dispatches it to a worker thread -- a `milp`
    solve won't block other requests.
    """
    return _run(req.budget, req.radius_km, req.method, req.allocate_chargers)


@router.get("/sweep")
def sensitivity_sweep(
    radius_km: float = Query(config.DEFAULT_RADIUS_KM, ge=config.MIN_RADIUS_KM, le=config.MAX_RADIUS_KM),
    budgets: str = Query("1,3,5,8,10,15,20,25,30,40,50", description="Comma-separated budgets"),
):
    """Fast greedy-only sweep for an interactive coverage-vs-budget chart at a chosen radius."""
    budget_list = sorted({int(b) for b in budgets.split(",") if b.strip()})
    budget_list = [b for b in budget_list if config.MIN_BUDGET <= b <= config.MAX_BUDGET]

    population = store.population
    e = existing_coverage(store.dist_to_nearest_station, radius_km)
    baseline_pop = int(population[e == 1].sum())
    total_pop = int(population.sum())

    rows = []
    for b in budget_list:
        r = solve_greedy_mclp(population, store.distance_matrix, e, radius_km, b)
        rows.append(
            {
                "budget": b,
                "covered_population": r["covered_population"],
                "coverage_pct": r["coverage_pct"],
            }
        )

    return {
        "radius_km": radius_km,
        "baseline_population": baseline_pop,
        "baseline_coverage_pct": round(100 * baseline_pop / total_pop, 2) if total_pop else 0,
        "total_population": total_pop,
        "sweep": rows,
    }
