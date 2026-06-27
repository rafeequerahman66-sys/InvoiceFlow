"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/validators";

export async function createCatalogItem(input: CatalogItemInput) {
  const data = catalogItemSchema.parse(input);
  const { orgId } = await requireOrg("MEMBER");
  await prisma.catalogItem.create({
    data: {
      orgId,
      name: data.name,
      description: data.description ?? null,
      kind: data.kind,
      sacCode: data.sacCode ?? null,
      defaultRate: data.defaultRate,
      defaultTax: data.defaultTax,
    },
  });
  revalidatePath("/catalog");
  redirect("/catalog");
}

export async function updateCatalogItem(id: string, input: CatalogItemInput) {
  const data = catalogItemSchema.parse(input);
  const { orgId } = await requireOrg("MEMBER");
  const res = await prisma.catalogItem.updateMany({
    where: { id, orgId },
    data: {
      name: data.name,
      description: data.description ?? null,
      kind: data.kind,
      sacCode: data.sacCode ?? null,
      defaultRate: data.defaultRate,
      defaultTax: data.defaultTax,
    },
  });
  if (res.count === 0) throw new Error("Item not found");
  revalidatePath("/catalog");
  redirect("/catalog");
}

export async function archiveCatalogItem(id: string) {
  const { orgId } = await requireOrg("MEMBER");
  await prisma.catalogItem.updateMany({ where: { id, orgId }, data: { archived: true } });
  revalidatePath("/catalog");
}
