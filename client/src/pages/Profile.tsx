/**
 * Profile — redirect stub.
 *
 * This used to be a full standalone page: an avatar/name/completion header,
 * a personal-details form, account info, and account deletion. Merged into
 * the dashboard 2026-09-26 (see components/dashboard/ProfileSection.tsx for
 * the actual content and why) — Vicky: "We have profile and Dashboard
 * separately, Merge them". The account menu had two links to two pages that
 * both told you who you were; now there's one page with an extra section.
 *
 * The route stays so a bookmarked or emailed /profile link keeps working —
 * it just forwards to the merged section instead of rendering a duplicate.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Profile() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/dashboard#profile", { replace: true });
  }, [setLocation]);

  // Matches App.tsx's own PageLoader (a private, non-exported function
  // there, so this is inlined rather than imported) — this component is
  // only ever on screen for the instant it takes the effect above to fire.
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-persian-blue-600" />
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}
