import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Search, MapPin, Mail, MessageCircle, Phone, Shield, ChevronDown,
  BookOpen, ExternalLink, Loader2, AlertCircle, CheckCircle2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CA_PRACTICE_AREA_LABELS, type CAPracticeArea, CA_PRACTICE_AREAS } from "@shared/schema";

interface CAProfile {
  id: string;
  fullName: string;
  firmName?: string | null;
  city: string;
  state: string;
  practiceAreas: CAPracticeArea[];
  languages: string[];
  yearsOfPractice: number;
  email: string;
  whatsappNumber?: string | null;
  bio?: string | null;
  icaiMembershipNumber: string;
}

interface ContactForm {
  userName: string;
  userEmail: string;
  userPhone: string;
  taxIssue: string;
}

export default function FindCA() {
  const [profiles, setProfiles] = useState<CAProfile[]>([]);
  const [filtered, setFiltered] = useState<CAProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState<CAPracticeArea | "">("");

  // Contact modal state
  const [contactCA, setContactCA] = useState<CAProfile | null>(null);
  const [form, setForm] = useState<ContactForm>({ userName: "", userEmail: "", userPhone: "", taxIssue: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    fetch("/api/ca/list")
      .then((r) => r.json())
      .then((data) => {
        setProfiles(data.profiles || []);
        setFiltered(data.profiles || []);
      })
      .catch(() => setError("Could not load CA directory. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = [...profiles];
    if (cityFilter.trim()) {
      list = list.filter((p) =>
        p.city.toLowerCase().includes(cityFilter.toLowerCase()) ||
        p.state.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }
    if (areaFilter) {
      list = list.filter((p) => p.practiceAreas.includes(areaFilter));
    }
    setFiltered(list);
  }, [cityFilter, areaFilter, profiles]);

  async function sendContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactCA) return;
    setSending(true);
    setContactError("");
    try {
      const res = await fetch("/api/ca/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caId: contactCA.id,
          caName: contactCA.fullName,
          caEmail: contactCA.email,
          ...form,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setContactError(body.error || "Could not send. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setContactError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function closeModal() {
    setContactCA(null);
    setForm({ userName: "", userEmail: "", userPhone: "", taxIssue: "" });
    setSent(false);
    setContactError("");
  }

  return (
    <>
      <Helmet>
        <title>Find a CA Near You — AiTaxBot | Free CA Introduction Service</title>
        <meta
          name="description"
          content="Connect with practicing Chartered Accountants for ITR filing, tax planning, NRI taxation, capital gains, and GST. Free introduction service by AiTaxBot."
        />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-14 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Free Introduction · ICAI Verified
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Find a Chartered Accountant</h1>
            <p className="text-blue-100 max-w-xl mx-auto mb-8">
              Connect with practicing CAs for ITR filing, tax planning, NRI taxation, and more.
              Free introduction service — no platform fee.
            </p>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Search by city or state"
                  className="pl-9 bg-white text-slate-800 h-11 border-0"
                />
              </div>
              <div className="relative">
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value as CAPracticeArea | "")}
                  className="h-11 px-4 pr-8 rounded-md border-0 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none w-full sm:w-auto"
                >
                  <option value="">All Services</option>
                  {CA_PRACTICE_AREAS.map((a) => (
                    <option key={a} value={a}>{CA_PRACTICE_AREA_LABELS[a]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Compliance banner */}
        <div className="bg-amber-50 border-b border-amber-100 py-2 px-4">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-amber-700">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            AiTaxBot is a technology platform and does not recommend or endorse any CA. Profiles
            are listed in alphabetical order only. Please verify credentials at{" "}
            <a
              href="https://www.icai.org/post.html?post_id=11967"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              ICAI Member Search
            </a>{" "}
            before engaging professional services.
          </div>
        </div>

        {/* Directory */}
        <div className="max-w-5xl mx-auto px-4 py-10">
          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading directory…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-slate-700">No CAs found</h3>
              <p className="text-slate-500 mt-1">
                {profiles.length === 0
                  ? "The directory is being built. Check back soon!"
                  : "Try a different city or service filter."}
              </p>
              <a href="/ca/register" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
                Are you a CA? List yourself for free →
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ca) => (
              <div
                key={ca.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {ca.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{ca.fullName}</h3>
                    {ca.firmName && (
                      <p className="text-xs text-slate-500 truncate">{ca.firmName}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">ICAI {ca.icaiMembershipNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{ca.city}, {ca.state}</span>
                  <span className="mx-1">·</span>
                  <span>{ca.yearsOfPractice}y exp.</span>
                </div>

                {/* Bio */}
                {ca.bio && (
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed line-clamp-2">{ca.bio}</p>
                )}

                {/* Practice areas */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {ca.practiceAreas.slice(0, 4).map((area) => (
                    <span
                      key={area}
                      className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
                    >
                      {CA_PRACTICE_AREA_LABELS[area]}
                    </span>
                  ))}
                  {ca.practiceAreas.length > 4 && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                      +{ca.practiceAreas.length - 4} more
                    </span>
                  )}
                </div>

                {/* Languages */}
                <p className="text-xs text-slate-400 mb-4">
                  {ca.languages.join(" · ")}
                </p>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                    onClick={() => { setContactCA(ca); setSent(false); }}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Get Intro
                  </Button>
                  {ca.whatsappNumber && (
                    <a
                      href={`https://wa.me/${ca.whatsappNumber.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(ca.fullName)}%2C%20I%20found%20your%20profile%20on%20AiTaxBot%20and%20need%20help%20with%20my%20taxes.`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="h-8 px-2.5 border-green-200 text-green-600 hover:bg-green-50">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA for CAs */}
          {!loading && (
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 text-center">
              <h3 className="font-semibold text-slate-800 mb-1">Are you a Chartered Accountant?</h3>
              <p className="text-sm text-slate-500 mb-4">
                List your practice for free. Connect with taxpayers actively looking for CA help
                during ITR filing season.
              </p>
              <a href="/ca/register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  List Your Practice — It's Free
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Contact / Introduction Modal */}
      {contactCA && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Request Introduction</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  to <strong>{contactCA.fullName}</strong>
                  {contactCA.firmName ? `, ${contactCA.firmName}` : ""}
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sent ? (
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">Introduction Sent!</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {contactCA.fullName} will reach out to you directly. We've also sent you a
                  confirmation email.
                </p>
                <Button onClick={closeModal} variant="outline" className="w-full">Close</Button>
                <p className="text-xs text-slate-400 mt-3">
                  Reminder: Please verify ICAI credentials before engaging professional services.
                </p>
              </div>
            ) : (
              <form onSubmit={sendContact} className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  AiTaxBot is a technology introduction service. We do not recommend or endorse any
                  CA. Please verify credentials at{" "}
                  <a
                    href="https://www.icai.org/post.html?post_id=11967"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ICAI Member Search
                  </a>{" "}
                  before engaging.
                </div>

                <div>
                  <Label>Your Name *</Label>
                  <Input
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    placeholder="Ramesh Sharma"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Your Email *</Label>
                  <Input
                    type="email"
                    value={form.userEmail}
                    onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone (optional)</Label>
                  <Input
                    type="tel"
                    value={form.userPhone}
                    onChange={(e) => setForm({ ...form, userPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>What do you need help with? *</Label>
                  <Textarea
                    value={form.taxIssue}
                    onChange={(e) => setForm({ ...form, taxIssue: e.target.value })}
                    rows={3}
                    placeholder="e.g. I have salary + freelance income and need help filing ITR-3 for FY 2025-26."
                    required
                    minLength={10}
                    maxLength={500}
                    className="mt-1"
                  />
                </div>

                {contactError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {contactError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
                  ) : (
                    "Send Introduction Request"
                  )}
                </Button>

                <p className="text-xs text-slate-400 text-center">
                  By submitting, you agree that AiTaxBot may share your contact details with the
                  selected CA for the purpose of this introduction only.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
