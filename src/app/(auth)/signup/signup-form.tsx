"use client";

import { useState } from "react";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp } from "@/actions/auth";

export function SignupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await signUp({
        name: String(fd.get("name")),
        company: String(fd.get("company")),
        email: String(fd.get("email")),
        password: String(fd.get("password")),
      });
      if (res?.error) {
        setError(res.error);
        setBusy(false);
      }
      // success → server action signs in + redirects
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <div>
        <Label>Your name</Label>
        <input name="name" required className={fieldClasses("w-full")} placeholder="Jane Doe" />
      </div>
      <div>
        <Label>Company / workspace name</Label>
        <input name="company" required className={fieldClasses("w-full")} placeholder="Acme Studios" />
      </div>
      <div>
        <Label>Email</Label>
        <input name="email" type="email" required autoComplete="email" className={fieldClasses("w-full")} placeholder="you@company.com" />
      </div>
      <div>
        <Label>Password</Label>
        <input name="password" type="password" required autoComplete="new-password" minLength={8} className={fieldClasses("w-full")} placeholder="At least 8 characters" />
      </div>
      {error && <p className="text-[12.5px] text-[var(--negative)]">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full py-2.5">
        {busy ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
