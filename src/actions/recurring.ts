"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { resolveSupplyType, type SupplyType } from "@/lib/tax";
import { advanceByCadence, generateOne, generateDueForOrg, type Cadence } from "@/lib/automation-engine";
import { createRecurringSchema, type CreateRecurringInput } from "@/lib/validators";

export async function createRecurring(input: CreateRecurringInput) {
  const data = createRecurringSchema.parse(input);
  const { userId, orgId } = await requireOrg("MEMBER");
  const client = await prisma.client.findFirst({ where: { id: data.clientId, orgId } });
  if (!client) throw new Error("Client not found");
  const supplyType: SupplyType =
    data.supplyType ?? resolveSupplyType({ country: client.country, stateCode: client.stateCode });

  await prisma.recurringInvoice.create({
    data: {
      orgId,
      title: data.title ?? null,
      clientId: client.id,
      cadence: data.cadence,
      nextRunDate: data.nextRunDate,
      currency: data.currency,
      supplyType,
      discountType: data.discountType,
      discountValue: data.discountValue,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      createdById: userId,
      items: {
        create: data.items.map((it) => ({
          name: it.name,
          description: it.description ?? null,
          sacCode: it.sacCode ?? null,
          qty: it.qty,
          rate: it.rate,
          taxRate: it.taxRate,
        })),
      },
    },
  });

  revalidatePath("/automations");
  redirect("/automations");
}

export async function toggleRecurring(id: string) {
  const { orgId } = await requireOrg("MEMBER");
  const r = await prisma.recurringInvoice.findFirst({ where: { id, orgId } });
  if (!r) throw new Error("Template not found");
  await prisma.recurringInvoice.update({ where: { id }, data: { active: !r.active } });
  revalidatePath("/automations");
}

export async function deleteRecurring(id: string) {
  const { orgId } = await requireOrg("MEMBER");
  const r = await prisma.recurringInvoice.findFirst({ where: { id, orgId } });
  if (!r) throw new Error("Template not found");
  await prisma.recurringInvoice.delete({ where: { id } });
  revalidatePath("/automations");
}

export async function runRecurringNow(id: string) {
  const { userId, orgId } = await requireOrg("MEMBER");
  const rec = await prisma.recurringInvoice.findFirst({ where: { id, orgId } });
  if (!rec) throw new Error("Template not found");
  const invoiceId = await generateOne(orgId, id, new Date(), userId);
  await prisma.recurringInvoice.update({
    where: { id },
    data: { lastRunAt: new Date(), nextRunDate: advanceByCadence(rec.nextRunDate, rec.cadence as Cadence) },
  });
  revalidatePath("/automations");
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

/** UI action: generate due invoices for the current org. */
export async function generateDueRecurring(): Promise<number> {
  const { userId, orgId } = await requireOrg("MEMBER");
  const n = await generateDueForOrg(orgId, userId);
  revalidatePath("/automations");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return n;
}
