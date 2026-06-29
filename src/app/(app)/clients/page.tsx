export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Icon } from "@/components/icon";
import { requireOrg } from "@/lib/tenant";
import { ClientSearch } from "./client-search";
import { Suspense } from "react";

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", US: "USA", GB: "UK", DE: "Germany", AE: "UAE",
  SG: "Singapore", AU: "Australia", CA: "Canada",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgId } = await requireOrg();
  const { q } = await searchParams;
  const clients = await prisma.client.findMany({ where: { orgId, archived: false }, orderBy: { name: "asc" } });

  const filtered = q
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.company ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (c.gstin ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : clients;

  return (
    <AppShell
      title="Clients"
      subtitle={`${filtered.length} of ${clients.length}`}
      action={
        <ButtonLink href="/clients/new" className="gap-1.5">
          <Icon name="plus" size={16} className="text-[var(--accent-ink)]" /> New Client
        </ButtonLink>
      }
    >
      <Suspense>
        <ClientSearch />
      </Suspense>
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
            {filtered.map((c) => (
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[13px] text-[var(--text-dim)]">
                  {clients.length === 0 ? (
                    <>
                      No clients yet.{" "}
                      <Link href="/clients/new" className="text-[var(--accent)] hover:underline">
                        Add your first client
                      </Link>
                      .
                    </>
                  ) : (
                    "No clients match the search."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
