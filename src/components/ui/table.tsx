import { cn } from "@/lib/cn";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-[13px]", className)} {...props} />;
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--divider)] text-left">{children}</tr>
    </thead>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-faint)]",
        className
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-[var(--row-divider)] transition-colors hover:bg-[var(--row-hover)]", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-[18px] py-3 text-[var(--text)]", className)} {...props} />;
}
