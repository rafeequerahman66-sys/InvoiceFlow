"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { bankAccountSchema, type BankAccountInput } from "@/lib/validators";

/** If this account is marked default, clear the flag on the org's other accounts. */
async function clearOtherDefaults(orgId: string, exceptId?: string) {
  await prisma.bankAccount.updateMany({
    where: { orgId, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { isDefault: false },
  });
}

export async function createBankAccount(input: BankAccountInput) {
  const data = bankAccountSchema.parse(input);
  const { orgId } = await requireOrg("ADMIN");
  // First account is always the default; honor an explicit default too.
  const count = await prisma.bankAccount.count({ where: { orgId, archived: false } });
  const isDefault = data.isDefault || count === 0;
  if (isDefault) await clearOtherDefaults(orgId);
  await prisma.bankAccount.create({
    data: {
      orgId,
      label: data.label,
      bankName: data.bankName,
      accountName: data.accountName || null,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc || null,
      swift: data.swift || null,
      upi: data.upi || null,
      branch: data.branch || null,
      isDefault,
    },
  });
  revalidatePath("/settings");
}

export async function updateBankAccount(id: string, input: BankAccountInput) {
  const data = bankAccountSchema.parse(input);
  const { orgId } = await requireOrg("ADMIN");
  const acct = await prisma.bankAccount.findFirst({ where: { id, orgId } });
  if (!acct) throw new Error("Bank account not found");
  if (data.isDefault) await clearOtherDefaults(orgId, id);
  await prisma.bankAccount.update({
    where: { id },
    data: {
      label: data.label,
      bankName: data.bankName,
      accountName: data.accountName || null,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc || null,
      swift: data.swift || null,
      upi: data.upi || null,
      branch: data.branch || null,
      // Keep the existing default if this account already was the default.
      isDefault: data.isDefault || acct.isDefault,
    },
  });
  revalidatePath("/settings");
}

export async function setDefaultBankAccount(id: string) {
  const { orgId } = await requireOrg("ADMIN");
  const acct = await prisma.bankAccount.findFirst({ where: { id, orgId } });
  if (!acct) throw new Error("Bank account not found");
  await clearOtherDefaults(orgId, id);
  await prisma.bankAccount.update({ where: { id }, data: { isDefault: true } });
  revalidatePath("/settings");
}

export async function deleteBankAccount(id: string) {
  const { orgId } = await requireOrg("ADMIN");
  const acct = await prisma.bankAccount.findFirst({ where: { id, orgId } });
  if (!acct) throw new Error("Bank account not found");
  const used = await prisma.invoice.count({ where: { bankAccountId: id } });
  if (used > 0) {
    // Referenced by invoices — archive to preserve historical PDFs instead of deleting.
    await prisma.bankAccount.update({ where: { id }, data: { archived: true, isDefault: false } });
  } else {
    await prisma.bankAccount.delete({ where: { id } });
  }
  // If we removed the default, promote another account so invoices still have one.
  if (acct.isDefault) {
    const next = await prisma.bankAccount.findFirst({
      where: { orgId, archived: false },
      orderBy: { createdAt: "asc" },
    });
    if (next) await prisma.bankAccount.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/settings");
}
