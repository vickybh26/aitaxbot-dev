/**
 * useTrackToolUse — fire-and-forget calculator activity tracker.
 *
 * Usage (tracking only):
 *   const trackTool = useTrackToolUse();
 *   trackTool("HRA Calculator", "₹45,000 HRA exempt");
 *
 * Usage (tracking + "your last result" card on the dashboard):
 *   trackTool("HRA Calculator", "₹45,000 HRA exempt", {
 *     toolKey: "hra",
 *     route: "/calculators/hra",
 *     kind: "calculator",
 *     headline: { label: "HRA exempt", value: "₹45,000" },
 *     details: [{ label: "Taxable HRA", value: "₹15,000" }],
 *     inputs: { basicSalary: 600000, hraReceived: 240000 },
 *   });
 *
 * The saved payload rides along on the request the calculator already makes,
 * so persistence works everywhere useTrackToolUse() is already called rather
 * than needing a second save call wired into each of the nine calculators
 * (and inevitably forgotten in one of them).
 *
 * Only the derived summary and the inputs travel — never documents. The server
 * sanitises the payload again on arrival; see server/savedResults.ts.
 *
 * - Silently skips if the user is not authenticated.
 * - Never throws or blocks the UI — errors are console-only.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Several calculators (SIP, SWP, PF…) recompute inside a useEffect keyed on
 * their inputs, so they call track() on every keystroke. Previously that meant
 * one Firestore event document per character typed — which both inflated the
 * usage counts we were reading as engagement and, now that a saved-result card
 * rides along, would mean a write per keystroke too.
 *
 * Calls are therefore coalesced per tool: the last one within the window wins
 * and is sent once the user stops typing. Trailing edge, not leading, so the
 * figure we persist is the one they settled on rather than a half-typed number.
 */
const TRACK_DEBOUNCE_MS = 1200;

export interface SavedResultPayload {
  /** Stable per-tool key. One saved card per user per key — new runs overwrite. */
  toolKey: string;
  /** Where the dashboard card should send the user back to. */
  route: string;
  kind: "calculator" | "reconciliation";
  /** The single figure shown large on the card. */
  headline: { label: string; value: string; hint?: string };
  /** Up to 5 supporting lines. */
  details?: Array<{ label: string; value: string }>;
  /** Primitives only — used to pre-fill the tool when reopened. */
  inputs?: Record<string, string | number | boolean | null>;
}

export function useTrackToolUse() {
  const { getIdToken, user } = useAuth();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Clear any pending sends if the component unmounts mid-typing, so we don't
  // fire a request against a page the user has already navigated away from.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  const send = useCallback(
    async (tool: string, summary?: string, saved?: SavedResultPayload) => {
      try {
        const token = await getIdToken();
        if (!token) return;
        // Fire-and-forget — don't await the response
        fetch("/api/tool-usage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tool,
            route: window.location.pathname,
            summary: summary ?? null,
            ...(saved ? { saved: { ...saved, toolName: tool } } : {}),
          }),
        }).catch(() => {}); // swallow network errors silently
      } catch {
        // Auth errors are non-fatal
      }
    },
    [getIdToken]
  );

  const track = useCallback(
    (tool: string, summary?: string, saved?: SavedResultPayload) => {
      if (!user) return; // not logged in — skip silently
      if (timers.current[tool]) clearTimeout(timers.current[tool]);
      timers.current[tool] = setTimeout(() => {
        delete timers.current[tool];
        void send(tool, summary, saved);
      }, TRACK_DEBOUNCE_MS);
    },
    [user, send]
  );

  return track;
}
