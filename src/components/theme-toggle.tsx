"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        className="grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[var(--border-2)] text-[var(--text-mid)] hover:text-[var(--text)]"
      >
        <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] font-medium text-[var(--text-mid)] hover:bg-[var(--nav-hover)]"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
