/**
 * ResultAuthGate
 *
 * Shown in place of a calculator's result when the visitor is not signed in.
 * The calculation itself still runs freely (no gate on inputs) — only the
 * computed numbers are hidden until the user signs in or creates a free
 * account. This is the shared building block for the sitewide "sign in to
 * see your result" flow.
 *
 * IMPORTANT: sign-in happens via an in-page AuthModal, not a navigation to
 * /login. Navigating away would unmount the calculator and wipe whatever
 * the visitor already typed in — this component exists specifically to
 * avoid that. Once the user is signed in, the parent component stops
 * rendering this gate on its own re-render, which closes the modal.
 */

import { useState } from "react";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AuthModal from "@/components/AuthModal";

interface ResultAuthGateProps {
  /** Human-readable tool name shown in the CTA copy, e.g. "HRA Calculator" */
  toolName: string;
  /**
   * The single headline figure, shown to EVERYONE before the gate.
   *
   * Why this exists (2026-08-01): gating the entire result was costing us most
   * of our users. Firestore showed 123 signups but only 22 people who ever
   * completed a calculation — 82% created an account and never saw a number.
   * Google AdSense separately rejected the site for "low value content", which
   * is what a reviewer would conclude after entering figures and being shown a
   * login wall instead of a result.
   *
   * So the visitor now always gets the answer they came for. Sign-in buys the
   * detailed breakdown, regime comparison, saved history and PDF — real extra
   * value rather than withholding the basic one. Omit for tools where a single
   * number doesn't make sense; the gate then behaves as before.
   */
  headline?: { label: string; value: string; hint?: string };
}

export default function ResultAuthGate({ toolName, headline }: ResultAuthGateProps) {
  const [modalTab, setModalTab] = useState<"login" | "signup" | null>(null);

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 via-persian-blue-50 to-blue-50">
      {headline && (
        <div className="px-6 pt-8 pb-6 text-center border-b border-blue-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            {headline.label}
          </div>
          <div className="text-4xl sm:text-5xl font-bold text-slate-900 tabular-nums">
            {headline.value}
          </div>
          {headline.hint && (
            <div className="text-xs text-slate-500 mt-2">{headline.hint}</div>
          )}
        </div>
      )}
      <CardContent className={headline ? "py-8 px-6 text-center" : "py-10 px-6 text-center"}>
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {headline ? "See the full breakdown" : "Sign in to see your result"}
        </h3>
        <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
          {headline
            ? `Sign in free to see how this was calculated — slab-by-slab breakdown, old vs new regime comparison, and a downloadable PDF. Your inputs stay right here, nothing resets.`
            : `Your ${toolName} result is ready. Sign in or create a free AiTaxBot account to view it — your inputs stay right here, nothing resets.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            onClick={() => setModalTab("signup")}
            data-testid="button-gate-signup"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Free Account
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setModalTab("login")}
            data-testid="button-gate-signin"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
        {/* Accuracy note: once signed in, the latest result for each calculator
            is saved to the account automatically so it's on the dashboard next
            visit. Saying "not saved unless you choose to" would misdescribe
            that, so the copy states plainly what happens and what doesn't. */}
        <p className="text-xs text-slate-400 mt-4">
          Free forever. Signing in saves your latest result to your dashboard —
          you can clear it any time.
        </p>
      </CardContent>

      {modalTab && (
        <AuthModal
          open={!!modalTab}
          onOpenChange={(open) => setModalTab(open ? modalTab : null)}
          defaultTab={modalTab}
          toolName={toolName}
        />
      )}
    </Card>
  );
}
