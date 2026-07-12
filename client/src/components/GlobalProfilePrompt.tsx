/**
 * GlobalProfilePrompt
 *
 * Shows ProfileCompletionModal exactly once per browser session whenever a
 * signed-in user has an incomplete profile — no matter which page they're
 * on. This used to live only inside Dashboard.tsx, which meant it never
 * fired for the majority of signups: those come from a calculator's
 * ResultAuthGate → AuthModal flow, which (correctly) keeps the user on the
 * calculator page after sign-in instead of routing them to /dashboard. That
 * funnel is the biggest source of new accounts, so the one nudge mechanism
 * we had was effectively invisible to most new users.
 *
 * Mounted once at the app root (see App.tsx) so it survives page-level
 * unmounts — e.g. the moment `user` becomes truthy, ResultAuthGate stops
 * rendering and unmounts, which would take any profile prompt nested inside
 * it down with it. Living at the root avoids that entirely.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileCompletionModal from "@/components/ProfileCompletionModal";

const DISMISSED_KEY = "profileModalDismissed";

export default function GlobalProfilePrompt() {
  const { loading, user, userProfile, isProfileComplete } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (loading || !user || !userProfile) return;
    if (isProfileComplete) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    setShow(true);
  }, [loading, user, userProfile, isProfileComplete]);

  if (!show) return null;

  return (
    <ProfileCompletionModal
      onClose={() => {
        sessionStorage.setItem(DISMISSED_KEY, "1");
        setShow(false);
      }}
    />
  );
}
