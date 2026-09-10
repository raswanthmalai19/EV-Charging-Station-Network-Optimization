import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getGapZones, getSummary, getTopCities } from '../api/client'
import KpiCard from '../components/KpiCard'
import { ErrorState, PageLoading } from '../components/Loading'
import MapView from '../components/MapView'
import { IconBolt, IconGap, IconStation, IconUsers } from '../components/icons'
import { formatCompact, formatNumber, formatPct } from '../lib/format'
import type { Summary, TopCity, Zone } from '../types'

export default function Overview() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [cities, setCities] = useState<TopCity[] | null>(null)
  const [gapZones, setGapZones] = useState<Zone[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getSummary(), getTopCities(10), getGapZones(8)])
      .then(([s, c, g]) => {
        setSummary(s)
        setCities(c)
        setGapZones(g.zones)
      })
      .catch(() =>
        setError('Could not reach the API. Make sure the FastAPI backend is running on port 8000.'),
      )
  }, [])

  if (error) return <ErrorState message={error} />
  if (!summary || !cities || !gapZones) return <PageLoading label="Loading Ohio EV network data…" />

  const totalPorts = summary.total_level1_ports + summary.total_level2_ports + summary.total_dcfc_ports

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Public EV stations"
          value={formatNumber(summary.total_stations)}
          hint={`Across ${summary.zones_with_stations} of ${summary.total_zones} ZIP zones`}
          icon={<IconStation />}
          tone="brand"
        />
        <KpiCard
          label="Charging ports"
          value={formatNumber(totalPorts)}
          hint={`${formatNumber(summary.total_dcfc_ports)} DC Fast · ${formatNumber(summary.total_level2_ports)} Level 2`}
          icon={<IconBolt />}
          tone="teal"
        />
        <KpiCard
          label="Population covered"
          value={formatPct(summary.baseline_coverage_pct)}
          hint={`${formatCompact(summary.baseline_covered_population)} of ${formatCompact(summary.total_population)} residents, within ${summary.default_radius_km} km`}
          icon={<IconUsers />}
          tone="teal"
        />
        <KpiCard
          label="Underserved population"
          value={formatCompact(summary.total_population - summary.baseline_covered_population)}
          hint={`${formatPct(100 - summary.baseline_coverage_pct)} of Ohio residents`}
          icon={<IconGap />}
          tone="rose"
        />
        <KpiCard
          label="Zero-station ZIP zones"
          value={formatNumber(summary.zero_station_gap_zones)}
          hint={`${formatCompact(summary.gap_zone_population)} people live there`}
          icon={<IconGap />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="card p-4 xl:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[13px] font-semibold text-ink-900">Existing coverage vs. service radius</h2>
          </div>
          <p className="text-[11.5px] text-ink-500 mb-3">
            % of Ohio's population within a given distance of an existing station today.
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={summary.radius_sweep} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="cov" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f5fdb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2f5fdb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
              <XAxis
                dataKey="radius_km"
                tickFormatter={(v) => `${v}km`}
                tick={{ fontSize: 11, fill: '#667085' }}
                axisLine={{ stroke: '#e3e6eb' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#667085' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value, name) =>
                  [
                    name === 'pct_population_covered' ? `${value}%` : formatNumber(Number(value)),
                    name === 'pct_population_covered' ? 'Population covered' : String(name),
                  ] as [string, string]
                }
                labelFormatter={(v) => `${v} km radius`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3e6eb' }}
              />
              <Area
                type="monotone"
                dataKey="pct_population_covered"
                stroke="#2f5fdb"
                strokeWidth={2}
                fill="url(#cov)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 xl:col-span-2">
          <h2 className="text-[13px] font-semibold text-ink-900 mb-1">Top cities by station count</h2>
          <p className="text-[11.5px] text-ink-500 mb-3">Public, currently-open stations.</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={cities} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="city"
                type="category"
                width={82}
                tick={{ fontSize: 11, fill: '#333d4d' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3e6eb' }} />
              <Bar dataKey="stations" fill="#2f5fdb" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[13px] font-semibold text-ink-900">Coverage gap map</h2>
                <p className="text-[11.5px] text-ink-500">
                  Largest zero-station ZIP zones, sized by population.
                </p>
              </div>
              <Link to="/map" className="text-[12px] font-medium text-brand-500 hover:text-brand-600">
                Open full map →
              </Link>
            </div>
            <MapView zones={gapZones} zoneColorMode="gap" height="360px" />
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-ink-900">Highest-priority gap zones</h2>
              <Link to="/optimizer" className="text-[12px] font-medium text-brand-500 hover:text-brand-600">
                Optimize →
              </Link>
            </div>
            <div className="space-y-1">
              {gapZones.map((z, i) => (
                <div
                  key={z.zcta}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-muted text-[12.5px]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-50 text-rose-600 text-[10.5px] font-semibold">
                      {i + 1}
                    </span>
                    <span className="font-medium text-ink-900">ZCTA {z.zcta}</span>
                  </div>
                  <div className="flex items-center gap-3 text-ink-500">
                    <span>{formatNumber(z.population)} people</span>
                    <span className={z.covered_by_existing ? 'text-teal-600' : 'text-rose-500'}>
                      {z.covered_by_existing ? 'covered nearby' : 'no coverage'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
