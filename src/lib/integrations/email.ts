/**
 * Email integration — stubbed behind an interface so a real provider
 * (Resend, SendGrid, SES) drops in later without touching call sites.
 *
 * Select the implementation with EMAIL_PROVIDER; defaults to a console mailer
 * that logs instead of sending, so the app works end-to-end with no keys.
 */

export type EmailTemplate =
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

const SUBJECTS: Record<EmailTemplate, string> = {
  INVOICE: "Your invoice from Rin Media",
  QUOTE: "Your quotation from Rin Media",
  PAYMENT_REMINDER: "Payment reminder",
  DUE_REMINDER: "Invoice due soon",
  THANK_YOU: "Thank you for your payment",
};

/** No-op mailer: logs to the server console, never sends. Safe default. */
class ConsoleMailer implements Mailer {
  async send({ to, template, data, subject }: SendArgs): Promise<SendResult> {
    const id = `mock_${template.toLowerCase()}_${Date.now()}`;
    console.info(
      `[email:stub] -> ${to} | ${subject ?? SUBJECTS[template]} | ${JSON.stringify(data)}`
    );
    return { id, delivered: false, provider: "console" };
  }
}

// Future: class ResendMailer implements Mailer { ... } selected via env.
export function getMailer(): Mailer {
  switch (process.env.EMAIL_PROVIDER) {
    // case "resend": return new ResendMailer(process.env.RESEND_API_KEY!);
    default:
      return new ConsoleMailer();
  }
}

export function defaultSubject(template: EmailTemplate): string {
  return SUBJECTS[template];
}
