/**
 * TaxDownloadModal
 *
 * Shows after a user calculates their income tax.
 * Gate-keeps the computation summary behind a name/email/mobile form.
 * After submission: captures lead → emails summary → shows sign-up CTA.
 */

import { useState } from "react";
import { X, Download, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/analytics";

interface TaxDownloadModalProps {
  open: boolean;
  onClose: () => void;
  summaryText: string;   // Human-readable one-liner, e.g. "New Regime: ₹48,100 tax | Income: ₹8,00,000"
  source?: string;
}

type Step = "form" | "success";

export default function TaxDownloadModal({ open, onClose, summaryText, source = "Income Tax Calculator" }: TaxDownloadModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!name.trim() || name.trim().length < 2) { setError("Please enter your full name."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (!mobile.trim() || !/^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ""))) { setError("Please enter a valid 10-digit Indian mobile number."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: mobile.trim(),
          source,
          summaryText,
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
    setName(""); setEmail(""); setMobile(""); setError("");
    onClose();
  }

  // Build sign-up URL with pre-filled params
  const signUpUrl = `/login?prefill_name=${encodeURIComponent(name)}&prefill_email=${encodeURIComponent(email)}&prefill_mobile=${encodeURIComponent(mobile)}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 pt-6 pb-8">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {step === "form" ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100 text-sm font-medium">Your Tax Computation is Ready</span>
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">
                Get your detailed tax<br />breakdown — free
              </h2>
              {summaryText && (
                <p className="mt-3 text-sm text-blue-100 bg-white/10 rounded-lg px-3 py-2">
                  {summaryText}
                </p>
              )}
            </>
          ) : (
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
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-500 -mt-1">
                Enter your details and we'll email you a full breakdown — Old Regime vs New Regime, deductions, and more.
              </p>

              <div className="space-y-1">
                <Label htmlFor="td-name" className="text-slate-700">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="td-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  autoComplete="name"
                  className="border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="td-email" className="text-slate-700">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="td-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  autoComplete="email"
                  className="border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="td-mobile" className="text-slate-700">Mobile Number <span className="text-red-500">*</span></Label>
                <Input
                  id="td-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  autoComplete="tel"
                  className="border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Get My Tax Computation
                  </span>
                )}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                No spam. We'll only send your computation and useful tax reminders.
              </p>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  ✅ We've sent your computation to <strong>{email}</strong>. Check your inbox (and spam just in case).
                </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">Create your free AiTaxBot account</span>
                </div>
                <ul className="text-sm text-indigo-700 space-y-1 list-none pl-0">
                  <li className="flex items-center gap-2">✓ Save & revisit all your calculations</li>
                  <li className="flex items-center gap-2">✓ Get personalised tax-saving tips</li>
                  <li className="flex items-center gap-2">✓ Track ITR filing deadlines</li>
                </ul>
                <a href={signUpUrl}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                    Create Free Account
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>

              <Button variant="ghost" onClick={handleClose} className="w-full text-slate-400 hover:text-slate-600">
                Maybe later
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
