"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { fieldClasses } from "@/components/ui/input";

export function ClientSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <div className="mb-4">
      <input
        type="search"
        placeholder="Search by name, company or GSTIN…"
        className={fieldClasses("w-72")}
        defaultValue={q}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set("q", e.target.value);
          else next.delete("q");
          router.replace(`${pathname}?${next.toString()}`);
        }}
      />
    </div>
  );
}
