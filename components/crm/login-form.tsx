"use client";

/** Sign-in screen for the Gurdena CRM. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn } from "lucide-react";
import { signInAction } from "@/app/login/actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await signInAction(email, password);
      if (result.ok) {
        router.replace("/crm");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid size-12 place-items-center rounded-xl bg-[#4f46e5] text-white">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="text-[20px] font-bold text-[#1f2430]">Gurdena CRM</h1>
          <p className="text-[13px] text-[#9aa1ab]">
            Sign in to your insurance workspace
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-[#e6e8ec] bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
              Email
            </span>
            <input
              type="email"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ways.ge"
              className="h-10 w-full rounded-lg border border-[#e6e8ec] bg-white px-3 text-[14px] text-[#1f2430] outline-none transition focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 w-full rounded-lg border border-[#e6e8ec] bg-white px-3 text-[14px] text-[#1f2430] outline-none transition focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/15"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#b91c1c]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4f46e5] text-[14px] font-semibold text-white transition hover:bg-[#4338ca] disabled:opacity-60"
          >
            <LogIn className="size-4" />
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-[#e6e8ec] bg-white/60 p-3 text-center text-[11px] leading-relaxed text-[#9aa1ab]">
          <span className="font-semibold text-[#6b7280]">Demo accounts</span>
          <br />
          mariam@ways.ge · sandro@ways.ge · nika@ways.ge
          <br />
          password: <span className="font-mono text-[#4b5563]">gurdena123</span>
        </div>
      </div>
    </div>
  );
}
