export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireOrg, hasRole } from "@/lib/tenant";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OrgSettingsForm } from "./org-settings-form";
import { TeamManager } from "./team-manager";
import { BankAccountsManager } from "./bank-accounts-manager";

export default async function SettingsPage() {
  const ctx = await requireOrg();
  const [org, members, bankAccounts] = await Promise.all([
    prisma.organization.findUnique({ where: { id: ctx.orgId } }),
    prisma.membership.findMany({ where: { orgId: ctx.orgId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.bankAccount.findMany({
      where: { orgId: ctx.orgId, archived: false },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!org) return null;

  const canManage = hasRole(ctx.role, "ADMIN");

  return (
    <AppShell title="Settings" subtitle="Company profile & team" action={null}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Company profile</CardHeader>
          <CardBody>
            <OrgSettingsForm
              canEdit={canManage}
              initial={{
                name: org.name,
                legalName: org.legalName ?? "",
                gstin: org.gstin ?? "",
                stateCode: org.stateCode,
                address: org.address ?? "",
                email: org.email ?? "",
                phone: org.phone ?? "",
                bankName: org.bankName ?? "",
                bankAccount: org.bankAccount ?? "",
                ifsc: org.ifsc ?? "",
                lutNumber: org.lutNumber ?? "",
                invoicePrefix: org.invoicePrefix,
                quotePrefix: org.quotePrefix,
              }}
            />
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader>Team</CardHeader>
          <CardBody>
            <TeamManager
              canManage={canManage}
              members={members.map((m) => ({
                id: m.id,
                name: m.user.name,
                email: m.user.email,
                role: m.role,
                isYou: m.user.email === ctx.userEmail,
              }))}
            />
          </CardBody>
        </Card>

        <Card className="h-fit lg:col-span-2">
          <CardHeader>Bank accounts</CardHeader>
          <CardBody>
            <BankAccountsManager
              canManage={canManage}
              accounts={bankAccounts.map((b) => ({
                id: b.id,
                label: b.label,
                bankName: b.bankName,
                accountName: b.accountName,
                accountNumber: b.accountNumber,
                ifsc: b.ifsc,
                swift: b.swift,
                upi: b.upi,
                branch: b.branch,
                isDefault: b.isDefault,
              }))}
            />
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
