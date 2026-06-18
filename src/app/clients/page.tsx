export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Icon } from "@/components/icon";

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", US: "USA", GB: "UK", DE: "Germany", AE: "UAE",
  SG: "Singapore", AU: "Australia", CA: "Canada",
};

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } });

  return (
    <AppShell
      title="Clients"
      subtitle={`${clients.length} total`}
      action={
        <ButtonLink href="/clients/new" className="gap-1.5">
          <Icon name="plus" size={16} className="text-[var(--accent-ink)]" /> New Client
        </ButtonLink>
      }
    >
      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <Th>Name</Th>
            <Th>Company</Th>
            <Th>Country</Th>
            <Th>Currency</Th>
            <Th>GSTIN</Th>
            <Th>Email</Th>
          </Thead>
          <tbody>
            {clients.map((c) => (
              <Tr key={c.id}>
                <Td className="font-semibold">
                  <Link href={`/clients/${c.id}`} className="text-[var(--accent)] hover:underline">
                    {c.name}
                  </Link>
                </Td>
                <Td className="text-[var(--text-mid)]">{c.company ?? "—"}</Td>
                <Td className="text-[var(--text-dim)]">{COUNTRY_NAMES[c.country] ?? c.country}</Td>
                <Td className="text-[var(--text-dim)]">{c.defaultCurrency}</Td>
                <Td className="font-mono text-[12px] text-[var(--text-dim)]">{c.gstin ?? "—"}</Td>
                <Td className="text-[var(--text-dim)]">{c.email ?? "—"}</Td>
              </Tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[13px] text-[var(--text-dim)]">
                  No clients yet.{" "}
                  <Link href="/clients/new" className="text-[var(--accent)] hover:underline">
                    Add your first client
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
