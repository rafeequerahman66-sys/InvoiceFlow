export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { BankAccountsManager } from "@/app/(app)/settings/bank-accounts-manager";
import { buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/icon";

export default async function BankAccountsPage() {
  const { orgId, role } = await requireOrg();
  const canManage = role === "OWNER" || role === "ADMIN";

  const accounts = await prisma.bankAccount.findMany({
    where: { orgId },
    orderBy: { isDefault: "desc" },
    select: {
      id: true,
      label: true,
      bankName: true,
      accountName: true,
      accountNumber: true,
      ifsc: true,
      swift: true,
      upi: true,
      branch: true,
      isDefault: true,
    },
  });

  return (
    <AppShell
      title="Bank Accounts"
      subtitle="Manage accounts shown on invoices"
      action={undefined}
    >
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span>Your Bank Accounts</span>
              <span className="text-[12px] font-normal text-[var(--text-dim)]">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <BankAccountsManager canManage={canManage} accounts={accounts} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>How bank accounts work</CardHeader>
          <CardBody>
            <ul className="space-y-2 text-[12.5px] text-[var(--text-dim)]">
              <li className="flex gap-2">
                <span className="mt-0.5 text-[var(--accent)]">→</span>
                The <strong className="text-[var(--text-mid)]">default</strong> account prints automatically on every new invoice.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[var(--accent)]">→</span>
                You can override the account on individual invoices.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[var(--accent)]">→</span>
                Deleting an account does not affect invoices already sent.
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
