"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

/**
 * Hand-rolled theme provider (next-themes has open React 19 issues). The app is
 * dark-first: dark is the default (no class); a `.light` class on <html> swaps
 * the token set. Persisted to localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("light", next === "light");
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Inline script that applies the saved theme before paint (avoids FOUC). Dark default. */
export const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;
