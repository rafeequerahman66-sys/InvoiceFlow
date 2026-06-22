import type { TxClient } from "@/lib/db";

export type DocType = "INVOICE" | "QUOTE";

/**
 * Indian financial year runs April–March. An invoice issued in June 2026 falls
 * in FY "2026-27"; one issued in February 2027 also falls in "2026-27".
 */
export function fyLabelFor(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = Jan
  const start = m >= 3 ? y : y - 1; // April (index 3) starts the FY
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * Allocate the next gapless number for a doc type within a financial year.
 * MUST be called inside a transaction so concurrent saves can't collide.
 * Returns e.g. "INV/2026-27/0007".
 */
export async function nextNumber(
  tx: TxClient,
  docType: DocType,
  prefix: string,
  issueDate: Date
): Promise<{ number: string; fyLabel: string }> {
  const fyLabel = fyLabelFor(issueDate);
  const seq = await tx.numberSequence.upsert({
    where: { docType_fyLabel: { docType, fyLabel } },
    create: { docType, fyLabel, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  const number = `${prefix}/${fyLabel}/${String(seq.lastNumber).padStart(4, "0")}`;
  return { number, fyLabel };
}
