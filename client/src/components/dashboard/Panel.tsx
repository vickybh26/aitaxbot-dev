/**
 * Panel — the shared "bento" card every dashboard section sits in.
 *
 * Ported 1:1 from Lovable's src/components/dashboard/Panel.tsx (2026-09-06),
 * including the 1.75rem radius and the grid→flex header switch that keeps a
 * long title from shoving the action button off a narrow screen. Only the
 * router import differs (wouter here, TanStack Router there).
 */

import type { ReactNode } from "react";
import { Link } from "wouter";

export default function Panel({
  id,
  title,
  meta,
  action,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-[1.75rem] border border-rule bg-card p-6 sm:p-7 ${className}`}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {meta && <p className="mt-1 text-xs text-ink/55">{meta}</p>}
        </div>
        {action}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Shown when a panel has nothing real to display yet. */
export function EmptyState({ what, next }: { what: string; next?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-rule bg-paper px-5 py-6">
      <p className="text-sm text-ink/65">{what}</p>
      {next && <div className="mt-3">{next}</div>}
    </div>
  );
}

/** The pill button used for a panel's primary action. */
export function PanelAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-credit"
    >
      {children}
    </Link>
  );
}

/** The quieter inline "→" link used inside panel rows. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs font-semibold text-credit underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
