"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldClasses } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addMember, removeMember } from "@/actions/org";

type Member = { id: string; name: string | null; email: string; role: string; isYou: boolean };

export function TeamManager({ canManage, members }: { canManage: boolean; members: Member[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await addMember(String(fd.get("email")), fd.get("role") as "ADMIN" | "MEMBER" | "VIEWER");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this member?")) return;
    setBusy(true);
    try {
      await removeMember(id);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-[var(--row-divider)]">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2.5 text-[13px]">
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">
                {m.name ?? m.email} {m.isYou && <span className="text-[var(--text-dim)]">(you)</span>}
              </div>
              <div className="truncate text-[12px] text-[var(--text-dim)]">{m.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={m.role === "OWNER" ? "green" : m.role === "ADMIN" ? "blue" : "gray"}>{m.role}</Badge>
              {canManage && m.role !== "OWNER" && !m.isYou && (
                <button onClick={() => remove(m.id)} disabled={busy} className="text-[12px] text-[var(--negative)] hover:underline">
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-t border-[var(--divider)] pt-3">
          <input name="email" type="email" required placeholder="teammate@email.com" className={fieldClasses("min-w-0 flex-1")} />
          <select name="role" defaultValue="MEMBER" className={fieldClasses("")}>
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <Button type="submit" size="sm" disabled={busy}>
            Add
          </Button>
        </form>
      )}
      {!canManage && <p className="text-[12px] text-[var(--text-dim)]">Only owners and admins can manage the team.</p>}
      {msg && <p className="text-[12.5px] text-[var(--negative)]">{msg}</p>}
      <p className="text-[11.5px] text-[var(--text-faint)]">
        Members must already have an InvoiceFlow account. Email invitations are coming soon.
      </p>
    </div>
  );
}
