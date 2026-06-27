"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/invoices", label: "Invoices", icon: "file-text" },
  { href: "/quotations", label: "Quotations", icon: "file-check" },
  { href: "/clients", label: "Clients", icon: "users" },
  { href: "/catalog", label: "Products", icon: "package" },
  { href: "/automations", label: "Automations", icon: "repeat" },
  { href: "/reports", label: "Reports", icon: "bar-chart" },
  { href: "/settings", label: "Settings", icon: "sliders" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            style={active ? { color: "var(--accent)", background: "rgba(246,217,78,.10)" } : undefined}
            className={
              "flex items-center gap-[11px] rounded-[10px] px-[11px] py-[9px] text-[13px] font-semibold transition-colors " +
              (active ? "" : "text-[var(--text-mid)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]")
            }
          >
            <Icon name={n.icon} size={18} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
