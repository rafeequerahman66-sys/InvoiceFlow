"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { clientSchema, type ClientInput } from "@/lib/validators";

export async function createClient(input: ClientInput) {
  const data = clientSchema.parse(input);
  const { orgId } = await requireOrg("MEMBER");
  const client = await prisma.client.create({
    data: { ...data, email: data.email || null, orgId },
  });
  revalidatePath("/clients");
  return client.id;
}

export async function updateClient(id: string, input: ClientInput) {
  const data = clientSchema.parse(input);
  const { orgId } = await requireOrg("MEMBER");
  const res = await prisma.client.updateMany({
    where: { id, orgId },
    data: { ...data, email: data.email || null },
  });
  if (res.count === 0) throw new Error("Client not found");
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function archiveClient(id: string) {
  const { orgId } = await requireOrg("MEMBER");
  await prisma.client.updateMany({ where: { id, orgId }, data: { archived: true } });
  revalidatePath("/clients");
}

/** Hard-delete only when the client has no invoices/quotes; otherwise archive. */
export async function deleteClient(id: string) {
  const { orgId } = await requireOrg("MEMBER");
  const client = await prisma.client.findFirst({ where: { id, orgId } });
  if (!client) throw new Error("Client not found");
  const [invoices, quotes] = await Promise.all([
    prisma.invoice.count({ where: { clientId: id } }),
    prisma.quotation.count({ where: { clientId: id } }),
  ]);
  if (invoices > 0 || quotes > 0) {
    throw new Error("This client has documents on record. Archive it instead of deleting.");
  }
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
}
