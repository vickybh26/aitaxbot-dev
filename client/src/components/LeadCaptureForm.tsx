/**
 * LeadCaptureForm — Drop below any calculator result.
 *
 * Props:
 *   source      — calculator name, e.g. "Income Tax Calculator"
 *   summaryText — key result string shown in email, e.g. "Tax: ₹42,000 | New Regime"
 *
 * Fires GA4 lead_created event on success.
 * Sends user a personalised email with their result + ITR deadline reminder.
 */

import { useState } from "react";
import { Mail, Phone, CheckCircle2, Loader2, X, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface Props {
  source: string;
  summaryText?: string;
}

export default function LeadCaptureForm({ source, summaryText }: Props) {
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [whatsapp, setWhatsapp]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Read UTM params from URL
  const params = new URLSearchParams(window.location.search);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim() || null,
          source,
          summaryText: summaryText || null,
          utmSource:   params.get("utm_source"),
          utmMedium:   params.get("utm_medium"),
          utmCampaign: params.get("utm_campaign"),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Something went wrong. Please try again.");
        return;
      }

      // Fire GA4 lead_created key event
      trackEvent("lead_created", "Lead Capture", source);

      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-800 text-sm">Result sent to {email}!</p>
          <p className="text-green-700 text-xs mt-0.5">
            Check your inbox for your calculation summary and the ITR deadline reminder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 relative bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border border-blue-100 rounded-2xl p-5">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/60 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-tight">
            Get your result by email
          </p>
          <p className="text-xs text-slate-500">
            + ITR deadline reminder &amp; free CA connect
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-2.5">
        {/* Name + Email on one row (desktop) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
          />
          <div className="relative flex-1">
            <Mail className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* WhatsApp (optional) */}
        <div className="relative">
          <Phone className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp number (optional — for filing reminders)"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-xs">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            "Send to my email — Free"
          )}
        </button>

        <p className="text-xs text-slate-400 text-center">
          No spam. Unsubscribe anytime. We never share your details.
        </p>
      </form>
    </div>
  );
}
