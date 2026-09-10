export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-current"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity={0.2} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center gap-3 text-ink-500">
      <Spinner size={22} />
      <span className="text-[13px]">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center gap-3 text-center px-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">!</div>
      <p className="text-[13px] text-ink-700 max-w-sm">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
