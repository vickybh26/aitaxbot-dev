/**
 * useTrackToolUse — fire-and-forget calculator activity tracker.
 *
 * Usage:
 *   const trackTool = useTrackToolUse();
 *   // inside your calculate handler, after results are ready:
 *   trackTool("HRA Calculator", "₹45,000 HRA exempt");
 *
 * - Silently skips if the user is not authenticated.
 * - Never throws or blocks the UI — errors are console-only.
 */

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useTrackToolUse() {
  const { getIdToken, user } = useAuth();

  const track = useCallback(
    async (tool: string, summary?: string) => {
      if (!user) return; // not logged in — skip silently
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
          }),
        }).catch(() => {}); // swallow network errors silently
      } catch {
        // Auth errors are non-fatal
      }
    },
    [user, getIdToken]
  );

  return track;
}
