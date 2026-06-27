"use client";

import { useState } from "react";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login, resendVerification } from "@/actions/auth";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsVerify, setNeedsVerify] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNeedsVerify(null);
    setResent(false);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await login(String(fd.get("email")), String(fd.get("password")));
      if (res?.error) {
        setError(res.error);
        if ("needsVerify" in res && res.needsVerify) setNeedsVerify(res.email ?? String(fd.get("email")));
        setBusy(false);
      }
      // success → server action redirects
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setBusy(false);
    }
  }

  async function resend() {
    if (!needsVerify) return;
    setBusy(true);
    await resendVerification(needsVerify).catch(() => {});
    setResent(true);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <div>
        <Label>Email</Label>
        <input name="email" type="email" required autoComplete="email" className={fieldClasses("w-full")} placeholder="you@company.com" />
      </div>
      <div>
        <Label>Password</Label>
        <input name="password" type="password" required autoComplete="current-password" className={fieldClasses("w-full")} placeholder="••••••••" />
      </div>
      {error && <p className="text-[12.5px] text-[var(--negative)]">{error}</p>}
      {needsVerify && !resent && (
        <button type="button" onClick={resend} disabled={busy} className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
          Resend verification email
        </button>
      )}
      {resent && <p className="text-[12.5px] text-[var(--positive)]">Verification email sent — check your inbox.</p>}
      <Button type="submit" disabled={busy} className="w-full py-2.5">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
