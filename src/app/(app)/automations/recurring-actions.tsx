"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleRecurring, deleteRecurring, runRecurringNow } from "@/actions/recurring";

export function RecurringRowActions({ id, active }: { id: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const run = (fn: () => Promise<unknown>) => () => {
    setBusy(true);
    fn()
      .then(() => router.refresh())
      .catch((e) => alert((e as Error).message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex justify-end gap-3 text-[12.5px]">
      <button disabled={busy} onClick={run(() => runRecurringNow(id))} className="font-semibold text-[var(--accent)] hover:underline">
        Run now
      </button>
      <button disabled={busy} onClick={run(() => toggleRecurring(id))} className="text-[var(--text-mid)] hover:text-[var(--text)]">
        {active ? "Pause" : "Resume"}
      </button>
      <button
        disabled={busy}
        onClick={() => {
          if (confirm("Delete this recurring template?")) run(() => deleteRecurring(id))();
        }}
        className="text-[var(--negative)] hover:underline"
      >
        Delete
      </button>
    </div>
  );
}
