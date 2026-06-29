"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icon";

type NavLink = { type: "link"; href: string; label: string; icon: IconName };
type NavGroup = {
  type: "group";
  label: string;
  icon: IconName;
  badge?: string;
  basePath: string;
  items: { href: string; label: string }[];
};
type NavEntry = NavLink | NavGroup;

const NAV: NavEntry[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: "grid" },
  { type: "link", href: "/invoices", label: "Invoices", icon: "file-text" },
  { type: "link", href: "/quotations", label: "Quotations", icon: "file-check" },
  { type: "link", href: "/clients", label: "Clients", icon: "users" },
  { type: "link", href: "/catalog", label: "Products", icon: "package" },
  { type: "link", href: "/automations", label: "Automations", icon: "repeat" },
  {
    type: "group",
    label: "Banking & Payments",
    icon: "bank",
    badge: "New",
    basePath: "/banking",
    items: [
      { href: "/banking/payment-accounts", label: "Payment Accounts" },
      { href: "/banking/bank-accounts", label: "Bank Accounts" },
      { href: "/banking/employee-accounts", label: "Employee Accounts" },
      { href: "/banking/reconciliation", label: "Bank Reconciliation" },
    ],
  },
  { type: "link", href: "/reports", label: "Reports", icon: "bar-chart" },
  { type: "link", href: "/settings", label: "Settings", icon: "sliders" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function NavGroupItem({ entry, pathname }: { entry: NavGroup; pathname: string }) {
  const groupActive = pathname.startsWith(entry.basePath);
  const [open, setOpen] = useState(groupActive);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          "flex w-full items-center gap-[11px] rounded-[10px] px-[11px] py-[9px] text-[13px] font-semibold transition-colors " +
          (groupActive
            ? "text-[var(--accent)]"
            : "text-[var(--text-mid)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]")
        }
      >
        <Icon name={entry.icon} size={18} />
        <span className="flex-1 text-left">{entry.label}</span>
        {entry.badge && (
          <span className="rounded-[5px] bg-[var(--accent)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--accent-ink)]">
            {entry.badge}
          </span>
        )}
        <Icon
          name="chevron-down"
          size={14}
          className={"shrink-0 transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="ml-[29px] mt-0.5 space-y-0.5 border-l border-[var(--divider)] pl-3">
          {entry.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { color: "var(--accent)" } : undefined}
                className={
                  "block rounded-[8px] px-2.5 py-[7px] text-[12.5px] font-medium transition-colors " +
                  (active
                    ? "bg-[rgba(246,217,78,.08)]"
                    : "text-[var(--text-mid)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5">
      {NAV.map((entry) => {
        if (entry.type === "group") {
          return <NavGroupItem key={entry.basePath} entry={entry} pathname={pathname} />;
        }
        const active = isActive(pathname, entry.href);
        return (
          <Link
            key={entry.href}
            href={entry.href}
            style={active ? { color: "var(--accent)", background: "rgba(246,217,78,.10)" } : undefined}
            className={
              "flex items-center gap-[11px] rounded-[10px] px-[11px] py-[9px] text-[13px] font-semibold transition-colors " +
              (active ? "" : "text-[var(--text-mid)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]")
            }
          >
            <Icon name={entry.icon} size={18} />
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
