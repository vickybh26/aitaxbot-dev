import { CalendarDays } from "lucide-react";
import { daysUntil, getUpcomingKeyDates } from "@/lib/keyDates";

/**
 * "Dates to watch" bento card — visual structure ported verbatim from
 * Lovable's KeyDates.tsx (classNames match exactly), but the dates
 * themselves come from client/src/lib/keyDates.ts, our own computation,
 * not theirs — see that file's header comment for why (their live card's
 * belated-return item was internally inconsistent).
 */
export default function KeyDates() {
  const items = getUpcomingKeyDates();

  return (
    <div className="rounded-[2rem] border border-rule bg-card p-7">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-credit" aria-hidden="true" />
        <h2 className="font-display text-base font-bold">Dates to watch</h2>
      </div>
      <ol className="mt-5 space-y-4">
        {items.map((d) => {
          const days = daysUntil(d.date);
          return (
            <li key={`${d.title}-${d.date.toISOString()}`} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-secondary leading-none">
                <span className="tabular-figures font-display text-sm font-bold">{d.day}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/55">
                  {d.monthLabel}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{d.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">
                  {d.detail}
                  {days <= 14 && (
                    <span className="ml-1 font-semibold text-notice">
                      in {days} day{days === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
