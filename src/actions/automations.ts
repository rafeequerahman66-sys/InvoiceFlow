"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { getMailer } from "@/lib/integrations/email";
import { generateDueRecurring } from "@/actions/recurring";

const DAY = 86400000;

export type ReminderResult = { remindersSent: number; overdueMarked: number };

/**
 * Send payment reminders for unpaid invoices and flip past-due ones to OVERDUE.
 * Idempotent per day: an invoice is reminded at most once in a 24h window.
 */
export async function sendDueReminders(now: Date = new Date()): Promise<ReminderResult> {
  const userId = await currentUserId();
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 3 * DAY);

  const open = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { client: true },
  });

  const mailer = getMailer();
  let remindersSent = 0;
  let overdueMarked = 0;
  const startOfToday = new Date(today + "T00:00:00.000Z");

  for (const inv of open) {
    const isOverdue = inv.dueDate.toISOString().slice(0, 10) < today;
    const dueSoon = !isOverdue && inv.dueDate <= soon;

    // Flip past-due SENT/PARTIALLY_PAID to OVERDUE.
    if (isOverdue && inv.status !== "OVERDUE") {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } });
      overdueMarked++;
    }
    if (!isOverdue && !dueSoon) continue;

    // Skip if already reminded today.
    const already = await prisma.activityLog.count({
      where: { entityId: inv.id, action: "invoice.reminder", createdAt: { gte: startOfToday } },
    });
    if (already > 0) continue;

    if (inv.client.email) {
      await mailer.send({
        to: inv.client.email,
        template: isOverdue ? "PAYMENT_REMINDER" : "DUE_REMINDER",
        data: { number: inv.number, clientName: inv.client.name },
      });
    }
    await prisma.activityLog.create({
      data: {
        actorId: userId,
        action: "invoice.reminder",
        entityType: "Invoice",
        entityId: inv.id,
        meta: JSON.stringify({ kind: isOverdue ? "overdue" : "due_soon", number: inv.number }),
      },
    });
    remindersSent++;
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/automations");
  return { remindersSent, overdueMarked };
}

export type AutomationSummary = { invoicesCreated: number } & ReminderResult;

/** Run all scheduled automations: due recurring invoices + payment reminders. */
export async function runAllAutomations(): Promise<AutomationSummary> {
  const invoicesCreated = await generateDueRecurring();
  const reminders = await sendDueReminders();
  return { invoicesCreated, ...reminders };
}
