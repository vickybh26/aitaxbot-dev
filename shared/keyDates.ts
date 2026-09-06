/**
 * "Dates to watch" — computed, not hardcoded, for the same reason
 * itrDeadline() in Landing.tsx is computed: a literal date on a tax site
 * goes stale silently. Ported visual structure from Lovable's KeyDates.tsx
 * (2026-09-04), but the DATES themselves are our own computation — Lovable's
 * live card showed "Belated / revised return — Last date for AY 2027-28 ·
 * 2026", which is internally inconsistent (the belated deadline for AY
 * 2027-28 would be Dec 2027, not 2026; Dec 2026 is actually the deadline
 * for AY 2026-27). Per "facts from our old website, not Lovable's", this
 * file derives every date from the two fixed rules below rather than
 * copying theirs.
 *
 * Rules (Section 211 ITA 1961 / equivalent under ITA 2025 for advance tax;
 * Section 139(4) for the belated return):
 *   - Advance tax for the FY in progress: 15% by 15 Jun, 45% by 15 Sep,
 *     75% by 15 Dec, 100% by 15 Mar (all cumulative).
 *   - Belated/revised return for the FY that just ended (filing season
 *     already open) is due 31 Dec of the same calendar year the new FY
 *     started — e.g. FY 2025-26 (ended 31 Mar 2026) has AY 2026-27, due
 *     31 Jul normally, extended to 31 Dec 2026 if belated.
 *
 * Lives in shared/ (not client/src/lib/) because both the homepage "Dates
 * to watch" card and the server's weekly digest email need the identical
 * computation — client/src/lib/keyDates.ts re-exports this file rather
 * than duplicating it.
 */

export interface KeyDateItem {
  day: number;
  monthLabel: string; // "Sept", "Dec", "Mar" — 3-letter, matching the card's small caption
  title: string;
  detail: string; // e.g. "45% cumulative · 2026"
  date: Date; // for sorting/day-count only, not rendered directly
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];

function item(date: Date, title: string, detail: string): KeyDateItem {
  return { day: date.getDate(), monthLabel: MONTH_LABELS[date.getMonth()], title, detail, date };
}

/**
 * Returns the next 4 upcoming key dates from `now`, chronologically —
 * advance-tax instalments for the FY in progress plus the belated-return
 * deadline for the FY that just ended, whichever are still in the future.
 */
export function getUpcomingKeyDates(now: Date = new Date()): KeyDateItem[] {
  // FY start year: April (month index 3) rolls into the NEXT FY.
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const advanceTax = [
    item(new Date(fyStartYear, 5, 15), "Advance tax — 1st instalment", `15% cumulative · ${fyStartYear}`),
    item(new Date(fyStartYear, 8, 15), "Advance tax — 2nd instalment", `45% cumulative · ${fyStartYear}`),
    item(new Date(fyStartYear, 11, 15), "Advance tax — 3rd instalment", `75% cumulative · ${fyStartYear}`),
    item(new Date(fyStartYear + 1, 2, 15), "Advance tax — final instalment", `100% of liability · ${fyStartYear + 1}`),
  ];

  // Belated return for the FY that just ended (fyStartYear-1 to fyStartYear),
  // AY fyStartYear/(fyStartYear+1) — due 31 Dec of fyStartYear.
  const belated = item(
    new Date(fyStartYear, 11, 31),
    "Belated / revised return",
    `For AY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")} · ${fyStartYear}`
  );

  const all = [...advanceTax, belated]
    .filter((d) => d.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return all.slice(0, 4);
}

/** Days from `now` to `date`, rounded up — for the "in N days" tag. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDate - startOfNow) / msPerDay);
}
