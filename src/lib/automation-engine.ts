import "server-only";
import { prisma } from "@/lib/db";
import { nextNumber } from "@/lib/numbering";
import { getFxRateToInr } from "@/lib/fx";
import { computeInvoiceTotals, needsLutDeclaration, round2, type SupplyType } from "@/lib/tax";
import { getMailer } from "@/lib/integrations/email";

export type Cadence = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export function advanceByCadence(date: Date, cadence: Cadence): Date {
  const d = new Date(date);
  if (cadence === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (cadence === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (cadence === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  else if (cadence === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** Generate one DRAFT invoice from a recurring template (org-scoped). */
export async function generateOne(orgId: string, recurringId: string, issueDate: Date, userId: string): Promise<string> {
  const rec = await prisma.recurringInvoice.findFirstOrThrow({
    where: { id: recurringId, orgId },
    include: { items: true, client: true },
  });
  const items = rec.items.map((it) => ({ qty: Number(it.qty), rate: Number(it.rate), taxRate: Number(it.taxRate) }));
  const supplyType = rec.supplyType as SupplyType;
  const totals = computeInvoiceTotals(supplyType, items, {
    type: rec.discountType as "PERCENT" | "FLAT",
    value: Number(rec.discountValue),
  });
  const fxRate = await getFxRateToInr(rec.currency, issueDate);
  const totalInr = round2(totals.total * fxRate);
  const placeOfSupply =
    supplyType === "EXPORT_LUT" || supplyType === "EXPORT_WITH_TAX" ? "Export of services" : rec.client.stateCode ?? null;

  const invoice = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, orgId, "INVOICE", "INV", issueDate);
    return tx.invoice.create({
      data: {
        orgId,
        number,
        fyLabel,
        clientId: rec.clientId,
        status: "DRAFT",
        issueDate,
        dueDate: new Date(issueDate.getTime() + 15 * 86400000),
        currency: rec.currency,
        fxRateToInr: fxRate,
        supplyType,
        placeOfSupply,
        subtotal: totals.subtotal,
        discountType: rec.discountType,
        discountValue: rec.discountValue,
        taxableValue: totals.taxableValue,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        totalInr,
        notes: rec.notes,
        terms: rec.terms,
        lutDeclaration: needsLutDeclaration(supplyType),
        createdById: userId,
        items: {
          create: rec.items.map((it, idx) => ({
            name: it.name,
            description: it.description,
            sacCode: it.sacCode,
            qty: it.qty,
            rate: it.rate,
            taxRate: it.taxRate,
            lineSubtotal: totals.lines[idx].lineSubtotal,
            lineTax: totals.lines[idx].lineTax,
            lineTotal: totals.lines[idx].lineTotal,
          })),
        },
      },
    });
  });

  await prisma.activityLog.create({
    data: {
      orgId,
      actorId: userId,
      action: "recurring.generated",
      entityType: "RecurringInvoice",
      entityId: recurringId,
      meta: JSON.stringify({ invoiceId: invoice.id, number: invoice.number }),
    },
  });
  return invoice.id;
}

/** Generate invoices for every active template in an org whose nextRunDate passed. */
export async function generateDueForOrg(orgId: string, userId: string, now: Date = new Date()): Promise<number> {
  const due = await prisma.recurringInvoice.findMany({ where: { orgId, active: true, nextRunDate: { lte: now } } });
  let created = 0;
  for (const rec of due) {
    let runDate = new Date(rec.nextRunDate);
    let next = runDate;
    for (let i = 0; i < 24 && runDate <= now; i++) {
      await generateOne(orgId, rec.id, runDate, userId);
      created++;
      next = advanceByCadence(runDate, rec.cadence as Cadence);
      runDate = next;
    }
    await prisma.recurringInvoice.update({ where: { id: rec.id }, data: { lastRunAt: now, nextRunDate: next } });
  }
  return created;
}

const DAY = 86400000;
export type ReminderResult = { remindersSent: number; overdueMarked: number };

/** Send due/overdue reminders for an org (idempotent per day) and flip OVERDUE. */
export async function sendDueRemindersForOrg(orgId: string, userId: string | null, now: Date = new Date()): Promise<ReminderResult> {
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 3 * DAY);
  const startOfToday = new Date(today + "T00:00:00.000Z");

  // Batch: fetch open invoices + already-sent reminders today in one parallel shot
  const [open, sentToday] = await Promise.all([
    prisma.invoice.findMany({
      where: { orgId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      select: {
        id: true,
        number: true,
        status: true,
        dueDate: true,
        client: { select: { email: true, name: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { orgId, action: "invoice.reminder", createdAt: { gte: startOfToday } },
      select: { entityId: true },
    }),
  ]);

  // O(1) lookup — no per-invoice DB hit
  const alreadySent = new Set(sentToday.map((l) => l.entityId));

  const mailer = getMailer();
  let remindersSent = 0;
  let overdueMarked = 0;

  // Collect status updates + new logs to batch
  const overdueIds: string[] = [];
  const newLogs: { invoiceId: string; number: string; kind: "overdue" | "due_soon" }[] = [];
  const emailJobs: { email: string; template: "PAYMENT_REMINDER" | "DUE_REMINDER"; number: string; name: string }[] = [];

  for (const inv of open) {
    const isOverdue = inv.dueDate.toISOString().slice(0, 10) < today;
    const dueSoon = !isOverdue && inv.dueDate <= soon;

    if (isOverdue && inv.status !== "OVERDUE") overdueIds.push(inv.id);
    if (!isOverdue && !dueSoon) continue;
    if (alreadySent.has(inv.id)) continue;

    if (inv.client.email) {
      emailJobs.push({
        email: inv.client.email,
        template: isOverdue ? "PAYMENT_REMINDER" : "DUE_REMINDER",
        number: inv.number,
        name: inv.client.name,
      });
    }
    newLogs.push({ invoiceId: inv.id, number: inv.number, kind: isOverdue ? "overdue" : "due_soon" });
  }

  // Flush all DB writes + emails in parallel
  await Promise.all([
    overdueIds.length
      ? prisma.invoice.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } })
      : Promise.resolve(),
    newLogs.length
      ? prisma.activityLog.createMany({
          data: newLogs.map((l) => ({
            orgId,
            actorId: userId,
            action: "invoice.reminder",
            entityType: "Invoice",
            entityId: l.invoiceId,
            meta: JSON.stringify({ kind: l.kind, number: l.number }),
          })),
        })
      : Promise.resolve(),
    ...emailJobs.map((j) =>
      mailer.send({ to: j.email, template: j.template, data: { number: j.number, clientName: j.name } })
    ),
  ]);

  overdueMarked = overdueIds.length;
  remindersSent = newLogs.length;
  return { remindersSent, overdueMarked };
}

export type AutomationSummary = { invoicesCreated: number } & ReminderResult;

/** Cron entry: run automations for every org concurrently (owner as actor). */
export async function runAllOrgs(now: Date = new Date()): Promise<AutomationSummary> {
  const orgs = await prisma.organization.findMany({
    select: { id: true, memberships: { where: { role: "OWNER" }, select: { userId: true }, take: 1 } },
  });

  const results = await Promise.all(
    orgs.map(async (org) => {
      const ownerId = org.memberships[0]?.userId;
      if (!ownerId) return { invoicesCreated: 0, remindersSent: 0, overdueMarked: 0 };
      const [invoicesCreated, reminder] = await Promise.all([
        generateDueForOrg(org.id, ownerId, now),
        sendDueRemindersForOrg(org.id, ownerId, now),
      ]);
      return { invoicesCreated, ...reminder };
    })
  );

  return results.reduce(
    (acc, r) => ({
      invoicesCreated: acc.invoicesCreated + r.invoicesCreated,
      remindersSent: acc.remindersSent + r.remindersSent,
      overdueMarked: acc.overdueMarked + r.overdueMarked,
    }),
    { invoicesCreated: 0, remindersSent: 0, overdueMarked: 0 }
  );
}
