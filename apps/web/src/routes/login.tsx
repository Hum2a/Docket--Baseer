import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "magic") {
        const res = await signIn.magicLink({
          email,
          callbackURL: "/",
        });
        if (res.error) throw new Error(res.error.message);
        setMessage("Check your email for a magic link (also logged in API console in dev).");
      } else if (mode === "signup") {
        const res = await signUp.email({ email, password, name: name || "Baseer" });
        if (res.error) throw new Error(res.error.message);
        await navigate({ to: "/" });
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
        await navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="font-display text-5xl">Docket</h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">
        Sign in to track applications.
      </p>
      <div className="mt-6 flex gap-2">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Sign up"],
            ["magic", "Magic link"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              mode === id
                ? "rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white"
                : "rounded-md px-3 py-1.5 text-sm text-[var(--color-ink-muted)]"
            }
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
        {mode === "signup" ? (
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : null}
        <Input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "magic" ? (
          <Input
            type="password"
            placeholder="Password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : null}
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        {message ? <p className="text-sm text-[var(--color-accent)]">{message}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Working…" : mode === "magic" ? "Send magic link" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
        <Link to="/" className="underline">
          Back
        </Link>
      </p>
    </div>
  );
}
