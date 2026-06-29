import { Icon } from "@/components/icon";
import { ButtonLink } from "@/components/ui/button";

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
    <>
      <Topbar title={title} subtitle={subtitle} action={action} />
      <main className="flex-1">
        <div className="mx-auto max-w-[1320px] px-7 pb-16 pt-6">{children}</div>
      </main>
    </>
  );
}
