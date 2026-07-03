import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackPageView } from "@/lib/analytics";
import {
  FileText, Upload, AlertCircle, CheckCircle2, AlertTriangle,
  Download, Loader2, ChevronDown, ChevronUp, Info, Shield,
  ArrowRight, RefreshCw, LogIn, Lock, Zap, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedAIS {
  salaryIncome: number | null;
  interestFromSavings: number | null;
  interestFromFD: number | null;
  dividendIncome: number | null;
  securitiesTransactions: number | null;
  mutualFundTransactions: number | null;
  cryptoIncome: number | null;
  lrsRemittance: number | null;
}

interface Extracted26AS {
  tdsSalary: number | null;
  tdsNonSalary: number | null;
  advanceTaxPaid: number | null;
  selfAssessmentTax: number | null;
  totalTdsCredits: number | null;
  employerName?: string;
  employerTAN?: string;
}

interface ExtractedForm16 {
  employerName: string | null;
  employerTAN: string | null;
  employeePAN: string | null;
  grossSalary: number | null;
  standardDeduction: number | null;
  taxableIncome: number | null;
  totalTaxDeducted: number | null;
  newRegime: boolean | null;
  rebate87A: number | null;
  cess: number | null;
  totalTaxPayable: number | null;
}

interface ReconciliationMismatch {
  id: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "OK";
  title: string;
  description: string;
  aisValue: number | null;
  form16Value: number | null;
  form26asValue: number | null;
  difference: number | null;
  ruleExplanation: string;
  suggestedAction: string;
}

interface ReconciliationCheck {
  name: string;
  status: "MATCH" | "MISMATCH" | "PARTIAL" | "NOT_FOUND" | "OK";
  aisValue: number | null;
  form16Value: number | null;
  form26asValue: number | null;
  note: string;
}

interface ReconciliationReport {
  extractedData: { ais: ExtractedAIS; form26as: Extracted26AS; form16: ExtractedForm16 };
  checks: ReconciliationCheck[];
  mismatches: ReconciliationMismatch[];
  overallStatus: "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL";
  summary: string;
  actionItems: string[];
  aiInsights: string;
  itrImpact: string;
  generatedAt: string;
  aisNote?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n == null ? "N/A" : `₹${n.toLocaleString("en-IN")}`;

// ─── Compact FileCard ─────────────────────────────────────────────────────────

interface FileCardProps {
  label: string;
  sublabel: string;
  tip: string;
  accentBg: string;       // e.g. "bg-blue-600"
  selectedBorder: string; // e.g. "border-blue-400"
  file: File | null;
  onSelect: (f: File | null) => void;
  password: string;
  onPasswordChange: (p: string) => void;
  passwordHint?: string;
}

function FileCard({
  label, sublabel, tip, accentBg, selectedBorder,
  file, onSelect, password, onPasswordChange, passwordHint,
}: FileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hasPwd, setHasPwd] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f?.type === "application/pdf") onSelect(f);
    },
    [onSelect]
  );

  return (
    <div className={`rounded-xl border-2 bg-white transition-all ${
      dragging
        ? "border-blue-400 bg-blue-50/50"
        : file
        ? `${selectedBorder} bg-green-50/20`
        : "border-gray-200"
    }`}>
      {/* Drop zone */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        />

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0`}>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900">{label}</div>
            <div className="text-xs text-gray-400 truncate">{sublabel}</div>
          </div>
          {file && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors"
              title="Remove file"
            >×</button>
          )}
        </div>

        {/* File state */}
        {file ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-800 truncate font-medium flex-1 min-w-0">{file.name}</span>
            <span className="text-xs text-green-500 flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg py-3 gap-1 bg-gray-50/50">
            <Upload className="w-4 h-4 text-gray-300" />
            <span className="text-xs text-gray-400">Click or drag PDF here</span>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{tip}</p>
      </div>

      {/* Password toggle — collapsed by default */}
      <div
        className="border-t border-gray-100 px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 select-none">
          <input
            type="checkbox"
            checked={hasPwd}
            onChange={(e) => {
              setHasPwd(e.target.checked);
              if (!e.target.checked) onPasswordChange("");
            }}
            className="rounded"
          />
          <Lock className="w-3 h-3" />
          PDF is password-protected
        </label>
        {hasPwd && (
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={passwordHint ?? "Enter PDF password"}
            className="w-full mt-2 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 bg-white placeholder-gray-300"
          />
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AIS26ASForm16Tool() {
  const { isAuthenticated, getIdToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [aisFile, setAisFile] = useState<File | null>(null);
  const [form26asFile, setForm26asFile] = useState<File | null>(null);
  const [form16File, setForm16File] = useState<File | null>(null);
  const [aisPassword, setAisPassword] = useState("");
  const [form26asPassword, setForm26asPassword] = useState("");
  const [form16Password, setForm16Password] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [expandedMismatch, setExpandedMismatch] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    trackPageView("/tools/ais-26as-form16", "AIS vs 26AS vs Form 16 — AiTaxBot");
  }, []);

  const allFilesReady = !!(aisFile && form26asFile && form16File);

  // ── Missing files hint ──────────────────────────────────────────────────────
  const missingFiles = [
    !aisFile && "AIS",
    !form26asFile && "Form 26AS",
    !form16File && "Form 16",
  ].filter(Boolean) as string[];

  // ── Analyse ────────────────────────────────────────────────────────────────
  async function handleAnalyse() {
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (!allFilesReady) {
      toast({ title: "Upload all 3 files", description: "AIS, Form 26AS, and Form 16 are all required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setProgress(8);
    setProgressLabel("Uploading documents…");
    setReport(null);

    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append("ais", aisFile!);
      formData.append("form26as", form26asFile!);
      formData.append("form16", form16File!);
      if (aisPassword) formData.append("aisPassword", aisPassword);
      if (form26asPassword) formData.append("form26asPassword", form26asPassword);
      if (form16Password) formData.append("form16Password", form16Password);

      setProgress(20); setProgressLabel("Reading AIS with Gemini AI…");

      const resp = await fetch("/api/tools/tax-reconcile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setProgress(85); setProgressLabel("Building reconciliation report…");

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data = await resp.json();
      setProgress(100);
      setReport(data.report);
      setTimeout(() => setProgress(0), 600);
    } catch (err: unknown) {
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }

  // ── Download PDF ────────────────────────────────────────────────────────────
  async function handleDownloadPdf() {
    if (!report) return;
    setDownloadingPdf(true);
    try {
      const token = await getIdToken();
      const resp = await fetch("/api/tools/tax-reconcile/pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      if (!resp.ok) throw new Error("PDF generation failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AiTaxBot-Reconciliation-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Could not generate PDF. Try again.", variant: "destructive" });
    } finally {
      setDownloadingPdf(false);
    }
  }

  // ── Config maps ────────────────────────────────────────────────────────────
  const STATUS_CFG = {
    CLEAN: {
      wrapClass: "bg-green-50 border-green-200",
      iconWrap: "bg-green-600",
      IconComp: CheckCircle2,
      label: "All Clear — Ready to File ITR",
      textClass: "text-green-800",
    },
    NEEDS_ATTENTION: {
      wrapClass: "bg-amber-50 border-amber-200",
      iconWrap: "bg-amber-500",
      IconComp: AlertTriangle,
      label: "Needs Attention",
      textClass: "text-amber-800",
    },
    CRITICAL: {
      wrapClass: "bg-red-50 border-red-200",
      iconWrap: "bg-red-600",
      IconComp: AlertCircle,
      label: "Critical Issues Found",
      textClass: "text-red-800",
    },
  };

  const SEVER_CFG = {
    HIGH:   { border: "border-l-red-500",    bg: "bg-red-50",    badge: "bg-red-600 text-white",    text: "text-red-800"    },
    MEDIUM: { border: "border-l-amber-500",  bg: "bg-amber-50",  badge: "bg-amber-500 text-white",  text: "text-amber-800"  },
    LOW:    { border: "border-l-yellow-400", bg: "bg-yellow-50", badge: "bg-yellow-500 text-white", text: "text-yellow-800" },
    OK:     { border: "border-l-green-500",  bg: "bg-green-50",  badge: "bg-green-600 text-white",  text: "text-green-800"  },
  };

  const CHECK_ICON_MAP: Record<string, JSX.Element> = {
    MATCH:     <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />,
    OK:        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />,
    MISMATCH:  <AlertCircle  className="w-4 h-4 text-red-500   flex-shrink-0 mt-0.5" />,
    PARTIAL:   <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />,
    NOT_FOUND: <Info          className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />,
  };

  const statusCfg = report ? STATUS_CFG[report.overallStatus] : null;
  const StatusIconComp = statusCfg?.IconComp;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>AIS vs 26AS vs Form 16 Reconciliation — AiTaxBot</title>
        <meta name="description" content="Upload your AIS, Form 26AS, and Form 16 to instantly detect mismatches, get AI-powered explanations, and prepare for error-free ITR filing." />
        <link rel="canonical" href="https://www.aitaxbot.co.in/tools/ais-26as-form16" />
      </Helmet>

      <div>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white">
          <div className="max-w-4xl mx-auto px-6 py-10 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                <Clock className="w-3 h-3" /> ITR Deadline: July 31, 2026
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-xs font-medium px-3 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Secure · Never Stored · Free
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              AIS vs 26AS vs Form 16
            </h1>
            <p className="text-blue-100 text-base max-w-xl mx-auto mb-5">
              Upload your 3 tax documents — AI reads them, spots every mismatch, explains it in plain English, and tells you exactly what to fix before filing.
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-blue-200">
              {["Salary reconciliation", "TDS mismatch detection", "Capital gains alert", "AI filing guidance"].map((f) => (
                <span key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" /> {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-7 space-y-5">

          {/* ── Auth gate ─────────────────────────────────────────────────── */}
          {!isAuthenticated && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <LogIn className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Your tax documents are sensitive — please{" "}
                <button onClick={() => setLocation("/login")} className="underline font-semibold">sign in</button>
                {" "}or{" "}
                <button onClick={() => setLocation("/login")} className="underline font-semibold">create a free account</button>
                {" "}to use this tool securely.
              </p>
            </div>
          )}

          {!report ? (
            /* ──────────────────────────────────────────────────────────────
               UPLOAD FORM
            ────────────────────────────────────────────────────────────── */
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 text-lg">Upload Your Tax Documents</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Get AIS & 26AS from the{" "}
                    <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline">Income Tax Portal</a>
                    {" "}(e-File menu). Get Form 16 from your employer / HR.
                  </p>
                </div>

                <div className="p-5">
                  {/* 3 cards side by side on md+ */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <FileCard
                      label="AIS"
                      sublabel="Annual Information Statement"
                      tip="Income reported to IT dept — salary, interest, dividends, MF/equity sales, crypto."
                      accentBg="bg-blue-600"
                      selectedBorder="border-blue-400"
                      file={aisFile}
                      onSelect={setAisFile}
                      password={aisPassword}
                      onPasswordChange={setAisPassword}
                      passwordHint="AIS is usually not password-protected"
                    />
                    <FileCard
                      label="Form 26AS"
                      sublabel="Annual Tax Statement (TRACES)"
                      tip="TDS credits by deductors — salary TDS (Section 192), bank TDS, advance tax."
                      accentBg="bg-[#4685d8]"
                      selectedBorder="border-[#4685d8]/60"
                      file={form26asFile}
                      onSelect={setForm26asFile}
                      password={form26asPassword}
                      onPasswordChange={setForm26asPassword}
                      passwordHint="Usually your PAN number (e.g. ABCDE1234F)"
                    />
                    <FileCard
                      label="Form 16"
                      sublabel="TDS Certificate from Employer"
                      tip="Part A: quarterly TDS deposited. Part B: gross salary, deductions, taxable income."
                      accentBg="bg-green-600"
                      selectedBorder="border-green-400"
                      file={form16File}
                      onSelect={setForm16File}
                      password={form16Password}
                      onPasswordChange={setForm16Password}
                      passwordHint="Try PAN or PAN+DOB (ABCDE1234F01011990)"
                    />
                  </div>

                  {/* Progress */}
                  {loading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{progressLabel}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyse}
                    disabled={loading || !allFilesReady}
                    className="mt-4 w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-base rounded-xl"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing with AI…</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Reconcile My Documents</>
                    )}
                  </Button>

                  {!loading && missingFiles.length > 0 && (
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Still needed: {missingFiles.join(", ")}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-400">
                    <Shield className="w-3 h-3" /> Files are processed securely on our server and never stored
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-5">How It Works</h3>
                <div className="relative flex flex-col md:flex-row gap-5 md:gap-0">
                  {/* connector line */}
                  <div className="hidden md:block absolute top-5 left-[calc(16.7%+20px)] right-[calc(16.7%+20px)] h-px bg-gray-200" />
                  {[
                    { n: "1", title: "Upload 3 PDFs", desc: "AIS, Form 26AS, and Form 16 — all from the Income Tax portal and your employer", color: "bg-blue-600" },
                    { n: "2", title: "AI Reads & Extracts", desc: "Gemini AI parses every page of all 3 documents and pulls every salary, TDS, and income figure", color: "bg-[#4685d8]" },
                    { n: "3", title: "Get Your Report", desc: "Instant mismatches with severity ratings, Indian tax law explanations, and exact action steps", color: "bg-green-600" },
                  ].map((s) => (
                    <div key={s.n} className="flex-1 flex flex-col items-center text-center px-4 relative">
                      <div className={`w-10 h-10 ${s.color} text-white rounded-full flex items-center justify-center font-bold text-lg mb-3 z-10 relative`}>
                        {s.n}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm mb-1">{s.title}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <strong className="text-red-800">ITR filing deadline: July 31, 2026.</strong>
                    {" "}<span className="text-red-700">Reconcile now to avoid notices, penalties, or missing TDS credits.</span>
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* ──────────────────────────────────────────────────────────────
               RESULTS
            ────────────────────────────────────────────────────────────── */
            <>
              {/* ── Status Banner ─────────────────────────────────────────── */}
              <div className={`rounded-2xl border p-5 ${statusCfg?.wrapClass}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${statusCfg?.iconWrap} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {StatusIconComp && <StatusIconComp className="w-6 h-6 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-xl ${statusCfg?.textClass}`}>{statusCfg?.label}</div>
                    <p className={`text-sm mt-1 ${statusCfg?.textClass} opacity-90 leading-relaxed`}>{report.summary}</p>
                    {report.extractedData.form16.newRegime != null && (
                      <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        report.extractedData.form16.newRegime
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {report.extractedData.form16.newRegime
                          ? "New Tax Regime (Section 115BAC)"
                          : "Old Tax Regime"}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 bg-white border-gray-300 shadow-sm"
                  >
                    {downloadingPdf
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5 mr-1.5" />}
                    PDF
                  </Button>
                </div>
              </div>

              {/* AIS note */}
              {report.aisNote && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900">{report.aisNote}</p>
                </div>
              )}

              {/* ── Extracted Data Table ───────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Extracted Data Comparison</h3>
                  {report.extractedData.form16.employerName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Employer: <span className="font-medium text-gray-700">{report.extractedData.form16.employerName}</span>
                      {report.extractedData.form16.employerTAN && (
                        <> · TAN: <span className="font-medium text-gray-700">{report.extractedData.form16.employerTAN}</span></>
                      )}
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs bg-gray-50 w-[44%]">Metric</th>
                        <th className="text-right px-4 py-3 text-[11px] font-bold text-white bg-blue-600 w-[18.7%]">AIS</th>
                        <th className="text-right px-4 py-3 text-[11px] font-bold text-white bg-green-600 w-[18.7%]">Form 16</th>
                        <th className="text-right px-4 py-3 text-[11px] font-bold text-white bg-[#4685d8] w-[18.7%]">26AS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["Gross Salary / Salary Income",  fmt(report.extractedData.ais.salaryIncome),           fmt(report.extractedData.form16.grossSalary),        "—"],
                          ["Standard Deduction (u/s 16ia)", "—",                                                   fmt(report.extractedData.form16.standardDeduction),  "—"],
                          ["Taxable Income",                 "—",                                                   fmt(report.extractedData.form16.taxableIncome),      "—"],
                          ["TDS on Salary",                  "—",                                                   fmt(report.extractedData.form16.totalTaxDeducted),   fmt(report.extractedData.form26as.tdsSalary)],
                          ["TDS on Non-Salary",              "—",                                                   "—",                                                  fmt(report.extractedData.form26as.tdsNonSalary)],
                          ["Savings A/c Interest",           fmt(report.extractedData.ais.interestFromSavings),    "—",                                                  "—"],
                          ["FD Interest",                    fmt(report.extractedData.ais.interestFromFD),         "—",                                                  "—"],
                          ["Dividend Income",                fmt(report.extractedData.ais.dividendIncome),         "—",                                                  "—"],
                          ["Advance Tax Paid",               "—",                                                   "—",                                                  fmt(report.extractedData.form26as.advanceTaxPaid)],
                        ] as [string, string, string, string][]
                      ).map(([label, ais, f16, f26], i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-gray-50/60" : ""}>
                          <td className="px-4 py-2.5 text-gray-700 text-sm">{label}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-700   bg-blue-50/30">{ais}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-green-700  bg-green-50/30">{f16}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-700   bg-blue-50/40">{f26}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Reconciliation Checks ──────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Reconciliation Checks</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {report.checks.map((check, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        check.status === "MATCH" || check.status === "OK"
                          ? "bg-green-50 border-green-100"
                          : check.status === "MISMATCH"
                          ? "bg-red-50 border-red-100"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      {CHECK_ICON_MAP[check.status] ?? CHECK_ICON_MAP["NOT_FOUND"]}
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-gray-900">{check.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{check.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Issues Found ───────────────────────────────────────────── */}
              {report.mismatches.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    Issues Found
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {report.mismatches.length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {report.mismatches.map((m) => {
                      const sev = SEVER_CFG[m.severity] ?? SEVER_CFG.LOW;
                      const isOpen = expandedMismatch === m.id;
                      return (
                        <div key={m.id} className={`border-l-4 ${sev.border} ${sev.bg} rounded-r-xl overflow-hidden`}>
                          <button
                            className="w-full flex items-center gap-3 p-4 text-left"
                            onClick={() => setExpandedMismatch(isOpen ? null : m.id)}
                          >
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${sev.badge}`}>
                              {m.severity}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-sm ${sev.text}`}>{m.title}</div>
                              <div className="text-xs text-gray-600 mt-0.5 truncate">{m.description}</div>
                            </div>
                            {isOpen
                              ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3">
                              <p className="text-sm text-gray-700">{m.description}</p>

                              {/* Value chips */}
                              {(
                                [
                                  ["AIS",     m.aisValue,     "text-blue-700 bg-blue-50 border-blue-100"],
                                  ["Form 16", m.form16Value,  "text-green-700 bg-green-50 border-green-100"],
                                  ["26AS",    m.form26asValue,"text-blue-700 bg-blue-50 border-blue-100"],
                                ] as [string, number | null, string][]
                              )
                                .filter(([, v]) => v != null)
                                .length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {(
                                    [
                                      ["AIS",     m.aisValue,     "text-blue-700 bg-blue-50 border-blue-100"],
                                      ["Form 16", m.form16Value,  "text-green-700 bg-green-50 border-green-100"],
                                      ["26AS",    m.form26asValue,"text-blue-700 bg-blue-50 border-blue-100"],
                                    ] as [string, number | null, string][]
                                  )
                                    .filter(([, v]) => v != null)
                                    .map(([src, val, cls]) => (
                                      <div key={src} className={`${cls} border rounded-lg px-3 py-2 text-center min-w-[90px]`}>
                                        <div className="text-[10px] opacity-70 mb-0.5">{src}</div>
                                        <div className="font-bold font-mono text-sm">{fmt(val)}</div>
                                      </div>
                                    ))}
                                </div>
                              )}

                              <div className="bg-white/70 rounded-xl p-3 space-y-2 text-xs">
                                <p>
                                  <span className="font-semibold text-gray-800">Why this happens: </span>
                                  <span className="text-gray-600">{m.ruleExplanation}</span>
                                </p>
                                <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <p>
                                    <span className="font-semibold text-blue-800">What to do: </span>
                                    <span className="text-gray-700">{m.suggestedAction}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── AI Analysis ───────────────────────────────────────────── */}
              {report.aiInsights && (
                <div className="rounded-2xl p-[2px] bg-gradient-to-br from-indigo-500 to-blue-600">
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[14px] p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-indigo-900">AI Analysis by AiTaxBot</h3>
                    </div>
                    <p className="text-sm text-indigo-900/80 whitespace-pre-line leading-relaxed">
                      {report.aiInsights}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Action Items ───────────────────────────────────────────── */}
              {report.actionItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    </div>
                    Action Items Before Filing ITR
                  </h3>
                  <ol className="space-y-2.5">
                    {report.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* ── ITR Filing Impact ──────────────────────────────────────── */}
              {report.itrImpact && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> ITR Filing Impact
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.itrImpact}</p>
                </div>
              )}

              {/* ── Footer actions ─────────────────────────────────────────── */}
              <div className="flex gap-3">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                >
                  {downloadingPdf
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4 mr-2" /> Download PDF Report</>}
                </Button>
                <Button
                  onClick={() => {
                    setReport(null);
                    setAisFile(null); setForm26asFile(null); setForm16File(null);
                    setAisPassword(""); setForm26asPassword(""); setForm16Password("");
                    setExpandedMismatch(null);
                  }}
                  variant="outline"
                  className="border-gray-300"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> New
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400 pb-4">
                <Shield className="w-3 h-3 inline mr-1" />
                Generated {new Date(report.generatedAt).toLocaleString("en-IN")} · Documents not stored · Not a substitute for CA advice
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
