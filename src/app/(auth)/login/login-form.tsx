"use client";

import { useState } from "react";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login } from "@/actions/auth";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await login(String(fd.get("email")), String(fd.get("password")));
      if (res?.error) {
        setError(res.error);
        setBusy(false);
      }
      // success → server action redirects
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setBusy(false);
    }
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
      <Button type="submit" disabled={busy} className="w-full py-2.5">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
