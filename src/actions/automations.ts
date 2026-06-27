"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { sendDueRemindersForOrg, type ReminderResult } from "@/lib/automation-engine";

/** UI action: send due/overdue reminders for the current org. */
export async function sendDueReminders(): Promise<ReminderResult> {
  const { userId, orgId } = await requireOrg("MEMBER");
  const res = await sendDueRemindersForOrg(orgId, userId);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/automations");
  return res;
}
