import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--accent)] text-[16px] font-extrabold text-[var(--accent-ink)]">
            ₹
          </span>
          <span className="text-[18px] font-extrabold tracking-[-0.02em]">
            Invoice<span className="text-[var(--accent)]">Flow</span>
          </span>
        </div>
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-7">
          <h1 className="text-[16px] font-bold">Create your workspace</h1>
          <p className="mt-1 text-[13px] text-[var(--text-dim)]">Start invoicing in under a minute.</p>
          <SignupForm />
        </div>
        <p className="mt-4 text-center text-[13px] text-[var(--text-dim)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
