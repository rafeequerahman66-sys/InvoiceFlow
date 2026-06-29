/** Skeleton shown instantly via loading.tsx while a page's data fetches. */
export function PageSkeleton({
  title,
  rows = 6,
}: {
  title: string;
  rows?: number;
}) {
  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[var(--shell-border)] bg-[var(--app-bg)]/95 px-7 backdrop-blur">
        <div>
          <div className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text)]">{title}</div>
          <div className="mt-1 h-3 w-24 animate-pulse rounded bg-[var(--divider)]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-[10px] bg-[var(--divider)]" />
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-[1320px] px-7 pb-16 pt-6">
          <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--card)]">
            {/* Header row */}
            <div className="flex gap-6 border-b border-[var(--row-divider)] px-6 py-3">
              {[40, 28, 20, 12].map((w) => (
                <div key={w} className={`h-3 w-${w} animate-pulse rounded bg-[var(--divider)]`} />
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex gap-6 border-b border-[var(--row-divider)] px-6 py-4 last:border-0">
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--divider)]" />
                <div className="h-3 w-40 animate-pulse rounded bg-[var(--divider)]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--divider)]" />
                <div className="ml-auto h-3 w-16 animate-pulse rounded bg-[var(--divider)]" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

/** KPI card skeleton for dashboard */
export function DashboardSkeleton() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[var(--shell-border)] bg-[var(--app-bg)]/95 px-7 backdrop-blur">
        <div>
          <div className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text)]">Dashboard</div>
          <div className="mt-1 h-3 w-32 animate-pulse rounded bg-[var(--divider)]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-[10px] bg-[var(--divider)]" />
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-[1320px] px-7 pb-16 pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-[18px]">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--divider)]" />
                <div className="mt-3 h-7 w-32 animate-pulse rounded bg-[var(--divider)]" />
                <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-[var(--divider)]" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.62fr_1fr]">
            <div className="h-64 animate-pulse rounded-[14px] border border-[var(--border)] bg-[var(--card)]" />
            <div className="h-64 animate-pulse rounded-[14px] border border-[var(--border)] bg-[var(--card)]" />
          </div>
        </div>
      </main>
    </>
  );
}
