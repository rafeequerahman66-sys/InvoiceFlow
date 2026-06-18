import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-ink": "var(--accent-ink)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        info: "var(--info)",
      },
    },
  },
  plugins: [],
} satisfies Config;
