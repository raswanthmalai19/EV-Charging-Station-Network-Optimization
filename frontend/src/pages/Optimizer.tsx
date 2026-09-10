import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDefaultScenario, getSweep, runOptimize } from '../api/client'
import { ErrorState, PageLoading, Spinner } from '../components/Loading'
import MapView from '../components/MapView'
import { IconTarget } from '../components/icons'
import { useDebouncedValue } from '../hooks/useDebounce'
import { formatCompact, formatNumber, formatPct, formatUSD } from '../lib/format'
import type { DefaultScenario, OptimizeResult, SweepResponse } from '../types'

const BUDGET_MIN = 1
const BUDGET_MAX = 40
const RADIUS_MIN = 2
const RADIUS_MAX = 20

export default function Optimizer() {
  const [defaultScenario, setDefaultScenario] = useState<DefaultScenario | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [budget, setBudget] = useState(10)
  const [radiusKm, setRadiusKm] = useState(5)
  const debouncedBudget = useDebouncedValue(budget, 350)
  const debouncedRadius = useDebouncedValue(radiusKm, 350)

  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [ready, setReady] = useState(false)
  const [loadingLive, setLoadingLive] = useState(false)
  const [solvingExact, setSolvingExact] = useState(false)
  const [sweep, setSweep] = useState<SweepResponse | null>(null)

  // initial load -- guarded against StrictMode's dev-mode double-invoke so we don't
  // fire the fetch twice (a real re-render is not idempotent here: `setReady(true)`
  // is the only state change that needs to survive to gate the effect below).
  const fetchedOnce = useRef(false)
  useEffect(() => {
    if (fetchedOnce.current) return
    fetchedOnce.current = true
    getDefaultScenario()
      .then((d) => {
        setDefaultScenario(d)
        setBudget(d.milp.budget)
        setRadiusKm(d.milp.radius_km)
        setResult({
          method: 'milp',
          status: d.milp.status,
          solve_time_sec: d.milp.solve_time_sec,
          radius_km: d.milp.radius_km,
          budget: d.milp.budget,
          baseline_population: d.milp.baseline_population,
          baseline_coverage_pct: round2((100 * d.milp.baseline_population) / d.milp.total_population),
          covered_population: d.milp.covered_population,
          total_population: d.milp.total_population,
          coverage_pct: d.milp.coverage_pct,
          newly_covered_population: d.milp.covered_population - d.milp.baseline_population,
          selected_sites: d.milp.selected_sites,
          charger_allocation: d.charger_allocation,
          total_cost_usd: d.charger_allocation.reduce((a, c) => a + c.site_cost_usd, 0),
          total_capacity_kw: d.charger_allocation.reduce((a, c) => a + c.total_capacity_kw, 0),
        })
        setReady(true)
      })
      .catch(() => setError('Could not reach the API. Make sure the FastAPI backend is running on port 8000.'))
  }, [])

  // live greedy re-solve whenever sliders settle -- skip the run that fires right after
  // the initial load flips `ready`, so the certified-optimal MILP result from the
  // notebook stays on screen until the user actually moves a slider.
  const skippedInitialRun = useRef(false)
  useEffect(() => {
    if (!ready) return
    if (!skippedInitialRun.current) {
      skippedInitialRun.current = true
      getSweep(debouncedRadius, [1, 3, 5, 8, 10, 15, 20, 25, 30, 40]).then(setSweep)
      return
    }
    setLoadingLive(true)
    runOptimize({ budget: debouncedBudget, radius_km: debouncedRadius, method: 'greedy' })
      .then(setResult)
      .catch(() => setError('Optimization request failed.'))
      .finally(() => setLoadingLive(false))
    getSweep(debouncedRadius, [1, 3, 5, 8, 10, 15, 20, 25, 30, 40]).then(setSweep)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBudget, debouncedRadius, ready])

  async function solveExact() {
    setSolvingExact(true)
    try {
      const r = await runOptimize({ budget, radius_km: radiusKm, method: 'milp' })
      setResult(r)
    } catch {
      setError('Exact solve failed or timed out.')
    } finally {
      setSolvingExact(false)
    }
  }

  const sweepChartData = useMemo(() => {
    if (!sweep) return []
    return sweep.sweep.map((p) => ({ ...p }))
  }, [sweep])

  if (error) return <ErrorState message={error} />
  if (!defaultScenario || !result) return <PageLoading label="Loading optimizer…" />

  const isExact = result.method === 'milp'
  const paramsStale = result.budget !== budget || result.radius_km !== radiusKm

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="card p-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-ink-700">
                Budget — new stations to build
              </label>
              <span className="text-[13px] font-semibold text-brand-600">{budget}</span>
            </div>
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-ink-700">Service radius</label>
              <span className="text-[13px] font-semibold text-brand-600">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <button className="btn btn-primary" onClick={solveExact} disabled={solvingExact}>
              {solvingExact ? <Spinner size={13} /> : <IconTarget width={14} height={14} />}
              {solvingExact ? 'Solving…' : 'Solve Exact (MILP)'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-[11.5px] text-ink-500">
          <span
            className={`badge ${isExact && !paramsStale ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}
          >
            {isExact && !paramsStale ? 'Certified optimal (MILP)' : loadingLive ? 'Solving…' : 'Live preview (greedy)'}
          </span>
          {isExact && !paramsStale ? (
            <span>Solved to proven optimality in {result.solve_time_sec}s.</span>
          ) : (
            <span>
              Instant heuristic preview ({result.solve_time_sec * 1000 < 50 ? '<50ms' : `${(result.solve_time_sec * 1000).toFixed(0)}ms`}
              ) — click "Solve Exact" for the certified-optimal placement.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi label="Baseline coverage" value={formatPct(result.baseline_coverage_pct)} sub="before new stations" />
        <Kpi label="Coverage after" value={formatPct(result.coverage_pct)} sub="existing + new" tone="teal" />
        <Kpi
          label="Newly reached"
          value={formatCompact(result.newly_covered_population)}
          sub="people gaining access"
          tone="brand"
        />
        <Kpi label="New sites" value={String(result.selected_sites.length)} sub={`of ${budget} budgeted`} />
        <Kpi label="Capital cost" value={formatUSD(result.total_cost_usd)} sub="charger install cost" />
        <Kpi label="Capacity added" value={`${formatNumber(result.total_capacity_kw)} kW`} sub="L2 + DC Fast" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="card p-4 xl:col-span-3">
          <h2 className="text-[13px] font-semibold text-ink-900 mb-1">Recommended new station sites</h2>
          <p className="text-[11.5px] text-ink-500 mb-3">
            Gold markers = recommended new sites. Red = remaining zero-station gap zones.
          </p>
          <MapView
            zones={undefined}
            selectedSites={result.selected_sites}
            height="420px"
          />
        </div>

        <div className="card p-4 xl:col-span-2">
          <h2 className="text-[13px] font-semibold text-ink-900 mb-1">Coverage vs. budget</h2>
          <p className="text-[11.5px] text-ink-500 mb-3">Greedy sweep at {radiusKm} km radius.</p>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={sweepChartData} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
              <XAxis dataKey="budget" tick={{ fontSize: 11, fill: '#667085' }} axisLine={{ stroke: '#e3e6eb' }} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#667085' }}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Coverage'] as [string, string]}
                labelFormatter={(v) => `Budget = ${v}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3e6eb' }}
              />
              <ReferenceLine x={budget} stroke="#c0392b" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="coverage_pct" stroke="#2f5fdb" strokeWidth={2} dot={{ r: 2.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-2 text-[11px] text-ink-500">
            Diminishing returns: the first stations close the highest-population gaps; later ones add less each.
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-[13px] font-semibold text-ink-900 mb-1">Charger allocation per selected site</h2>
        <p className="text-[11.5px] text-ink-500 mb-3">
          Knapsack IP: maximize kW capacity per site under a $60,000 budget and 6-charger space limit.
        </p>
        {result.charger_allocation && result.charger_allocation.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-ink-500 border-b border-border">
                  <th className="py-2 pr-4 font-medium">ZCTA</th>
                  <th className="py-2 pr-4 font-medium">Zone population</th>
                  <th className="py-2 pr-4 font-medium">Gap zone?</th>
                  <th className="py-2 pr-4 font-medium">Level 2</th>
                  <th className="py-2 pr-4 font-medium">DC Fast</th>
                  <th className="py-2 pr-4 font-medium">Capacity</th>
                  <th className="py-2 pr-4 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {result.charger_allocation.map((a) => (
                  <tr key={a.zcta} className="border-b border-border last:border-0 hover:bg-surface-muted">
                    <td className="py-2 pr-4 font-medium text-ink-900">{a.zcta}</td>
                    <td className="py-2 pr-4">{formatNumber(a.population)}</td>
                    <td className="py-2 pr-4">
                      {a.was_zero_station_gap_zone ? (
                        <span className="badge bg-rose-50 text-rose-600">yes</span>
                      ) : (
                        <span className="badge bg-slate-100 text-ink-500">no</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{a.l2_chargers}</td>
                    <td className="py-2 pr-4">{a.dcfc_chargers}</td>
                    <td className="py-2 pr-4">{a.total_capacity_kw} kW</td>
                    <td className="py-2 pr-4">{formatUSD(a.site_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-500">No sites selected at this budget/radius.</p>
        )}
      </div>

      <div className="card p-4">
        <h2 className="text-[13px] font-semibold text-ink-900 mb-1">Why greedy for live interaction?</h2>
        <p className="text-[12px] text-ink-500 mb-3 max-w-3xl">
          The dashboard re-solves instantly as you move the sliders using a greedy heuristic, then lets you certify
          the result with exact MILP on demand. Benchmarked against exact optimization across budgets and radii in
          the notebook, greedy matched or came within a fraction of a percent of optimal in every tested case —
          while running orders of magnitude faster.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={defaultScenario.greedy_vs_exact_sweep.filter((r) => r.radius_km === 15)}
            margin={{ left: -12, right: 12, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
            <XAxis dataKey="budget" tick={{ fontSize: 11, fill: '#667085' }} axisLine={{ stroke: '#e3e6eb' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => formatCompact(v)} />
            <Tooltip
              formatter={(v) => [formatNumber(Number(v)), 'People'] as [string, string]}
              labelFormatter={(v) => `Budget = ${v} (radius 15km)`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3e6eb' }}
            />
            <Bar dataKey="gap_people" fill="#b7791f" radius={[4, 4, 0, 0]} name="MILP − Greedy gap (people)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'teal' | 'brand' }) {
  const toneClass = tone === 'teal' ? 'text-teal-600' : tone === 'brand' ? 'text-brand-600' : 'text-ink-900'
  return (
    <div className="card p-3.5">
      <div className="text-[11px] font-medium text-ink-500 mb-1">{label}</div>
      <div className={`text-[18px] font-semibold tracking-tight ${toneClass}`}>{value}</div>
      <div className="text-[10.5px] text-ink-400 mt-0.5">{sub}</div>
    </div>
  )
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
