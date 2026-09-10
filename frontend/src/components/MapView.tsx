import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import type { SelectedSite, Station, Zone } from '../types'
import { formatKm, formatNumber } from '../lib/format'

const OHIO_CENTER: [number, number] = [40.35, -82.85]
const OHIO_ZOOM = 7

function stationColor(s: Station): string {
  if (s.ev_dc_fast_count > 0) return '#0d9488' // teal — fast charging available
  if (s.ev_level2_evse_num > 0) return '#2f5fdb' // brand blue — level 2
  return '#98a2b3'
}

interface MapViewProps {
  height?: string
  stations?: Station[]
  zones?: Zone[]
  zoneColorMode?: 'gap' | 'coverage'
  selectedSites?: SelectedSite[]
  className?: string
}

export default function MapView({
  height = '520px',
  stations,
  zones,
  zoneColorMode = 'gap',
  selectedSites,
  className = '',
}: MapViewProps) {
  const maxZonePop = zones && zones.length ? Math.max(...zones.map((z) => z.population)) : 1

  return (
    <div className={`overflow-hidden rounded-lg border border-border ${className}`} style={{ height }}>
      <MapContainer
        center={OHIO_CENTER}
        zoom={OHIO_ZOOM}
        style={{ height: '100%', width: '100%' }}
        preferCanvas
        scrollWheelZoom
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {zones?.map((z) => {
          const radius = 4 + 14 * Math.sqrt(z.population / maxZonePop)
          const color =
            zoneColorMode === 'coverage' ? (z.covered_by_existing ? '#0d9488' : '#c0392b') : '#c0392b'
          return (
            <CircleMarker
              key={z.zcta}
              center={[z.latitude, z.longitude]}
              radius={radius}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: color, fillOpacity: 0.55 }}
            >
              <Popup>
                <div className="text-[12.5px] leading-snug">
                  <div className="font-semibold text-ink-900">ZCTA {z.zcta}</div>
                  <div>Population: {formatNumber(z.population)}</div>
                  <div>Existing stations: {z.existing_stations}</div>
                  <div>Nearest station: {formatKm(z.dist_to_nearest_station_km)}</div>
                  <div className={z.covered_by_existing ? 'text-teal-600' : 'text-rose-600'}>
                    {z.covered_by_existing ? 'Covered by existing network' : 'Coverage gap'}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {stations?.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.latitude, s.longitude]}
            radius={4}
            pathOptions={{ color: '#ffffff', weight: 1, fillColor: stationColor(s), fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="text-[12.5px] leading-snug max-w-[220px]">
                <div className="font-semibold text-ink-900">{s.station_name}</div>
                <div>{s.street_address}</div>
                <div>
                  {s.city}, {s.state} {s.zip}
                </div>
                <div className="mt-1">Network: {s.ev_network}</div>
                <div>
                  L2 ports: {s.ev_level2_evse_num} · DCFC ports: {s.ev_dc_fast_count}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {selectedSites?.map((s) => (
          <CircleMarker
            key={`sel-${s.zcta}`}
            center={[s.latitude, s.longitude]}
            radius={11}
            pathOptions={{ color: '#0f1521', weight: 2, fillColor: '#f5b301', fillOpacity: 0.95 }}
          >
            <Popup>
              <div className="text-[12.5px] leading-snug">
                <div className="font-semibold text-ink-900">Recommended new site — ZCTA {s.zcta}</div>
                <div>Zone population: {formatNumber(s.population)}</div>
                <div>Existing stations here today: {s.existing_stations}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
