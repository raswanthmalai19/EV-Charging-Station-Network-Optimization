import { useEffect, useMemo, useState } from 'react'
import { getStations, getZones } from '../api/client'
import { ErrorState, PageLoading } from '../components/Loading'
import { IconSearch } from '../components/icons'
import { formatKm, formatNumber } from '../lib/format'
import type { Station, Zone } from '../types'

const PAGE_SIZE = 25

type Tab = 'stations' | 'zones'
type SortDir = 'asc' | 'desc'

export default function DataExplorer() {
  const [tab, setTab] = useState<Tab>('stations')
  const [stations, setStations] = useState<Station[] | null>(null)
  const [zones, setZones] = useState<Zone[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getStations({ limit: 3000 }), getZones(false, 1500)])
      .then(([s, z]) => {
        setStations(s.stations)
        setZones(z.zones)
      })
      .catch(() => setError('Could not reach the API. Make sure the FastAPI backend is running on port 8000.'))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!stations || !zones) return <PageLoading label="Loading data tables…" />

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex gap-1 mb-4 border-b border-border">
        {(['stations', 'zones'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {t === 'stations' ? `Stations (${formatNumber(stations.length)})` : `ZIP zones (${formatNumber(zones.length)})`}
          </button>
        ))}
      </div>

      {tab === 'stations' ? <StationsTable stations={stations} /> : <ZonesTable zones={zones} />}
    </div>
  )
}

function StationsTable({ stations }: { stations: Station[] }) {
  const [search, setSearch] = useState('')
  const [network, setNetwork] = useState('all')
  const [sortKey, setSortKey] = useState<keyof Station>('station_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  const networks = useMemo(() => Array.from(new Set(stations.map((s) => s.ev_network))).sort(), [stations])

  const filtered = useMemo(() => {
    let rows = stations
    if (network !== 'all') rows = rows.filter((s) => s.ev_network === network)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (s) =>
          s.station_name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.zip.toLowerCase().includes(q),
      )
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return sorted
  }, [stations, search, network, sortKey, sortDir])

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  function toggleSort(key: keyof Station) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 border-b border-border">
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" width={13} height={13} />
          <input
            className="input pl-7 w-56"
            placeholder="Search name, city, ZIP…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <select
          className="input"
          value={network}
          onChange={(e) => {
            setNetwork(e.target.value)
            setPage(0)
          }}
        >
          <option value="all">All networks</option>
          {networks.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-[11.5px] text-ink-500 ml-auto">{formatNumber(filtered.length)} results</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-ink-500 border-b border-border bg-surface-muted">
              <Th label="Station" k="station_name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="City" k="city" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Network" k="ev_network" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="L2 ports" k="ev_level2_evse_num" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="DCFC ports" k="ev_dc_fast_count" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Opened" k="open_date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="py-2 px-3 font-medium text-ink-900 max-w-[260px] truncate">{s.station_name}</td>
                <td className="py-2 px-3">{s.city}</td>
                <td className="py-2 px-3">{s.ev_network}</td>
                <td className="py-2 px-3">{s.ev_level2_evse_num}</td>
                <td className="py-2 px-3">{s.ev_dc_fast_count}</td>
                <td className="py-2 px-3 text-ink-500">{s.open_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  )
}

function ZonesTable({ zones }: { zones: Zone[] }) {
  const [onlyGaps, setOnlyGaps] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof Zone>('population')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let rows = zones
    if (onlyGaps) rows = rows.filter((z) => z.existing_stations === 0)
    if (search.trim()) rows = rows.filter((z) => z.zcta.includes(search.trim()))
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return sorted
  }, [zones, onlyGaps, search, sortKey, sortDir])

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  function toggleSort(key: keyof Zone) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 border-b border-border">
        <input
          className="input w-40"
          placeholder="Search ZCTA…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
        />
        <label className="flex items-center gap-1.5 text-[12.5px] text-ink-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyGaps}
            onChange={(e) => {
              setOnlyGaps(e.target.checked)
              setPage(0)
            }}
          />
          Zero-station gap zones only
        </label>
        <span className="text-[11.5px] text-ink-500 ml-auto">{formatNumber(filtered.length)} results</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-ink-500 border-b border-border bg-surface-muted">
              <Th label="ZCTA" k="zcta" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Population" k="population" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Existing stations" k="existing_stations" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Nearest station" k="dist_to_nearest_station_km" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <th className="py-2 px-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((z) => (
              <tr key={z.zcta} className="border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="py-2 px-3 font-medium text-ink-900">{z.zcta}</td>
                <td className="py-2 px-3">{formatNumber(z.population)}</td>
                <td className="py-2 px-3">{z.existing_stations}</td>
                <td className="py-2 px-3">{formatKm(z.dist_to_nearest_station_km)}</td>
                <td className="py-2 px-3">
                  {z.covered_by_existing ? (
                    <span className="badge bg-teal-50 text-teal-600">covered</span>
                  ) : (
                    <span className="badge bg-rose-50 text-rose-600">gap</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  )
}

function Th<T extends string>({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string
  k: T
  sortKey: T
  sortDir: SortDir
  onClick: (k: T) => void
}) {
  const active = sortKey === k
  return (
    <th
      className={`py-2 px-3 font-medium cursor-pointer select-none whitespace-nowrap ${active ? 'text-ink-900' : ''}`}
      onClick={() => onClick(k)}
    >
      {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 text-[12px] text-ink-500">
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <div className="flex gap-1.5">
        <button className="btn btn-secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button className="btn btn-secondary" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
