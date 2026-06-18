"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { clientSchema, type ClientInput } from "@/lib/validators";

export async function createClient(input: ClientInput) {
  const data = clientSchema.parse(input);
  const client = await prisma.client.create({
    data: { ...data, email: data.email || null },
  });
  revalidatePath("/clients");
  return client.id;
}

export async function updateClient(id: string, input: ClientInput) {
  const data = clientSchema.parse(input);
  await prisma.client.update({
    where: { id },
    data: { ...data, email: data.email || null },
  });
  revalidatePath("/clients");
}

export async function archiveClient(id: string) {
  await prisma.client.update({ where: { id }, data: { archived: true } });
  revalidatePath("/clients");
}

/** Hard-delete only when the client has no invoices/quotes; otherwise archive. */
export async function deleteClient(id: string) {
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
