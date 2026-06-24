"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateDueRecurring } from "@/actions/recurring";
import { sendDueReminders } from "@/actions/automations";

export function AutomationsRunner() {
  const [busy, setBusy] = useState<null | "recurring" | "reminders">(null);
  const [msg, setMsg] = useState<string>("");
  const router = useRouter();

  async function runRecurring() {
    setBusy("recurring");
    setMsg("");
    try {
      const n = await generateDueRecurring();
      setMsg(n > 0 ? `Generated ${n} invoice${n === 1 ? "" : "s"} from due templates.` : "No templates were due.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runReminders() {
    setBusy("reminders");
    setMsg("");
    try {
      const r = await sendDueReminders();
      setMsg(`Sent ${r.remindersSent} reminder${r.remindersSent === 1 ? "" : "s"}; marked ${r.overdueMarked} overdue.`);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button onClick={runRecurring} disabled={busy !== null}>
        {busy === "recurring" ? "Running…" : "Generate due invoices"}
      </Button>
      <Button variant="secondary" onClick={runReminders} disabled={busy !== null}>
        {busy === "reminders" ? "Sending…" : "Send reminders"}
      </Button>
      {msg && <span className="text-[12.5px] text-[var(--text-mid)]">{msg}</span>}
    </div>
  );
}
