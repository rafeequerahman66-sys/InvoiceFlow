import Link from "next/link";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/sidebar-nav";
import { OrgSwitcher } from "@/components/org-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, orgs] = await Promise.all([requireOrg(), getUserOrgs()]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — rendered ONCE per session, persists across tab navigations */}
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

      {/* Page content — swaps on every navigation, sidebar stays */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>

      {/* AI Finance Assistant — floating, present on every authed page */}
      <AssistantWidget orgId={ctx.orgId} orgName={ctx.orgName} />
    </div>
  );
}
