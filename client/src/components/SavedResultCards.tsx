/**
 * SavedResultCards — "pick up where you left off" on the dashboard.
 *
 * Shows the user's most recent result from each tool they've used. This is the
 * main reason a returning visitor has to come back: previously every figure was
 * discarded on navigation, which made the product entirely seasonal — someone
 * worked out their tax once and had nothing waiting for them afterwards.
 *
 * The reconciliation card is deliberately the loud one. "3 items to resolve
 * before filing" is unfinished business with a deadline attached, which pulls
 * far harder than a calculator result the person has already read.
 *
 * Renders nothing at all when there's nothing saved — a row of empty
 * placeholder cards would just be noise for a first-time user, who already has
 * the tool grid below.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, FileSearch, Clock, X, Loader2 } from "lucide-react";

export interface SavedResult {
  id: string;
  toolKey: string;
  toolName: string;
  route: string;
  kind: "calculator" | "reconciliation";
  headline: { label: string; value: string; hint?: string };
  details?: Array<{ label: string; value: string }>;
  updatedAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function SavedResultCards() {
  const { user, getIdToken } = useAuth();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState<string | null>(null);

  // The Privacy Policy tells users they can clear any saved result at any
  // time. That control has to actually exist here, or the policy is a promise
  // with nothing behind it.
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

  const { data: saved = [], isLoading } = useQuery<SavedResult[]>({
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

  if (isLoading || saved.length === 0) return null;

  // Reconciliation first — it's the one with an outstanding action attached.
  const ordered = [...saved].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "reconciliation" ? -1 : 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  return (
    <section className="mb-8" aria-labelledby="saved-results-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="saved-results-heading"
          className="text-xl font-bold text-ink flex items-center gap-2"
        >
          <Clock className="w-5 h-5 text-credit" />
          Where you left off
        </h2>
        <span className="text-xs text-ink/55">Only your results — documents are never stored</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordered.map((item) => {
          const isRecon = item.kind === "reconciliation";
          return (
            <div
              key={item.id}
              data-testid={`saved-result-${item.toolKey}`}
              className={`rounded-2xl border p-5 flex flex-col ${
                isRecon
                  ? "bg-amber-50 border-amber-200"
                  : "bg-card border-rule"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isRecon ? "bg-amber-100" : "bg-secondary"
                    }`}
                  >
                    {isRecon ? (
                      <FileSearch className="w-4 h-4 text-amber-700" />
                    ) : (
                      <Calculator className="w-4 h-4 text-credit" />
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold truncate ${
                      isRecon ? "text-amber-900" : "text-ink/55"
                    }`}
                  >
                    {item.toolName}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-ink/55">
                    {timeAgo(item.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => clearOne(item.toolKey)}
                    disabled={clearing === item.toolKey}
                    aria-label={`Clear saved ${item.toolName} result`}
                    title="Clear this saved result"
                    className="p-1 rounded-md text-ink/55 hover:text-ink/80 hover:bg-secondary disabled:opacity-50"
                    data-testid={`clear-saved-${item.toolKey}`}
                  >
                    {clearing === item.toolKey ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <p className={`text-xs mb-0.5 ${isRecon ? "text-amber-800" : "text-ink/55"}`}>
                {item.headline.label}
              </p>
              <p
                className={`font-bold tabular-nums leading-tight ${
                  isRecon ? "text-lg text-amber-950" : "text-2xl text-ink"
                }`}
              >
                {item.headline.value}
              </p>
              {item.headline.hint && (
                <p className={`text-xs mt-1 ${isRecon ? "text-amber-700" : "text-green-700"}`}>
                  {item.headline.hint}
                </p>
              )}

              {item.details && item.details.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {item.details.map((d, i) => (
                    <li
                      key={i}
                      className={`text-xs flex gap-2 ${
                        isRecon ? "text-amber-900" : "text-ink/65"
                      }`}
                    >
                      {d.label ? (
                        <>
                          <span className="text-ink/55">{d.label}</span>
                          <span className="ml-auto font-medium tabular-nums">{d.value}</span>
                        </>
                      ) : (
                        // Reconciliation action items have no label — render as
                        // a bulleted list rather than a label/value row.
                        <span className="leading-snug">· {d.value}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <Link href={item.route} className="mt-4">
                <Button
                  size="sm"
                  className={`w-full text-xs font-semibold ${
                    isRecon
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-ink hover:bg-ink text-white"
                  }`}
                >
                  {isRecon ? "Open report" : "Update"}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
