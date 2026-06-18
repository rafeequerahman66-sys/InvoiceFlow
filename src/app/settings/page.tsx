export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default async function SettingsPage() {
  const profile = await prisma.businessProfile.findUnique({ where: { id: "rinmedia" } });

  const rows: [string, string][] = [
    ["Legal name", profile?.legalName ?? "—"],
    ["Brand name", profile?.brandName ?? "—"],
    ["GSTIN", profile?.gstin ?? "—"],
    ["State code", profile?.stateCode ?? "—"],
    ["Email", profile?.email ?? "—"],
    ["Invoice prefix", profile?.invoicePrefix ?? "INV"],
    ["Quote prefix", profile?.quotePrefix ?? "QT"],
    ["Bank", profile?.bankName ?? "—"],
    ["IFSC", profile?.ifsc ?? "—"],
  ];

  return (
    <AppShell title="Settings" subtitle="Company profile & preferences" action={null}>
      <div className="max-w-2xl">
        <Card>
          <CardHeader>Company Profile</CardHeader>
          <CardBody className="divide-y divide-[var(--row-divider)]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5 text-[13px]">
                <span className="text-[var(--text-soft)]">{k}</span>
                <span className="font-medium text-[var(--text)]">{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <p className="mt-3 text-[12px] text-[var(--text-dim)]">
          Editable Company / Branding / Tax & GST tabs are on the roadmap. Values currently come from the seeded
          business profile.
        </p>
      </div>
    </AppShell>
  );
}
