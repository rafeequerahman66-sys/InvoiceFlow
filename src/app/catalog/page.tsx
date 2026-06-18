export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Icon } from "@/components/icon";

export default async function CatalogPage() {
  const items = await prisma.catalogItem.findMany({ where: { archived: false }, orderBy: { name: "asc" } });

  return (
    <AppShell
      title="Products & Services"
      subtitle={`${items.length} items`}
      action={
        <ButtonLink href="/catalog/new" className="gap-1.5">
          <Icon name="plus" size={16} className="text-[var(--accent-ink)]" /> Add Item
        </ButtonLink>
      }
    >
      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>SAC / HSN</Th>
            <Th className="text-right">Default rate</Th>
            <Th className="text-right">GST %</Th>
          </Thead>
          <tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td className="font-semibold">
                  <Link href={`/catalog/${item.id}/edit`} className="text-[var(--accent)] hover:underline">
                    {item.name}
                  </Link>
                  {item.description && <div className="text-[12px] font-normal text-[var(--text-dim)]">{item.description}</div>}
                </Td>
                <Td>
                  <Badge tone={item.kind === "SERVICE" ? "blue" : "amber"}>{item.kind}</Badge>
                </Td>
                <Td className="font-mono text-[12px] text-[var(--text-dim)]">{item.sacCode ?? "—"}</Td>
                <Td className="text-right tnum">{formatMoney(Number(item.defaultRate))}</Td>
                <Td className="text-right text-[var(--text-mid)]">{Number(item.defaultTax)}%</Td>
              </Tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[13px] text-[var(--text-dim)]">
                  No items yet.{" "}
                  <Link href="/catalog/new" className="text-[var(--accent)] hover:underline">
                    Add one
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
