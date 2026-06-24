"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";

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

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[var(--shell-border)] bg-[var(--sidebar-bg)] px-3.5 py-5 md:flex">
      {/* Logo lockup */}
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[var(--accent)]">
          <Icon name="doc" size={17} className="text-[var(--accent-ink)]" fill="none" />
        </span>
        <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[var(--text)]">
          Invoice<span className="text-[var(--accent)]">Flow</span>
        </span>
      </Link>

      <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--text-faint)]">
        Menu
      </div>
      <nav className="flex-1 space-y-0.5">
        {NAV.map((n) => {
          const active = isActiveHref(pathname, n.href);
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

      {/* Upgrade card */}
      <div
        className="mb-3 rounded-[14px] border border-[#34301a] p-[15px]"
        style={{ background: "linear-gradient(150deg,#1A1B12,#211F0E)" }}
      >
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--accent)]">
          <Icon name="bolt" size={14} fill="var(--accent)" className="text-[var(--accent)]" />
          Upgrade to Pro
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-[var(--text-dim)]">
          Unlimited invoices, branding &amp; payments.
        </p>
      </div>

      <ThemeToggle />

      <div className="mt-1 flex items-center gap-2.5 rounded-[10px] px-2 py-2">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#3A3326] text-[12px] font-bold text-[var(--accent)]">
          RM
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[var(--text)]">Rin Media</div>
          <div className="truncate text-[11.5px] text-[var(--text-dim)]">Studio · Owner</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[var(--shell-border)] bg-[var(--app-bg)]/95 px-7 backdrop-blur">
      <div>
        <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text)]">{title}</h1>
        {subtitle && <p className="text-[12.5px] text-[var(--text-dim)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-[10px] border border-[var(--border-2)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--text-dim)] lg:flex">
          <Icon name="search" size={15} />
          <span>Search…</span>
        </div>
        <button className="hidden h-[38px] items-center gap-2 rounded-[10px] border border-[var(--border-2)] px-3 text-[12.5px] text-[var(--text-mid)] sm:flex">
          <Icon name="calendar" size={15} /> This year
        </button>
        <button
          aria-label="Notifications"
          className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[var(--border-2)] text-[var(--text-mid)] hover:text-[var(--text)]"
        >
          <Icon name="bell" size={17} />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </button>
        {action === undefined ? (
          <ButtonLink href="/invoices/new" className="gap-1.5">
            <Icon name="plus" size={16} className="text-[var(--accent-ink)]" />
            New Invoice
          </ButtonLink>
        ) : (
          action
        )}
      </div>
    </header>
  );
}

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} action={action} />
        <main className="flex-1">
          <div className="mx-auto max-w-[1320px] px-7 pb-16 pt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
