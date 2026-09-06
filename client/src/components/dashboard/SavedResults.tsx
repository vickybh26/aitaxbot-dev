/**
 * SavedResults — every result we're holding for this user, one card per tool.
 *
 * Ported from Lovable's SavedResults.tsx (2026-09-06) and merged with the
 * component it replaces (client/src/components/SavedResultCards.tsx). Two
 * things carried over from the old component and must not be dropped:
 *
 *  - the per-card clear (×) control. The Privacy Policy tells users they can
 *    remove any saved result at any time; without this the promise has nothing
 *    behind it.
 *  - the "documents are never stored" line, which is the same commitment the
 *    reconciliation tool makes on its own page.
 *
 * Every tool is listed, reconciliation included, so there is exactly one place
 * to see and clear what is kept.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedResults, timeAgo } from "./useSavedResults";
import Panel, { EmptyState, PanelLink } from "./Panel";

export default function SavedResults() {
  const { getIdToken } = useAuth();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState<string | null>(null);
  const { data: saved = [], isLoading } = useSavedResults();

  const clearOne = async (toolKey: string) => {
    setClearing(toolKey);
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`/api/saved-results/${encodeURIComponent(toolKey)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-results"] });
    } catch {
      // Non-fatal — the card simply stays until the next refresh.
    } finally {
      setClearing(null);
    }
  };

  // Reconciliation first: it's the one with unfinished business attached.
  const ordered = [...saved].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "reconciliation" ? -1 : 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  return (
    <Panel
      id="saved"
      title="Saved results"
      meta="Only your figures are kept — uploaded documents never are"
      action={<PanelLink href="/calculators">All tools →</PanelLink>}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState
          what="Nothing saved yet. Each calculation you run while signed in appears here with its figures, ready to reopen."
          next={<PanelLink href="/calculators/income-tax">Start with the tax computation →</PanelLink>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((r) => (
            <li key={r.id} className="relative">
              <button
                type="button"
                onClick={() => clearOne(r.toolKey)}
                disabled={clearing === r.toolKey}
                aria-label={`Clear saved ${r.toolName} result`}
                title="Clear this saved result"
                className="absolute right-3 top-3 z-10 rounded-md p-1 text-ink/40 transition-colors hover:bg-secondary hover:text-ink/70 disabled:opacity-50"
                data-testid={`clear-saved-${r.toolKey}`}
              >
                {clearing === r.toolKey ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
              <Link
                href={r.route}
                className="block h-full rounded-2xl border border-rule bg-paper p-4 transition-all hover:-translate-y-0.5 hover:border-credit"
                data-testid={`saved-result-${r.toolKey}`}
              >
                <p className="pr-6 text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">
                  {r.toolName}
                </p>
                <p className="tabular-figures mt-2 font-display text-lg font-bold text-ink">
                  {r.headline.value}
                </p>
                <p className="mt-1 text-xs text-ink/60">{r.headline.label}</p>
                {r.headline.hint && (
                  <p className="mt-1 text-xs text-credit">{r.headline.hint}</p>
                )}
                <p className="mt-3 text-[11px] text-ink/45">Saved {timeAgo(r.updatedAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
