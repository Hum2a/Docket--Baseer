import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Board" },
  { to: "/list", label: "List" },
  { to: "/stats", label: "Stats" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6">
      <header className="enter-up mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="enter-slide-right">
          <Link
            to="/"
            className="brand-mark group inline-flex items-center gap-3"
            aria-label="Docket home"
          >
            <img
              src="/docket-mark.png"
              alt=""
              width={52}
              height={52}
              className="h-11 w-11 rounded-[0.85rem] shadow-sm ring-1 ring-[var(--color-line)] transition-[transform,box-shadow] duration-[var(--duration)] ease-[var(--ease-out-soft)] group-hover:-translate-y-0.5 group-hover:shadow-md md:h-[3.25rem] md:w-[3.25rem]"
            />
            <span className="font-display text-4xl tracking-tight md:text-5xl">
              Docket
            </span>
          </Link>
          <p className="enter-fade delay-1 mt-1 pl-[3.75rem] text-sm text-[var(--color-ink-muted)] md:pl-[4.1rem]">
            Job application tracker
          </p>
        </div>
        <nav className="enter-scale delay-2 flex gap-1 rounded-lg border border-[var(--color-line)] bg-white/80 p-1 shadow-sm backdrop-blur-sm">
          {nav.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-pill rounded-md px-3 py-1.5 text-sm",
                  active
                    ? "nav-pill-active bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-ink-muted)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main key={pathname} className="page-enter">
        {children}
      </main>
    </div>
  );
}
