import { cn } from "@/lib/cn";
import Link from "next/link";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] font-bold",
  secondary: "bg-[var(--raised)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--text-faint)]",
  outline: "border border-[var(--border-2)] text-[var(--text-mid)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]",
  ghost: "text-[var(--text-mid)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]",
  danger: "border border-[var(--border-2)] text-[var(--negative)] hover:bg-[var(--row-hover)]",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-[13px]",
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:opacity-50 disabled:pointer-events-none";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
