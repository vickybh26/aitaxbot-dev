import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import { trackPageView } from "@/lib/analytics";
import {
  FileText, Download, Mail, CheckCircle2, AlertCircle,
  ArrowRight, Home, Calculator, Info, Loader2, Plus, Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReceiptForm {
  tenantName: string;
  tenantAddress: string;
  landlordName: string;
  landlordAddress: string;
  landlordPan: string;
  propertyAddress: string;
  rentAmount: string;
  paymentMode: string;
  chequeDetails: string;
}

interface MonthEntry {
  month: number; // 1-12
  year: number;
}

const MONTHS = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
const PAYMENT_MODES = ["Cash","Bank Transfer / NEFT / RTGS","UPI","Cheque","Other"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysInMonth(m: number, y: number) { return new Date(y, m, 0).getDate(); }

function formatPeriod(m: number, y: number): { from: string; to: string } {
  return {
    from: `1 ${MONTHS[m - 1]} ${y}`,
    to:   `${daysInMonth(m, y)} ${MONTHS[m - 1]} ${y}`,
  };
}

function receiptNumber(base: string, index: number): string {
  return `${base}-${String(index + 1).padStart(3, "0")}`;
}

function buildReceiptDate(m: number, y: number): string {
  return new Date(y, m - 1, daysInMonth(m, y)).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RentReceiptGenerator() {
  const { toast } = useToast();

  const [form, setForm] = useState<ReceiptForm>({
    tenantName: "", tenantAddress: "", landlordName: "",
    landlordAddress: "", landlordPan: "", propertyAddress: "",
    rentAmount: "", paymentMode: "Cash", chequeDetails: "",
  });

  const [months, setMonths] = useState<MonthEntry[]>([
    { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
  ]);

  const [receiptPrefix, setReceiptPrefix] = useState("RR");
  const [emailTo, setEmailTo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailResult, setEmailResult] = useState<{ userExists: boolean; sent: boolean } | null>(null);
  const [errors, setErrors] = useState<Partial<ReceiptForm & { months: string; email: string }>>({});

  const rentAmt = parseFloat(form.rentAmount) || 0;
  const annualRent = rentAmt * 12;
  const needsPan = annualRent > 100000;
  const needsStamp = rentAmt > 5000;

  useEffect(() => {
    trackPageView("/tools/rent-receipt", "Rent Receipt Generator — AiTaxBot");
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.tenantName.trim()) e.tenantName = "Tenant name is required";
    if (!form.landlordName.trim()) e.landlordName = "Landlord name is required";
    if (!form.propertyAddress.trim()) e.propertyAddress = "Property address is required";
    if (!form.rentAmount || isNaN(rentAmt) || rentAmt <= 0) e.rentAmount = "Enter a valid rent amount";
    if (needsPan && !form.landlordPan.trim()) e.landlordPan = "PAN is required when annual rent > ₹1,00,000";
    if (form.landlordPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.landlordPan.toUpperCase()))
      e.landlordPan = "PAN format: AAAAA9999A";
    if (months.length === 0) e.months = "Add at least one month";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Build payload ─────────────────────────────────────────────────────────
  function buildReceipts() {
    return months.map((m, i) => {
      const { from, to } = formatPeriod(m.month, m.year);
      return {
        receiptNumber: receiptNumber(receiptPrefix, i),
        receiptDate: buildReceiptDate(m.month, m.year),
        tenantName: form.tenantName.trim(),
        tenantAddress: form.tenantAddress.trim() || undefined,
        landlordName: form.landlordName.trim(),
        landlordAddress: form.landlordAddress.trim() || undefined,
        landlordPan: form.landlordPan.trim().toUpperCase() || undefined,
        propertyAddress: form.propertyAddress.trim(),
        rentAmount: rentAmt,
        rentPeriodFrom: from,
        rentPeriodTo: to,
        paymentMode: form.paymentMode,
        chequeDetails: form.chequeDetails.trim() || undefined,
      };
    });
  }

  // ── Download PDF ──────────────────────────────────────────────────────────
  async function handleDownload() {
    if (!validate()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/rent-receipt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipts: buildReceipts() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = months.length === 1
        ? `Rent_Receipt_${MONTHS[months[0].month - 1]}_${months[0].year}.pdf`
        : `Rent_Receipts_${months.length}_months.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Receipt downloaded!", description: `${months.length} receipt${months.length > 1 ? "s" : ""} saved as PDF.` });
    } catch {
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Email PDF ─────────────────────────────────────────────────────────────
  async function handleEmail() {
    if (!validate()) return;
    if (!emailTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
      setErrors(e => ({ ...e, email: "Enter a valid email address" }));
      return;
    }
    setErrors(e => { const { email: _, ...rest } = e; return rest; });
    setIsEmailing(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/rent-receipt/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipts: buildReceipts(), email: emailTo, recipientName: form.tenantName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEmailResult({ userExists: data.userExists, sent: data.emailSent !== false });
      toast({ title: "Receipt sent!", description: `Email sent to ${emailTo}` });
    } catch {
      toast({ title: "Email failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsEmailing(false);
    }
  }

  // ── Month management ──────────────────────────────────────────────────────
  function addMonth() {
    const last = months[months.length - 1] || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
    const next = last.month === 12 ? { month: 1, year: last.year + 1 } : { month: last.month + 1, year: last.year };
    setMonths(m => [...m, next]);
  }

  function fillFullYear(year: number) {
    setMonths(Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year })));
  }

  function updateMonth(index: number, field: "month" | "year", value: number) {
    setMonths(m => m.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  function removeMonth(index: number) {
    setMonths(m => m.filter((_, i) => i !== index));
  }

  // ── Field helpers ─────────────────────────────────────────────────────────
  const field = (key: keyof ReceiptForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      if (errors[key]) setErrors(err => { const { [key]: _, ...rest } = err; return rest; });
    },
  });

  const inputClass = (err?: string) =>
    `w-full px-3 py-2.5 text-sm rounded-lg border ${err ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"} focus:outline-none focus:ring-2 focus:ring-persian-blue-300 transition`;

  return (
    <>
      <Helmet>
        <title>Free Rent Receipt Generator India — Download & Email PDF | AiTaxBot</title>
        <meta name="description" content="Generate professional rent receipts instantly. Download as PDF or email to yourself. Includes landlord PAN, revenue stamp reminder, and HRA exemption link. Free, no signup required." />
        <meta name="keywords" content="rent receipt generator India, rent receipt PDF, HRA rent receipt, landlord tenant receipt, free rent receipt" />
        <link rel="canonical" href="https://aitaxbot.co.in/tools/rent-receipt" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-persian-blue-600 font-semibold mb-2">
              <Home className="h-4 w-4" /> Tools
              <span className="text-slate-400">/</span>
              Rent Receipt Generator
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Rent Receipt Generator</h1>
            <p className="text-slate-500 max-w-2xl">
              Generate professional, HRA-compliant rent receipts in seconds. Download as PDF or send directly to your email — free, no account needed.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              {["100% Free", "No Signup Required", "HRA-Compliant Format", "Bulk — Full Year in 1 Click"].map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── FORM ──────────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Tenant & Landlord */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-persian-blue-600" /> Tenant & Landlord Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tenant Name *</label>
                    <input placeholder="Full name of tenant" className={inputClass(errors.tenantName)} {...field("tenantName")} />
                    {errors.tenantName && <p className="text-xs text-red-500 mt-1">{errors.tenantName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Landlord Name *</label>
                    <input placeholder="Full name of landlord" className={inputClass(errors.landlordName)} {...field("landlordName")} />
                    {errors.landlordName && <p className="text-xs text-red-500 mt-1">{errors.landlordName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tenant Address</label>
                    <input placeholder="Tenant's current address (optional)" className={inputClass()} {...field("tenantAddress")} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Landlord Address</label>
                    <input placeholder="Landlord's address (optional)" className={inputClass()} {...field("landlordAddress")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Property Address *</label>
                    <input placeholder="Full address of the rented property" className={inputClass(errors.propertyAddress)} {...field("propertyAddress")} />
                    {errors.propertyAddress && <p className="text-xs text-red-500 mt-1">{errors.propertyAddress}</p>}
                  </div>
                </div>
              </div>

              {/* Rent Details */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-persian-blue-600" /> Rent & Payment Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Rent (₹) *</label>
                    <input type="number" placeholder="e.g. 15000" min={1} className={inputClass(errors.rentAmount)} {...field("rentAmount")} />
                    {errors.rentAmount && <p className="text-xs text-red-500 mt-1">{errors.rentAmount}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                    <select className={inputClass()} {...field("paymentMode")}>
                      {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  {form.paymentMode === "Cheque" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Cheque No. & Bank</label>
                      <input placeholder="e.g. 004521 — HDFC Bank, MG Road Branch" className={inputClass()} {...field("chequeDetails")} />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Landlord PAN {needsPan ? <span className="text-red-500">*</span> : <span className="text-slate-400">(optional)</span>}
                    </label>
                    <input placeholder="AAAPL1234C" maxLength={10} className={inputClass(errors.landlordPan)}
                      {...field("landlordPan")}
                      onChange={e => { setForm(f => ({ ...f, landlordPan: e.target.value.toUpperCase() })); if (errors.landlordPan) setErrors(er => { const { landlordPan: _, ...r } = er; return r; }); }}
                    />
                    {errors.landlordPan && <p className="text-xs text-red-500 mt-1">{errors.landlordPan}</p>}
                    {needsPan && !errors.landlordPan && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Annual rent exceeds ₹1L — PAN mandatory (Section 194-IB)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Receipt Prefix</label>
                    <input placeholder="RR" maxLength={8} className={inputClass()} value={receiptPrefix} onChange={e => setReceiptPrefix(e.target.value.toUpperCase() || "RR")} />
                    <p className="text-xs text-slate-400 mt-1">First receipt will be {receiptPrefix}-001</p>
                  </div>
                </div>

                {/* Inline tips */}
                {needsStamp && (
                  <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Revenue Stamp: A ₹1 revenue stamp is required on the <em>physical</em> copy of each receipt as rent exceeds ₹5,000/month.</p>
                  </div>
                )}
              </div>

              {/* Month Selector */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-base font-bold text-slate-900">Rent Periods</h2>
                  <div className="flex gap-2 flex-wrap">
                    {YEAR_OPTIONS.map(y => (
                      <button key={y} onClick={() => fillFullYear(y)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-persian-blue-200 text-persian-blue-600 hover:bg-persian-blue-50 font-semibold transition">
                        Full Year {y}
                      </button>
                    ))}
                  </div>
                </div>

                {errors.months && <p className="text-xs text-red-500 mb-2">{errors.months}</p>}

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {months.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                      <span className="text-xs font-bold text-slate-400 w-6">{i + 1}.</span>
                      <select value={entry.month} onChange={e => updateMonth(i, "month", +e.target.value)}
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-persian-blue-300">
                        {MONTHS.map((m, mi) => <option key={mi + 1} value={mi + 1}>{m}</option>)}
                      </select>
                      <select value={entry.year} onChange={e => updateMonth(i, "year", +e.target.value)}
                        className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-persian-blue-300">
                        {YEAR_OPTIONS.map(y => <option key={y}>{y}</option>)}
                      </select>
                      <button onClick={() => removeMonth(i)} className="text-slate-400 hover:text-red-500 transition p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={addMonth} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-persian-blue-600 hover:text-persian-blue-700 transition">
                  <Plus className="h-3.5 w-3.5" /> Add another month
                </button>
                {months.length > 1 && (
                  <p className="text-xs text-slate-400 mt-2">Will generate {months.length} receipts as a single PDF ({months.length} pages)</p>
                )}
              </div>

              {/* Download & Email actions */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4">Generate Receipt</h2>

                {/* Download */}
                <button onClick={handleDownload} disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-persian-blue-600 hover:bg-persian-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition text-sm mb-4">
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isGenerating ? "Generating PDF…" : `Download PDF${months.length > 1 ? ` (${months.length} receipts)` : ""}`}
                </button>

                {/* Email */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-persian-blue-600" /> Or send to email
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input type="email" value={emailTo} onChange={e => { setEmailTo(e.target.value); setErrors(er => { const { email: _, ...r } = er; return r; }); setEmailResult(null); }}
                        placeholder="your@email.com" className={inputClass(errors.email)} />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                    <button onClick={handleEmail} disabled={isEmailing}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition flex-shrink-0">
                      {isEmailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {isEmailing ? "Sending…" : "Send"}
                    </button>
                  </div>

                  {emailResult?.sent && (
                    <div className={`mt-3 rounded-xl p-3 flex items-start gap-2 ${emailResult.userExists ? "bg-persian-blue-50 border border-persian-blue-200" : "bg-emerald-50 border border-emerald-200"}`}>
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${emailResult.userExists ? "text-persian-blue-600" : "text-emerald-600"}`} />
                      <div>
                        <p className={`text-xs font-semibold ${emailResult.userExists ? "text-persian-blue-700" : "text-emerald-700"}`}>
                          {emailResult.userExists ? "Receipt sent + Dashboard link included" : "Receipt sent + Free account invite included"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {emailResult.userExists
                            ? "We've included a link to your AiTaxBot dashboard where you can view this receipt."
                            : "We've included an invite to create your free AiTaxBot account to save receipts and access all calculators."}
                        </p>
                        {!emailResult.userExists && (
                          <a href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-persian-blue-600 hover:underline mt-1">
                            Create free account <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── SIDEBAR ───────────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Live summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-20">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Receipt Preview</h3>
                <dl className="space-y-2 text-xs">
                  {[
                    { label: "Tenant", value: form.tenantName || "—" },
                    { label: "Landlord", value: form.landlordName || "—" },
                    { label: "Property", value: form.propertyAddress || "—" },
                    { label: "Monthly Rent", value: rentAmt > 0 ? `₹${rentAmt.toLocaleString("en-IN")}` : "—" },
                    { label: "Annual Rent", value: rentAmt > 0 ? `₹${(rentAmt * 12).toLocaleString("en-IN")}` : "—" },
                    { label: "Payment", value: form.paymentMode },
                    { label: "Receipts", value: months.length > 0 ? `${months.length} month${months.length > 1 ? "s" : ""}` : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-slate-400 flex-shrink-0">{label}</dt>
                      <dd className="text-slate-800 font-medium text-right truncate max-w-[140px]">{value}</dd>
                    </div>
                  ))}
                </dl>

                {rentAmt > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    {needsPan && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                        <Info className="h-3 w-3 flex-shrink-0" /> PAN required (rent &gt; ₹1L/yr)
                      </div>
                    )}
                    {needsStamp && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                        <Info className="h-3 w-3 flex-shrink-0" /> Revenue stamp needed on physical copy
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* HRA CTA */}
              <div className="bg-gradient-to-br from-persian-blue-600 to-persian-blue-800 rounded-2xl p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-persian-blue-200 mb-1">Next step</p>
                <h3 className="text-base font-bold mb-2">Calculate HRA Exemption</h3>
                <p className="text-xs text-persian-blue-100 mb-4 leading-relaxed">
                  Use your rent receipts to claim HRA exemption under Section 10(13A). Our calculator shows exactly how much you can save.
                </p>
                <a href="/calculators/hra" className="flex items-center justify-center gap-1.5 bg-white text-persian-blue-700 font-bold text-sm py-2 rounded-xl hover:bg-persian-blue-50 transition">
                  HRA Calculator <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Tips */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Tips</h3>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  {[
                    { icon: "📋", tip: "Keep receipts for all 12 months to submit for HRA exemption with your employer (Form 12BB)." },
                    { icon: "🔢", tip: "If annual rent exceeds ₹1,00,000, landlord PAN is mandatory — TDS @5% may apply under Sec 194-IB." },
                    { icon: "🏷️", tip: "A ₹1 revenue stamp is legally required on physical receipts when rent exceeds ₹5,000/month." },
                    { icon: "📅", tip: "Use 'Full Year' button to generate 12 receipts at once — ideal for year-end HRA claims." },
                  ].map(({ icon, tip }) => (
                    <li key={tip} className="flex gap-2">
                      <span className="flex-shrink-0">{icon}</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
