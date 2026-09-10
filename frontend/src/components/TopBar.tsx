import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: "Ohio's public EV charging network at a glance" },
  '/map': { title: 'Map Explorer', subtitle: 'Stations, coverage gaps, and recommended sites' },
  '/optimizer': { title: 'Optimizer', subtitle: 'Facility-location optimization (MCLP) for new stations' },
  '/data': { title: 'Stations & Zones', subtitle: 'Browse the underlying station and ZCTA-level data' },
  '/methodology': { title: 'Methodology', subtitle: 'Data sources, formulation, and known limitations' },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const meta = TITLES[pathname] ?? TITLES['/']
  const [online, setOnline] = useState<'checking' | 'ok' | 'down'>('checking')

  useEffect(() => {
    let cancelled = false
    api
      .get('/api/health')
      .then(() => !cancelled && setOnline('ok'))
      .catch(() => !cancelled && setOnline('down'))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-surface/80 backdrop-blur shrink-0">
      <div>
        <h1 className="text-[15px] font-semibold text-ink-900 leading-tight">{meta.title}</h1>
        <p className="text-[12px] text-ink-500 leading-tight">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-ink-500">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online === 'ok' ? 'bg-teal-500' : online === 'down' ? 'bg-rose-500' : 'bg-amber-500'
          }`}
        />
        {online === 'ok' ? 'API connected' : online === 'down' ? 'API unreachable' : 'Checking API…'}
      </div>
    </header>
  )
}
