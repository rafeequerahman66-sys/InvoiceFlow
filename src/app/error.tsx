"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Catches server/client exceptions in pages
 * (e.g. a transient Supabase connection drop, P1001) and shows a friendly,
 * themed screen with a retry instead of the raw white error page.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] bg-[var(--card-inset)] text-[22px] text-[var(--accent)]">
          ⚠
        </div>
        <h1 className="text-[16px] font-bold text-[var(--text)]">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] text-[var(--text-dim)]">
          We couldn&apos;t load this page — usually a brief hiccup reaching the database. Please try again in a moment.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-[10px] bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
        >
          Try again
        </button>
        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-[var(--text-faint)]">ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
