export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { ClientForm } from "../../new/client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <AppShell title="Edit Client" subtitle={client.company ?? client.name} action={null}>
      <div className="max-w-2xl">
        <ClientForm
          mode="edit"
          clientId={client.id}
          initial={{
            name: client.name,
            company: client.company ?? undefined,
            email: client.email ?? undefined,
            phone: client.phone ?? undefined,
            billingAddress: client.billingAddress ?? undefined,
            country: client.country,
            stateCode: client.stateCode ?? undefined,
            gstin: client.gstin ?? undefined,
            defaultCurrency: client.defaultCurrency,
            notes: client.notes ?? undefined,
          }}
        />
      </div>
    </AppShell>
  );
}
