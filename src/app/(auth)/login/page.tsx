import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-sm rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--accent)] text-lg font-extrabold text-[var(--accent-ink)]">
          ₹
        </div>
        <h1 className="text-[17px] font-extrabold text-[var(--text)]">
          Invoice<span className="text-[var(--accent)]">Flow</span>
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-dim)]">Rin Media internal billing</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
          className="mt-6"
        >
          <button className="w-full rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]">
            Continue with Google
          </button>
        </form>
        <p className="mt-4 text-[12px] text-[var(--text-faint)]">
          Access is restricted to approved Rin Media accounts.
        </p>
      </div>
    </div>
  );
}
