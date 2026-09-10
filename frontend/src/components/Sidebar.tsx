import { NavLink } from 'react-router-dom'
import { IconBolt, IconGrid, IconInfo, IconMap, IconTable, IconTarget } from './icons'

const links = [
  { to: '/', label: 'Overview', icon: IconGrid, end: true },
  { to: '/map', label: 'Map Explorer', icon: IconMap, end: false },
  { to: '/optimizer', label: 'Optimizer', icon: IconTarget, end: false },
  { to: '/data', label: 'Stations & Zones', icon: IconTable, end: false },
  { to: '/methodology', label: 'Methodology', icon: IconInfo, end: false },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-[228px] shrink-0 flex-col bg-sidebar text-slate-300 border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
          <IconBolt width={16} height={16} />
        </span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-white tracking-tight">OhioCharge</div>
          <div className="text-[10.5px] text-slate-400 -mt-0.5">Network Planner</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          Dashboard
        </div>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-hover text-white'
                  : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-100'
              }`
            }
          >
            <Icon width={16} height={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="text-[10.5px] text-slate-500 leading-relaxed">
          Data: NREL/AFDC EV stations &amp; US Census ACS 5-Year 2019–2023, ZCTA population.
          <br />
          State scope: Ohio.
        </div>
      </div>
    </aside>
  )
}
