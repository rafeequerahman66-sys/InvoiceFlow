import Link from "next/link";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { SidebarNav } from "@/components/sidebar-nav";
import { OrgSwitcher } from "@/components/org-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { requireOrg, getUserOrgs } from "@/lib/tenant";

function initials(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function Sidebar() {
  const [ctx, orgs] = await Promise.all([requireOrg(), getUserOrgs()]);
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[var(--shell-border)] bg-[var(--sidebar-bg)] px-3.5 py-5 md:flex">
      <Link href="/dashboard" className="mb-5 flex items-center gap-2.5 px-2">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[var(--accent)]">
          <Icon name="doc" size={17} className="text-[var(--accent-ink)]" />
        </span>
        <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[var(--text)]">
          Invoice<span className="text-[var(--accent)]">Flow</span>
        </span>
      </Link>

      <div className="mb-4 px-1">
        <div className="mb-1 px-1 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          Workspace
        </div>
        <OrgSwitcher orgs={orgs} activeId={ctx.orgId} activeName={ctx.orgName} />
      </div>

      <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--text-faint)]">Menu</div>
      <SidebarNav />

      <ThemeToggle />

      <div className="mt-1 flex items-center gap-2.5 rounded-[10px] px-2 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#3A3326] text-[12px] font-bold text-[var(--accent)]">
          {initials(ctx.userName ?? ctx.userEmail)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[var(--text)]">{ctx.userName ?? ctx.userEmail}</div>
          <div className="truncate text-[11.5px] text-[var(--text-dim)]">
            {ctx.role.charAt(0) + ctx.role.slice(1).toLowerCase()}
          </div>
        </div>
      </div>
      <SignOutButton />
    </aside>
  );
}

function Topbar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[var(--shell-border)] bg-[var(--app-bg)]/95 px-7 backdrop-blur">
      <div>
        <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text)]">{title}</h1>
        {subtitle && <p className="text-[12.5px] text-[var(--text-dim)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
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

export async function AppShell({
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
