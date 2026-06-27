"use client";

import { useTransition } from "react";
import { setActiveOrg } from "@/actions/org";

export function OrgSwitcher({
  orgs,
  activeId,
  activeName,
}: {
  orgs: { id: string; name: string }[];
  activeId: string;
  activeName: string;
}) {
  const [pending, start] = useTransition();

  if (orgs.length <= 1) {
    return <div className="truncate text-[13px] font-semibold text-[var(--text)]">{activeName}</div>;
  }

  return (
    <select
      aria-label="Switch organization"
      disabled={pending}
      value={activeId}
      onChange={(e) => start(() => setActiveOrg(e.target.value))}
      className="w-full rounded-[8px] border border-[var(--border-2)] bg-[var(--card-inset)] px-2 py-1.5 text-[13px] font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)]"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
