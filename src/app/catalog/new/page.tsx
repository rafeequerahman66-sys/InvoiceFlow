import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CatalogForm } from "../catalog-form";

export default function NewCatalogItemPage() {
  return (
    <AppShell title="New Item" subtitle="Product or service" action={null}>
      <Link href="/catalog" className="mb-4 inline-block text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Products
      </Link>
      <CatalogForm />
    </AppShell>
  );
}
