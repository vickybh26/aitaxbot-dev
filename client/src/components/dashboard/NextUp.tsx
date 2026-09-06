/**
 * NextUp — the next three statutory dates, in order.
 *
 * Ported from Lovable's NextUp.tsx (2026-09-06). Their version reads a
 * hardcoded `deadlines` array from the sample module; ours computes the dates
 * from shared/keyDates.ts — the same function the homepage card and the weekly
 * digest email use, so the three surfaces can never drift apart, and no date
 * on this page can go stale the way a literal would.
 */

import { getUpcomingKeyDates, daysUntil } from "@/lib/keyDates";
import Panel, { EmptyState, PanelLink } from "./Panel";

/**
 * Where each date sends you. Advance-tax instalments need the liability
 * worked out first; the belated/revised return needs the documents matched
 * before anything is filed.
 */
function actionFor(title: string): { label: string; href: string } {
  if (title.toLowerCase().includes("advance tax")) {
    return { label: "Compute what's due", href: "/calculators/income-tax" };
  }
  return { label: "Start reconciliation", href: "/tools/ais-26as-form16" };
}

export default function NextUp() {
  const upcoming = getUpcomingKeyDates().slice(0, 3);

  return (
    <Panel id="deadlines" title="Next up" meta="The dates that matter, in order">
      {upcoming.length === 0 ? (
        <EmptyState
          what="Nothing is due right now. The next instalment appears here as soon as the quarter opens."
          next={<PanelLink href="/calculators/income-tax">Compute this year's liability →</PanelLink>}
        />
      ) : (
        <ul className="space-y-3">
          {upcoming.map((item) => {
            const days = daysUntil(item.date);
            const urgent = days <= 30;
            const action = actionFor(item.title);
            return (
              <li
                key={item.title + item.date.toISOString()}
                className="rounded-2xl border border-rule bg-paper p-4"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-ink/55">{item.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                      urgent ? "bg-debit-wash text-debit" : "bg-secondary text-ink/65"
                    }`}
                  >
                    {days === 0 ? "Today" : `${days} days`}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-ink/55">
                    {item.date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <PanelLink href={action.href}>{action.label} →</PanelLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
