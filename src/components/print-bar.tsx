"use client";

/** Floating action bar (hidden when printing) to trigger browser print-to-PDF. */
export function PrintBar({ downloadName }: { downloadName: string }) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[720px] items-center justify-between">
      <span className="text-[12px] text-[var(--text-dim)]">{downloadName}</span>
      <button
        onClick={() => window.print()}
        className="rounded-[10px] bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
