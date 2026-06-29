import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClientForm } from "./client-form";

export default function NewClientPage() {
  return (
    <AppShell title="New Client" subtitle="Add a customer" action={null}>
      <Link href="/clients" className="mb-4 inline-block text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Clients
      </Link>
      <div className="max-w-2xl">
        <ClientForm />
      </div>
    </AppShell>
  );
}
