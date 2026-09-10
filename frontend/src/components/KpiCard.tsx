import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: 'brand' | 'teal' | 'rose' | 'amber' | 'ink'
  trend?: string
}

const toneClasses: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600',
  teal: 'bg-teal-50 text-teal-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  ink: 'bg-slate-100 text-ink-700',
}

export default function KpiCard({ label, value, hint, icon, tone = 'ink', trend }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink-500">{label}</span>
        {icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneClasses[tone]}`}>{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[22px] font-semibold text-ink-900 tracking-tight leading-none">{value}</span>
        {trend && <span className="text-[11.5px] font-medium text-teal-600 pb-0.5">{trend}</span>}
      </div>
      {hint && <span className="text-[11.5px] text-ink-500 leading-snug">{hint}</span>}
    </div>
  )
}
