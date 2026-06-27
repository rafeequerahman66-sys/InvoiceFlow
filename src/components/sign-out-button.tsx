"use client";

import { signOutAction } from "@/actions/org";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="w-full rounded-[10px] px-2.5 py-2 text-left text-[13px] font-medium text-[var(--text-mid)] hover:bg-[var(--nav-hover)]">
        Sign out
      </button>
    </form>
  );
}
