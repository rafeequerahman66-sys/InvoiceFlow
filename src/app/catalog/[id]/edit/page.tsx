export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { CatalogForm } from "../../catalog-form";
import { requireOrg } from "@/lib/tenant";

export default async function EditCatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireOrg("MEMBER");
  const item = await prisma.catalogItem.findFirst({ where: { id, orgId } });
  if (!item) notFound();

  return (
    <AppShell title="Edit Item" subtitle={item.name} action={null}>
      <CatalogForm
        mode="edit"
        itemId={item.id}
        initial={{
          name: item.name,
          description: item.description ?? undefined,
          kind: item.kind as "SERVICE" | "PRODUCT",
          sacCode: item.sacCode ?? undefined,
          defaultRate: Number(item.defaultRate),
          defaultTax: Number(item.defaultTax),
        }}
      />
    </AppShell>
  );
}
