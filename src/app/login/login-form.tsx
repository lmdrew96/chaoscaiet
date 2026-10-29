"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/read-json";

const inputClass = "min-h-11 rounded border border-hairline bg-transparent px-3 text-[15px] pointer-coarse:text-base";

export const LoginForm = (): React.ReactNode => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-[13px] text-ink-secondary">
        email
        <input
          className={`${inputClass} text-ink`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-ink-secondary">
        password
        <input
          className={`${inputClass} text-ink`}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <p role="alert" className="m-0 text-sm">
          {error}
        </p>
      )}
      <button
        className="min-h-11 cursor-pointer rounded bg-accent px-5 text-sm font-semibold text-[var(--indigo-void)] disabled:opacity-60"
        type="submit"
        disabled={busy}
      >
        {busy ? "signing in…" : "sign in"}
      </button>
    </form>
  );
};
