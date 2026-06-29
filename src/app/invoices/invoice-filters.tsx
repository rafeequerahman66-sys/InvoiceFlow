"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { fieldClasses } from "@/components/ui/input";

const STATUSES = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;

export function InvoiceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "ALL") next.set(key, value);
      else next.delete(key);
      if (key !== "q") next.delete("q");
      router.replace(`${pathname}?${next.toString()}`);
    },
    [router, pathname, params]
  );

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "ALL";

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <input
        type="search"
        placeholder="Search invoice # or client…"
        className={fieldClasses("w-56")}
        defaultValue={q}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set("q", e.target.value);
          else next.delete("q");
          router.replace(`${pathname}?${next.toString()}`);
        }}
      />
      <select
        className={fieldClasses("w-40")}
        value={status}
        onChange={(e) => update("status", e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === "ALL" ? "All statuses" : s.replace("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
