import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const { registered } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
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
          <h1 className="text-[16px] font-bold">Sign in</h1>
          <p className="mt-1 text-[13px] text-[var(--text-dim)]">Welcome back — sign in to your workspace.</p>
          {registered && (
            <p className="mt-3 rounded-[8px] border border-[#34301a] bg-[rgba(116,217,160,.08)] px-3 py-2 text-[12.5px] text-[var(--positive)]">
              Account created — sign in to continue.
            </p>
          )}
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-[13px] text-[var(--text-dim)]">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-[var(--accent)] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
