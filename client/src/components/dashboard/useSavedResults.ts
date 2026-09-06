/**
 * useSavedResults — the one query every dashboard panel reads from.
 *
 * GET /api/saved-results returns the user's latest result per tool (see
 * server/savedResults.ts — one document per user per tool, summary figures
 * only, never the uploaded documents). Four panels need it, so they all call
 * this hook and share a single TanStack Query cache entry rather than each
 * firing their own fetch.
 *
 * WHY THE PARSING HELPERS LIVE HERE
 * ---------------------------------
 * savedResults stores display strings, not numbers ("₹84,240"), because that
 * is what the card renders. The dashboard needs the numbers back to work out
 * the gap between the two regimes and to draw a progress bar, so the parsing
 * is done once, here, instead of three times in three panels. If the writer
 * side (client/src/components/calculators/TaxCalculator.tsx) ever changes the
 * label text it writes, this file is the single place that has to follow.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedResult {
  id: string;
  toolKey: string;
  toolName: string;
  route: string;
  kind: "calculator" | "reconciliation";
  headline: { label: string; value: string; hint?: string };
  details?: Array<{ label: string; value: string }>;
  /** Raw calculator inputs — primitives only, see sanitiseInputs() server-side. */
  inputs?: Record<string, string | number | boolean | null>;
  updatedAt: string;
}

export function useSavedResults() {
  const { user, getIdToken } = useAuth();

  return useQuery<SavedResult[]>({
    queryKey: ["/api/saved-results"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await fetch("/api/saved-results", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

/** "₹1,09,720" → 109720. Returns null for anything that isn't a figure. */
export function parseRupees(value: string | undefined | null): number | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Number → "₹84,240", Indian digit grouping. */
export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** A saved calculator input that arrives as "" | "95000" | 95000 | null. */
export function parseInput(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Which regime won, read back off the headline the calculator wrote
 * ("Your tax · New Regime"). Returns null rather than guessing — the
 * deductions panel changes meaning entirely between the two regimes, so a
 * wrong guess there would be worse than showing nothing.
 */
export function regimeFromHeadline(label: string | undefined): "old" | "new" | null {
  if (!label) return null;
  if (label.includes("Old Regime")) return "old";
  if (label.includes("New Regime")) return "new";
  return null;
}

/** Pull one labelled figure out of a saved result's details list. */
export function detailValue(result: SavedResult | undefined, label: string): string | undefined {
  return result?.details?.find((d) => d.label === label)?.value;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
