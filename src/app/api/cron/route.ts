import { NextRequest, NextResponse } from "next/server";
import { runAllAutomations } from "@/actions/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Automations endpoint for an external scheduler (cron / Vercel Cron / uptime
 * ping). Runs due recurring invoices + payment reminders.
 *
 * If CRON_SECRET is set, require ?key=<secret>; otherwise open (personal/local).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.nextUrl.searchParams.get("key") !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const summary = await runAllAutomations();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
