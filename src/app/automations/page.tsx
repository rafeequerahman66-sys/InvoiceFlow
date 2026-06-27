export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { AutomationsRunner } from "./automations-runner";
import { RecurringForm } from "./recurring-form";
import { RecurringRowActions } from "./recurring-actions";
import { requireOrg } from "@/lib/tenant";

const CADENCE_LABEL = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export default async function AutomationsPage() {
  const { orgId } = await requireOrg();
  const [templates, clients, catalog] = await Promise.all([
    prisma.recurringInvoice.findMany({ where: { orgId }, include: { client: true, items: true }, orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ where: { orgId, archived: false }, orderBy: { name: "asc" } }),
    prisma.catalogItem.findMany({ where: { orgId, archived: false } }),
  ]);

  return (
    <AppShell title="Automations" subtitle="Recurring invoices & reminders" action={null}>
      <Card className="mb-4">
        <CardHeader>Run now</CardHeader>
        <CardBody className="space-y-3">
          <p className="text-[12.5px] text-[var(--text-dim)]">
            Generate invoices from any due recurring templates, and send payment reminders for due-soon / overdue
            invoices. An external scheduler can hit <code className="font-mono text-[var(--text-mid)]">/api/cron</code> to
            run both automatically.
          </p>
          <AutomationsRunner />
        </CardBody>
      </Card>

      <Card className="mb-4 overflow-hidden">
        <CardHeader>Recurring templates</CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Th>Title / Client</Th>
              <Th>Cadence</Th>
              <Th>Next run</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <tbody>
              {templates.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <div className="font-medium text-[var(--text)]">{t.title ?? "Untitled"}</div>
                    <div className="text-[12px] text-[var(--text-dim)]">{t.client.company ?? t.client.name}</div>
                  </Td>
                  <Td className="text-[var(--text-mid)]">{CADENCE_LABEL(t.cadence)}</Td>
                  <Td className="text-[var(--text-mid)]">{t.nextRunDate.toISOString().slice(0, 10)}</Td>
                  <Td>
                    <Badge tone={t.active ? "green" : "gray"}>{t.active ? "ACTIVE" : "PAUSED"}</Badge>
                  </Td>
                  <Td>
                    <RecurringRowActions id={t.id} active={t.active} />
                  </Td>
                </Tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[13px] text-[var(--text-dim)]">
                    No recurring templates yet — create one below.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {clients.length === 0 ? (
        <Card>
          <CardBody className="text-[13px] text-[var(--text-dim)]">Add a client first to create a recurring template.</CardBody>
        </Card>
      ) : (
        <RecurringForm
          clients={clients.map((c) => ({
            id: c.id,
            label: c.company ?? c.name,
            country: c.country,
            stateCode: c.stateCode,
            currency: c.defaultCurrency,
          }))}
          catalog={catalog.map((p) => ({ id: p.id, name: p.name, rate: Number(p.defaultRate), tax: Number(p.defaultTax) }))}
        />
      )}
    </AppShell>
  );
}
