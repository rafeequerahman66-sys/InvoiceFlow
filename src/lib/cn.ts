/** Tiny classnames joiner — keeps the bundle free of clsx/tailwind-merge deps. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
