import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  Search, MapPin, Mail, Shield, ChevronDown,
  BookOpen, Loader2, AlertCircle, CheckCircle2, X, CheckCircle
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
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
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

      <div>
        {/* Hero */}
        <div className="bg-gradient-to-br from-persian-blue-700 via-persian-blue-800 to-[#3a6fc4] text-white py-14 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Free · No Platform Fee · ICAI Verified
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Find a Chartered Accountant</h1>
            <p className="text-blue-100 max-w-xl mx-auto mb-8">
              Browse CA profiles and send your enquiry directly. CAs respond at their own discretion.
              No fees charged to users or CAs.
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
        <div className="bg-amber-50 border-b border-amber-100 py-2.5">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-amber-700 px-6">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              <strong>Informational directory only.</strong> AiTaxBot does not recommend, endorse, or refer any CA.
              Profiles are listed alphabetically. CAs are solely responsible for their professional conduct.
              Verify membership at{" "}
              <a
                href="https://www.icai.org/post.html?post_id=11967"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                ICAI Member Search
              </a>{" "}
              before engaging any professional. <a href="#disclaimer" className="underline font-medium">Full disclaimer ↓</a>
            </span>
          </div>
        </div>

        {/* Directory */}
        <div className="max-w-5xl mx-auto px-6 py-10">
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
              <Link href="/ca/register" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
                Are you a CA? List yourself for free →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ca) => (
              <div
                key={ca.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col"
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-[#4685d8] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {ca.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{ca.fullName}</h3>
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
                    className="flex-1 bg-[#4685d8] hover:bg-blue-700 text-white text-xs h-8"
                    onClick={() => { setContactCA(ca); setSent(false); }}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Send Enquiry
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* CTA for CAs */}
          {!loading && (
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-persian-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
              <h3 className="font-semibold text-slate-800 mb-1">Are you a Chartered Accountant?</h3>
              <p className="text-sm text-slate-500 mb-4">
                List your profile for free. Users looking for CA help during ITR filing season will
                be able to send you enquiries directly.
              </p>
              <Link href="/ca/register">
                <Button className="bg-persian-blue-700 hover:bg-persian-blue-800 text-white">
                  List Your Profile — It's Free
                </Button>
              </Link>
            </div>
          )}

          {/* ── Full Disclaimer ── */}
          <div id="disclaimer" className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 text-xs text-slate-500 leading-relaxed space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Disclaimer — CA Directory &amp; Enquiry Service
            </h2>

            <p>
              <strong className="text-slate-600">Nature of service.</strong> AiTaxBot ("Platform") operates as an
              informational directory that displays publicly available details of Chartered Accountants (CAs) who
              have voluntarily chosen to list their profiles. The Platform also provides a facility for users to
              submit enquiries that are forwarded to the selected CA. This is a passive technology service only.
              AiTaxBot does not render professional services and is not a party to any professional engagement.
            </p>

            <p>
              <strong className="text-slate-600">No referral, recommendation, or endorsement.</strong> AiTaxBot
              does not recommend, refer, guarantee, rate, rank, or endorse any CA listed on this directory.
              Profiles are displayed in alphabetical order only. No paid placement or premium ranking exists.
              The display of a CA profile does not constitute a representation as to the quality, competence,
              or suitability of that CA for any particular matter.
            </p>

            <p>
              <strong className="text-slate-600">No fees charged.</strong> AiTaxBot does not charge any fee to
              users for submitting enquiries, nor does it charge CAs for being listed on this directory. This
              service is provided free of charge as a public convenience.
            </p>

            <p>
              <strong className="text-slate-600">CA responds at their own discretion.</strong> Submission of an
              enquiry does not create any obligation on the part of the CA to respond. The CA decides
              independently whether to accept or decline any matter. No professional relationship is created
              between the user and any CA by reason of using this Platform.
            </p>

            <p>
              <strong className="text-slate-600">Verify before engaging.</strong> Users are strongly advised to
              independently verify the ICAI membership number and Certificate of Practice status of any CA
              before engaging their services or making any payment. Verification can be done at{" "}
              <a
                href="https://www.icai.org/post.html?post_id=11967"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600"
              >
                ICAI Member Search
              </a>.
            </p>

            <p>
              <strong className="text-slate-600">CA responsibility for ICAI compliance.</strong> CAs listed on
              this Platform are individually responsible for ensuring their profile content and professional
              conduct comply with the Chartered Accountants Act, 1949, the ICAI Code of Ethics 2026, and all
              applicable regulations. AiTaxBot does not verify compliance with ICAI advertising guidelines and
              accepts no liability for any professional misconduct by any listed CA.
            </p>

            <p>
              <strong className="text-slate-600">Limitation of liability.</strong> AiTaxBot is not a party to
              any professional engagement between the user and any CA. AiTaxBot shall not be liable for any
              professional advice given or omitted, any fees charged, or any outcome of the user's engagement
              with any CA. Users engage professional services entirely at their own risk.
            </p>

            <p>
              <strong className="text-slate-600">Data.</strong> Contact details submitted through the enquiry
              form are shared only with the specific CA selected by the user, for the sole purpose of enabling
              the user to seek professional services. Details are not sold, shared with third parties, or used
              for any other purpose. See our{" "}
              <Link href="/privacy-policy" className="underline text-blue-600">Privacy Policy</Link> for full details.
            </p>

            <p className="pt-1 border-t border-slate-100">
              For questions about this disclaimer, contact us at{" "}
              <a href="mailto:admin@aitaxbot.co.in" className="underline text-blue-600">
                admin@aitaxbot.co.in
              </a>.
            </p>
          </div>

          {/* ── ICAI Code of Ethics Compliance ── */}
          <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-6 text-xs text-slate-600 leading-relaxed">
            <h2 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              How This Directory Complies with the ICAI Code of Ethics 2026
            </h2>
            <p className="text-slate-500 mb-4">
              AiTaxBot has designed this directory in accordance with the Chartered Accountants Act, 1949
              (First Schedule, Part I) and the ICAI Code of Ethics 2026 (13th Edition, effective 1 April 2026),
              including the Council Guidelines for Advertisement, 2008 (updated December 2025). The following
              provisions of the Code are directly addressed by our design choices.
            </p>

            <div className="space-y-3">

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">Clause 5, First Schedule Part I — No payment for securing professional business.</strong>{" "}
                  AiTaxBot charges no fee to CAs for listing and no commission on any engagement. No CA pays
                  AiTaxBot to obtain clients. This eliminates the core risk under Clause 5 (securing
                  professional business through a third party for payment).
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">Clause 6 Proviso (ii), First Schedule Part I — Response to organisation-issued enquiry.</strong>{" "}
                  Every contact on this platform is a user-initiated enquiry forwarded by the Platform to the CA.
                  This fits the express safe harbour in Clause 6 Proviso (ii): a CA responding to an enquiry
                  issued by an organisation is not in violation of the prohibition on solicitation. The CA does
                  not initiate contact with users.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">Clause 6 Item K — No roving circulars or cold outreach.</strong>{" "}
                  CAs listed here do not send circulars or cold messages to users. The enquiry flow is strictly
                  one-directional: user → Platform → CA. The Platform does not provide a mechanism for CAs to
                  mass-contact users or to push their profiles to users who have not searched for them.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.1.2(iii), Council Guidelines for Advertisement, 2008 — Directories are a permitted medium.</strong>{" "}
                  The Council's definition of "write-up" expressly includes writing or display of CA particulars
                  published "by way of print or electronic mode or otherwise including in… Directories… and
                  websites." This directory is a permitted medium for CA profile particulars under the
                  Advertisement Guidelines.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.1.3(E) — No testimonials or endorsements.</strong>{" "}
                  This directory does not display user reviews, star ratings, satisfaction scores, or any
                  testimonial or endorsement concerning any CA or the fees they charge. Profile content is
                  limited to factual particulars only.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.1.3(F) — No awards, achievements, or positions.</strong>{" "}
                  CA profiles on this Platform do not display awards, rankings, "Top CA" badges, accreditations,
                  or positions held (other than ICAI designation and membership number). No comparative claims
                  about a CA's superiority to other CAs are made or permitted.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.4 — Online Third Party Platforms — contact details not displayed.</strong>{" "}
                  In accordance with §3.4 of the Advertisement Guidelines (which governs non-CA websites
                  facilitating CA advisory services), the CA's direct contact details — phone number, email
                  address, and professional address — are not displayed on the public-facing profile. Enquiries
                  are routed to the CA via the Platform's backend only. Users contact the CA through the
                  Platform's enquiry form, not through a publicly exposed address.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.5 — Application-based Aggregators — non-exclusive services only.</strong>{" "}
                  §3.5 of the Advertisement Guidelines states: "there is no restriction on listing [with
                  online aggregators] for non-exclusive Services." All services listed on this Platform —
                  ITR filing, tax advisory, GST, NRI tax, financial planning — are non-exclusive professional
                  services. Services exclusively reserved for Chartered Accountants (statutory audit, tax audit
                  under §44AB) are not offered as selectable categories on this Platform.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.6 — Specialised Directories — alphabetical listing.</strong>{" "}
                  §3.6 expressly permits a CA's name, description and address to appear in "any directory or
                  list of members of a particular body in which the names are listed alphabetically." Profiles
                  on this Platform are listed alphabetically. No paid placement, ranking by revenue, or
                  non-alphabetical ordering is used.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">§3.3.14 — Website design must not amount to solicitation.</strong>{" "}
                  The Platform is designed so that no element of the user interface constitutes solicitation
                  of professional work on behalf of any CA. There are no "Book Now," "Hire This CA," or
                  urgency-driven calls to action. The Platform uses neutral language ("Send Enquiry,"
                  "Informational directory only") throughout.
                </div>
              </div>

            </div>

            <p className="mt-4 pt-3 border-t border-green-200 text-slate-500">
              This compliance framework applies to CAs in practice (Certificate of Practice holders) who are
              subject to First Schedule Part I of the Chartered Accountants Act, 1949. Non-practising CAs
              are not subject to these restrictions and may list freely. Nothing in this compliance statement
              constitutes legal advice. CAs are individually responsible for their own compliance with ICAI
              rules. Last reviewed against ICAI Code of Ethics 2026 (13th Edition, effective 1 April 2026)
              and Council Guidelines for Advertisement, 2008 (updated December 2025).
            </p>
          </div>
        </div>
      </div>

      {/* Contact / Introduction Modal */}
      {contactCA && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Send an Enquiry</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  to <strong>{contactCA.fullName}</strong>
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
                <h3 className="font-semibold text-slate-800 mb-1">Enquiry Sent!</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Your enquiry has been forwarded to {contactCA.fullName}. The CA will contact you
                  directly at their discretion. Response times vary by individual CA.
                </p>
                <Button onClick={closeModal} variant="outline" className="w-full">Close</Button>
                <p className="text-xs text-slate-400 mt-3">
                  Please verify ICAI membership number at icai.org before engaging or paying any fees.
                </p>
              </div>
            ) : (
              <form onSubmit={sendContact} className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
                  <p><strong>You are sending an enquiry directly to this CA.</strong> AiTaxBot only
                  forwards your message — it does not recommend, guarantee, or vouch for any CA.</p>
                  <p>The CA will respond at their own discretion. AiTaxBot charges no fee to you or the CA for this.</p>
                  <p>Verify ICAI membership at{" "}
                    <a
                      href="https://www.icai.org/post.html?post_id=11967"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      icai.org
                    </a>{" "}
                    before making any payment or sharing financial documents.
                  </p>
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
                  className="w-full bg-persian-blue-700 hover:bg-persian-blue-800 text-white"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
                  ) : (
                    "Send My Enquiry"
                  )}
                </Button>

                <p className="text-xs text-slate-400 text-center">
                  By submitting, you consent to AiTaxBot forwarding your contact details and enquiry
                  to the selected CA for the sole purpose of enabling you to seek their professional
                  services. No fees are charged for this service.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
