/**
 * Email integration. Uses Resend (via its REST API — no SDK) when RESEND_API_KEY
 * is set; otherwise a console mailer that logs (so dev works with no keys, and
 * verification links are printed to the server console).
 *
 * Env: RESEND_API_KEY, EMAIL_FROM (e.g. "InvoiceFlow <noreply@yourdomain.com>";
 * defaults to Resend's onboarding sender for quick testing).
 */

export type EmailTemplate =
  | "VERIFY_EMAIL"
  | "INVOICE"
  | "QUOTE"
  | "PAYMENT_REMINDER"
  | "DUE_REMINDER"
  | "THANK_YOU";

export interface SendArgs {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  subject?: string;
}

export interface SendResult {
  id: string;
  delivered: boolean;
  provider: string;
}

export interface Mailer {
  send(args: SendArgs): Promise<SendResult>;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** Build subject + html/text for a template. */
function render(template: EmailTemplate, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  switch (template) {
    case "VERIFY_EMAIL": {
      const url = String(data.url ?? "");
      const name = data.name ? `, ${esc(data.name)}` : "";
      return {
        subject: "Verify your email · InvoiceFlow",
        text: `Welcome to InvoiceFlow${data.name ? `, ${data.name}` : ""}!\n\nConfirm your email to activate your account:\n${url}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
  <h2>Welcome to InvoiceFlow${name}</h2>
  <p>Confirm your email to activate your account.</p>
  <p><a href="${esc(url)}" style="display:inline-block;background:#f6d94e;color:#16140a;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:10px">Verify email</a></p>
  <p style="color:#6b707a;font-size:13px">Or paste this link: <br>${esc(url)}</p>
  <p style="color:#6b707a;font-size:12px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
</div>`,
      };
    }
    case "INVOICE":
    case "QUOTE": {
      const kind = template === "INVOICE" ? "invoice" : "quotation";
      return {
        subject: `Your ${kind} ${esc(data.number)} · Rin Media`,
        text: `Hi ${data.clientName ?? "there"}, please find ${kind} ${data.number} attached.`,
        html: `<p>Hi ${esc(data.clientName ?? "there")},</p><p>Please find ${kind} <b>${esc(data.number)}</b> attached.</p>`,
      };
    }
    case "PAYMENT_REMINDER":
    case "DUE_REMINDER": {
      const overdue = template === "PAYMENT_REMINDER";
      return {
        subject: `${overdue ? "Payment reminder" : "Invoice due soon"} · ${esc(data.number)}`,
        text: `Hi ${data.clientName ?? "there"}, invoice ${data.number} is ${overdue ? "overdue" : "due soon"}.`,
        html: `<p>Hi ${esc(data.clientName ?? "there")},</p><p>Invoice <b>${esc(data.number)}</b> is ${overdue ? "overdue" : "due soon"}.</p>`,
      };
    }
    case "THANK_YOU":
      return {
        subject: "Thank you for your payment",
        text: "Thanks — we've received your payment.",
        html: "<p>Thanks — we've received your payment.</p>",
      };
  }
}

class ConsoleMailer implements Mailer {
  async send({ to, template, data, subject }: SendArgs): Promise<SendResult> {
    const { subject: subj } = render(template, data);
    console.info(`[email:console] -> ${to} | ${subject ?? subj}` + (data.url ? ` | link: ${data.url}` : ""));
    return { id: `console_${Date.now()}`, delivered: false, provider: "console" };
  }
}

class ResendMailer implements Mailer {
  constructor(private apiKey: string, private from: string) {}
  async send({ to, template, data, subject }: SendArgs): Promise<SendResult> {
    const body = render(template, data);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to, subject: subject ?? body.subject, html: body.html, text: body.text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: json.id ?? "resend", delivered: true, provider: "resend" };
  }
}

export function getMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    return new ResendMailer(key, process.env.EMAIL_FROM ?? "InvoiceFlow <onboarding@resend.dev>");
  }
  return new ConsoleMailer();
}

export function defaultSubject(template: EmailTemplate): string {
  return render(template, {}).subject;
}
