"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCatalogItem, updateCatalogItem } from "@/actions/catalog";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CatalogInitial = {
  name: string;
  description?: string;
  kind: "SERVICE" | "PRODUCT";
  sacCode?: string;
  defaultRate: number;
  defaultTax: number;
};

export function CatalogForm({
  mode = "create",
  itemId,
  initial,
}: {
  mode?: "create" | "edit";
  itemId?: string;
  initial?: CatalogInitial;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const payload = {
      name: get("name"),
      description: get("description") || undefined,
      kind: (get("kind") || "SERVICE") as "SERVICE" | "PRODUCT",
      sacCode: get("sacCode") || undefined,
      defaultRate: Number(get("defaultRate") || 0),
      defaultTax: Number(get("defaultTax") || 18),
    };
    try {
      if (mode === "edit" && itemId) await updateCatalogItem(itemId, payload);
      else await createCatalogItem(payload);
    } catch (err) {
      alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6"
    >
      <div>
        <Label>Name *</Label>
        <input name="name" required className={fieldClasses("w-full")} placeholder="Cinematic brand film (60s)" defaultValue={initial?.name} />
      </div>
      <div>
        <Label>Description</Label>
        <textarea name="description" rows={2} className={fieldClasses("w-full")} defaultValue={initial?.description} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Kind</Label>
          <select name="kind" className={fieldClasses("w-full")} defaultValue={initial?.kind ?? "SERVICE"}>
            <option value="SERVICE">Service</option>
            <option value="PRODUCT">Product</option>
          </select>
        </div>
        <div>
          <Label>SAC / HSN code</Label>
          <input name="sacCode" className={fieldClasses("w-full")} placeholder="998361" defaultValue={initial?.sacCode} />
        </div>
        <div>
          <Label>Default rate (₹)</Label>
          <input name="defaultRate" type="number" min={0} step="0.01" className={fieldClasses("w-full")} defaultValue={initial?.defaultRate ?? 0} />
        </div>
        <div>
          <Label>Default GST %</Label>
          <input name="defaultTax" type="number" min={0} max={28} className={fieldClasses("w-full")} defaultValue={initial?.defaultTax ?? 18} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : mode === "edit" ? "Update item" : "Save item"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
