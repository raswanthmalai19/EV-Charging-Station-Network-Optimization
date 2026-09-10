import { useEffect, useMemo, useState } from 'react'
import { getStations, getZones } from '../api/client'
import { ErrorState, PageLoading } from '../components/Loading'
import MapView from '../components/MapView'
import { IconSearch } from '../components/icons'
import { formatNumber } from '../lib/format'
import type { Station, Zone } from '../types'

type ZoneLayer = 'none' | 'gap' | 'coverage'

export default function MapExplorer() {
  const [stations, setStations] = useState<Station[] | null>(null)
  const [zones, setZones] = useState<Zone[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showStations, setShowStations] = useState(true)
  const [zoneLayer, setZoneLayer] = useState<ZoneLayer>('gap')
  const [search, setSearch] = useState('')
  const [minDcfc, setMinDcfc] = useState(0)

  useEffect(() => {
    Promise.all([getStations({ limit: 3000 }), getZones(false, 1500)])
      .then(([s, z]) => {
        setStations(s.stations)
        setZones(z.zones)
      })
      .catch(() => setError('Could not reach the API. Make sure the FastAPI backend is running on port 8000.'))
  }, [])

  const filteredStations = useMemo(() => {
    if (!stations) return []
    const q = search.trim().toLowerCase()
    return stations.filter((s) => {
      if (minDcfc > 0 && s.ev_dc_fast_count < minDcfc) return false
      if (!q) return true
      return (
        s.station_name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.zip.toLowerCase().includes(q)
      )
    })
  }, [stations, search, minDcfc])

  const displayZones = useMemo(() => {
    if (!zones || zoneLayer === 'none') return undefined
    if (zoneLayer === 'gap') return zones.filter((z) => z.existing_stations === 0)
    return zones
  }, [zones, zoneLayer])

  if (error) return <ErrorState message={error} />
  if (!stations || !zones) return <PageLoading label="Loading stations and zones…" />

  return (
    <div className="flex h-full">
      <aside className="w-[280px] shrink-0 border-r border-border bg-surface p-4 space-y-5 overflow-y-auto">
        <div>
          <label className="text-[11.5px] font-semibold text-ink-700 mb-1.5 block">Search</label>
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" width={14} height={14} />
            <input
              className="input w-full pl-8"
              placeholder="Station, city, or ZIP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-[11.5px] font-semibold text-ink-700 mb-1.5 block">Minimum DC Fast ports</label>
          <input
            type="range"
            min={0}
            max={6}
            value={minDcfc}
            onChange={(e) => setMinDcfc(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="text-[11.5px] text-ink-500 mt-0.5">{minDcfc === 0 ? 'Any' : `${minDcfc}+`}</div>
        </div>

        <div className="border-t border-border pt-4">
          <label className="text-[11.5px] font-semibold text-ink-700 mb-2 block">Layers</label>
          <label className="flex items-center gap-2 text-[12.5px] text-ink-700 mb-2 cursor-pointer">
            <input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} />
            Existing stations ({formatNumber(filteredStations.length)})
          </label>

          <div className="text-[12.5px] text-ink-700 space-y-1.5 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="zoneLayer" checked={zoneLayer === 'none'} onChange={() => setZoneLayer('none')} />
              No zone overlay
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="zoneLayer" checked={zoneLayer === 'gap'} onChange={() => setZoneLayer('gap')} />
              Zero-station gap zones
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="zoneLayer"
                checked={zoneLayer === 'coverage'}
                onChange={() => setZoneLayer('coverage')}
              />
              All zones (coverage status)
            </label>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2 text-[11.5px] text-ink-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#0d9488' }} />
            Station with DC Fast charging
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#2f5fdb' }} />
            Station, Level 2 only
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#c0392b' }} />
            Coverage gap zone
          </div>
        </div>
      </aside>

      <div className="flex-1 p-4">
        <MapView
          stations={showStations ? filteredStations : undefined}
          zones={displayZones}
          zoneColorMode={zoneLayer === 'coverage' ? 'coverage' : 'gap'}
          height="100%"
          className="h-full"
        />
      </div>
    </div>
  )
}
