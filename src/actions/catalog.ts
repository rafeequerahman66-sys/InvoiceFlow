"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/validators";

export async function createCatalogItem(input: CatalogItemInput) {
  const data = catalogItemSchema.parse(input);
  await prisma.catalogItem.create({
    data: {
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
  await prisma.catalogItem.update({
    where: { id },
    data: {
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

export async function archiveCatalogItem(id: string) {
  await prisma.catalogItem.update({ where: { id }, data: { archived: true } });
  revalidatePath("/catalog");
}
