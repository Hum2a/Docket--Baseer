import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Board" },
  { to: "/list", label: "List" },
  { to: "/stats", label: "Stats" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="font-display text-4xl tracking-tight md:text-5xl">
            Docket
          </Link>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Job application tracker
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex gap-1 rounded-lg border border-[var(--color-line)] bg-white/80 p-1">
            {nav.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-ink-muted)] hover:bg-black/5",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {session?.user ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          ) : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
