const sectionClass = 'card p-5'
const codeBlock =
  'bg-surface-muted border border-border rounded-md p-3 text-[12px] font-mono text-ink-700 whitespace-pre-wrap leading-relaxed'

export default function Methodology() {
  return (
    <div className="p-6 max-w-[900px] space-y-5">
      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-2">Data sources</h2>
        <ul className="text-[13px] text-ink-700 space-y-1.5 list-disc pl-5">
          <li>
            <strong>NREL / Alternative Fuels Data Center</strong> — 2,143 raw Ohio EV charging station
            records (<code className="text-[12px]">alt_fuel_stations.csv</code>), filtered to public,
            currently-open (status "E") stations → 1,916 stations used.
          </li>
          <li>
            <strong>US Census Bureau, ACS 5-Year 2019–2023 (table B01003)</strong> — population by ZIP
            Code Tabulation Area (ZCTA), filtered to Ohio (ZCTA prefixes 43/44/45) → 1,215 populated
            zones.
          </li>
          <li>
            <strong>US Census Bureau, 2023 Gazetteer Files</strong> — official ZCTA5 internal-point
            centroid coordinates, used for every zone regardless of whether it currently has a station.
          </li>
        </ul>
      </div>

      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-2">The fix that made this model honest</h2>
        <p className="text-[13px] text-ink-700 leading-relaxed mb-2">
          The first version of this analysis approximated each ZIP zone's coordinate as the mean location
          of existing stations inside it. That works only for ZIP codes that already have a station — 811
          of Ohio's 1,215 populated ZCTAs (3.24M people) had none, so they had no coordinate and could
          never be evaluated as a place to build. Replacing that approximation with official Census
          Gazetteer centroids gives every populated ZCTA real coordinates, so genuinely underserved areas
          can actually be recommended.
        </p>
        <p className="text-[13px] text-ink-700 leading-relaxed">
          A second fix made the optimizer <em>infrastructure-aware</em>: the original formulation planned
          new stations as if none existed yet, so it kept "rediscovering" already-served, high-population
          ZIPs. The current model treats zones within the service radius of an existing station as already
          covered, so the optimizer's budget is spent only on the marginal, currently-uncovered population.
        </p>
      </div>

      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-3">
          Algorithm 1 — Maximal Covering Location Problem (facility location)
        </h2>
        <p className="text-[13px] text-ink-700 mb-3">
          Solved two ways: an exact Integer Program (PuLP / CBC) for certified-optimal results, and a
          greedy heuristic for instant interactive use.
        </p>
        <div className={codeBlock}>
{`Sets
  I = candidate build sites  = every populated Ohio ZCTA
  J = demand zones           = every populated Ohio ZCTA (same set)

Parameters
  d_j  = population of zone j                         (Census)
  D_ij = Haversine distance, candidate i to zone j     (Gazetteer coords)
  r    = coverage radius (km)
  B    = budget (max new stations)
  e_j  = 1 if zone j already covered by an EXISTING station within r

Decision variables
  x_i ∈ {0,1}   build a new station at zone i
  y_j ∈ {0,1}   zone j ends up covered (existing OR new)

Objective       maximize  Σ_j d_j · y_j

Constraints     Σ_i x_i ≤ B
                y_j ≤ e_j + Σ_{i : D_ij ≤ r} x_i     ∀j
                x_i, y_j ∈ {0,1}`}
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-3">
          Algorithm 2 — Charger-mix allocation (knapsack)
        </h2>
        <p className="text-[13px] text-ink-700 mb-3">
          For each site the MCLP selects, an independent knapsack IP picks how many Level 2 vs. DC Fast
          chargers to install, maximizing added capacity under a per-site budget and space limit.
        </p>
        <div className={codeBlock}>
{`maximize    cap_L2 · z_L2 + cap_DCFC · z_DCFC

subject to  cost_L2 · z_L2 + cost_DCFC · z_DCFC ≤ SITE_BUDGET   ($60,000)
            z_L2 + z_DCFC ≤ MAX_CHARGERS_PER_SITE               (6)
            z_L2, z_DCFC ≥ 0, integer

Level 2 : $6,000 install, 7 kW      |   DC Fast: $40,000 install, 150 kW
(DOE / AFDC 2023 cost estimates)`}
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-2">Why the dashboard uses greedy live and MILP on demand</h2>
        <p className="text-[13px] text-ink-700 leading-relaxed">
          Benchmarking both solvers across a range of budgets and radii (see the notebook, Section 5.4)
          shows they tie exactly at the dashboard's default 5&nbsp;km operating radius, and stay within a
          fraction of a percent of each other even at larger radii with more coverage overlap — while
          greedy runs in single-digit milliseconds versus up to ~20 seconds for exact MILP on the largest
          scenarios. That is why every slider movement re-solves with greedy instantly, and "Solve Exact"
          is offered as a deliberate, on-demand action for certifying the final decision.
        </p>
      </div>

      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-2">Known limitations</h2>
        <ul className="text-[13px] text-ink-700 space-y-1.5 list-disc pl-5">
          <li>Straight-line (Haversine) distance is used instead of actual road-network distance.</li>
          <li>Coverage is a binary threshold at the chosen radius, not a gradual decay by distance.</li>
          <li>Charger costs are fixed DOE/AFDC 2023 averages; real costs vary by site and utility.</li>
          <li>
            The model optimizes population coverage; it does not model EV adoption rate, grid capacity,
            land availability, or equity weighting directly.
          </li>
          <li>ZCTA population is a proxy for charging demand, not a direct traffic or ownership count.</li>
        </ul>
      </div>

      <div className={sectionClass}>
        <h2 className="text-[14px] font-semibold text-ink-900 mb-2">Full derivation</h2>
        <p className="text-[13px] text-ink-700 leading-relaxed">
          The complete, executable analysis — data cleaning, EDA, both algorithms, evaluation against a
          random baseline, and sensitivity analysis — lives in{' '}
          <code className="text-[12px] bg-surface-muted border border-border rounded px-1.5 py-0.5">
            EV_Charging_Optimization.ipynb
          </code>{' '}
          at the project root. This dashboard reads the same processed data that notebook exports and
          re-runs the same solver code live.
        </p>
      </div>
    </div>
  )
}
