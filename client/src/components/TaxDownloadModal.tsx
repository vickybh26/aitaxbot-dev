/**
 * TaxDownloadModal
 *
 * Shown when a non-logged-in user clicks "Download PDF".
 * Flow:
 *   1. User fills name / email / mobile
 *   2. On submit:
 *      a. If email belongs to an existing account → show "sign in to download" step
 *      b. Otherwise → capture lead, email computation, show success + sign-up CTA
 */

import { useState } from "react";
import { X, Download, CheckCircle, ArrowRight, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/analytics";
import ModalShell from "@/components/ui/modal-shell";

interface TaxDownloadModalProps {
  open: boolean;
  onClose: () => void;
  summaryText: string;
  source?: string;
}

type Step = "form" | "exists" | "success";

export default function TaxDownloadModal({
  open,
  onClose,
  summaryText,
  source = "Income Tax Calculator",
}: TaxDownloadModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!mobile.trim() || !/^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ""))) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!dataConsent) {
      setError("Please agree to the Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if email is already registered
      const checkRes = await fetch(
        `/api/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        if (exists) {
          setStep("exists");
          setLoading(false);
          return;
        }
      }

      // 2. Not registered → capture lead and send computation email
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: mobile.trim(),
          source,
          summaryText,
          dataConsent,
          marketingConsent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      trackEvent("lead_created", "Lead Capture", source);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("form");
    setName("");
    setEmail("");
    setMobile("");
    setDataConsent(false);
    setMarketingConsent(false);
    setError("");
    onClose();
  }

  const signUpUrl = `/login?prefill_name=${encodeURIComponent(name)}&prefill_email=${encodeURIComponent(email)}&prefill_mobile=${encodeURIComponent(mobile)}`;
  const signInUrl = `/login?prefill_email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent("/calculators/income-tax")}`;

  if (!open) return null;

  return (
    <ModalShell
      onClose={handleClose}
      label="Download your tax computation"
      /* This dialog keeps its own absolutely-positioned backdrop child, so the
         shell's own click-to-dismiss would never fire — the backdrop element
         sits on top of it. Dismissal stays on that child; the shell still
         provides Escape, the focus trap and scroll lock. */
      closeOnOverlayClick={false}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className="bg-gradient-to-r from-ink to-credit px-6 pt-6 pb-8">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {step === "form" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100 text-sm font-medium">Your Tax Computation is Ready</span>
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">
                Get your detailed tax<br />breakdown — free
              </h2>
              {summaryText && (
                <p className="mt-3 text-sm text-blue-100 bg-card/10 rounded-lg px-3 py-2">
                  {summaryText}
                </p>
              )}
            </>
          )}

          {step === "exists" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <LogIn className="h-5 w-5 text-yellow-300" />
                <span className="text-blue-100 text-sm font-medium">Account Found</span>
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">
                You already have<br />an AiTaxBot account
              </h2>
            </>
          )}

          {step === "success" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span className="text-blue-100 text-sm font-medium">Sent!</span>
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">
                Your computation is<br />on its way to {email}
              </h2>
            </>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── Step: Form ── */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-ink/55 -mt-1">
                Enter your details and we'll email you the full breakdown — Old Regime vs New Regime, deductions, and more.
              </p>

              <div className="space-y-1">
                <Label htmlFor="td-name" className="text-ink/80">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="td-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  autoComplete="name"
                  className="border-rule focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="td-email" className="text-ink/80">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="td-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  autoComplete="email"
                  className="border-rule focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="td-mobile" className="text-ink/80">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="td-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  autoComplete="tel"
                  className="border-rule focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dataConsent}
                    onChange={(e) => setDataConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-rule"
                    data-testid="checkbox-data-consent"
                  />
                  <span className="text-xs text-ink/65">
                    I agree to AiTaxBot's{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-credit hover:underline">
                      Privacy Policy
                    </a>{" "}
                    and consent to my name, email, and mobile number being used to send me
                    this tax computation. <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-rule"
                    data-testid="checkbox-marketing-consent"
                  />
                  <span className="text-xs text-ink/65">
                    Also send me occasional tax tips and deadline reminders by email (optional).
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || !dataConsent}
                className="w-full bg-ink hover:bg-credit text-white font-semibold py-2.5 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Checking…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Get My Tax Computation
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* ── Step: Email already registered ── */}
          {step === "exists" && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>{email}</strong> is linked to an existing AiTaxBot account.
                  Sign in to download your computation instantly.
                </p>
              </div>

              <a href={signInUrl}>
                <Button className="w-full bg-ink hover:bg-credit text-white font-semibold">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In & Download
                </Button>
              </a>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-rule" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-ink/55">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setStep("form"); setEmail(""); setError(""); }}
              >
                Use a different email
              </Button>

              <Button variant="ghost" onClick={handleClose} className="w-full text-ink/55 hover:text-ink/65">
                Cancel
              </Button>
            </div>
          )}

          {/* ── Step: Success ── */}
          {step === "success" && (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  ✅ We've sent your computation to <strong>{email}</strong>. Check your inbox (and spam just in case).
                </p>
              </div>

              <div className="bg-gradient-to-br from-paper to-blue-50 border border-rule rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-ink font-semibold">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">Create your free AiTaxBot account</span>
                </div>
                <ul className="text-sm text-ink space-y-1 list-none pl-0">
                  <li className="flex items-center gap-2">✓ Save & revisit all your calculations</li>
                  <li className="flex items-center gap-2">✓ Get personalised tax-saving tips</li>
                  <li className="flex items-center gap-2">✓ Download PDFs directly — no form needed</li>
                </ul>
                <a href={signUpUrl}>
                  <Button className="w-full bg-ink hover:bg-credit text-white font-semibold">
                    Create Free Account
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>

              <Button variant="ghost" onClick={handleClose} className="w-full text-ink/55 hover:text-ink/65">
                Maybe later
              </Button>
            </div>
          )}

        </div>
      </div>
    </ModalShell>
  );
}
