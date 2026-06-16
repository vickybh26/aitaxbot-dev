import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackPageView } from "@/lib/analytics";
import {
  FileText, Upload, AlertCircle, CheckCircle2, AlertTriangle,
  Download, Loader2, ChevronDown, ChevronUp, Info, Shield,
  ArrowRight, RefreshCw, LogIn, Lock, Eye, EyeOff,
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
  otherIncome: number | null;
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
  tdsDeposited: number | null;
  grossSalary: number | null;
  hraReceived: number | null;
  standardDeduction: number | null;
  professionalTax: number | null;
  netSalary: number | null;
  totalDeductions80C: number | null;
  totalDeductions80D: number | null;
  otherDeductions: number | null;
  taxableIncome: number | null;
  taxPayable: number | null;
  rebate87A: number | null;
  totalTaxDeducted: number | null;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n == null ? "N/A" : `₹${n.toLocaleString("en-IN")}`;

const severityColor: Record<string, string> = {
  HIGH: "bg-red-100 border-red-300 text-red-800",
  MEDIUM: "bg-orange-50 border-orange-300 text-orange-800",
  LOW: "bg-yellow-50 border-yellow-200 text-yellow-800",
  OK: "bg-green-50 border-green-200 text-green-800",
};

const severityBadge: Record<string, string> = {
  HIGH: "bg-red-600 text-white",
  MEDIUM: "bg-orange-500 text-white",
  LOW: "bg-yellow-500 text-white",
  OK: "bg-green-600 text-white",
};

const checkIcon: Record<string, JSX.Element> = {
  MATCH: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
  OK: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
  MISMATCH: <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
  PARTIAL: <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />,
  NOT_FOUND: <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />,
};

// ─── File upload card ─────────────────────────────────────────────────────────

interface FileCardProps {
  label: string;
  description: string;
  color: string;
  file: File | null;
  onSelect: (f: File | null) => void;
  tip: string;
  passwordHint?: string;
  password: string;
  onPasswordChange: (p: string) => void;
}

function FileCard({ label, description, color, file, onSelect, tip, passwordHint, password, onPasswordChange }: FileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.type === "application/pdf") onSelect(dropped);
    },
    [onSelect]
  );

  return (
    <div className={`border-2 rounded-xl transition-all ${
      dragging ? "border-blue-500 bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-dashed border-gray-300 bg-gray-50"
    }`}>
      {/* Upload zone */}
      <div
        className="p-5 cursor-pointer hover:bg-gray-100/50 rounded-t-xl transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm">{label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{description}</div>
            {file ? (
              <div className="flex items-center gap-1.5 mt-2 text-green-700 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-2 text-gray-400 text-xs">
                <Upload className="w-3 h-3" /> Click or drag & drop PDF
              </div>
            )}
          </div>
          {file && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              className="text-gray-400 hover:text-red-500 text-lg leading-none"
            >×</button>
          )}
        </div>
        <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-400">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{tip}</span>
        </div>
      </div>

      {/* Password field — always shown */}
      <div className="border-t border-gray-200 px-5 pb-4 pt-3 bg-white/70 rounded-b-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 font-medium">PDF Password</span>
          <span className="text-xs text-gray-400">(optional — leave blank if not password-protected)</span>
        </div>
        <div className="relative mt-1.5">
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={passwordHint || "Enter PDF password if locked"}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-blue-400 bg-white placeholder-gray-300"
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {passwordHint && !password && (
          <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" /> {passwordHint}
          </div>
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
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [expandedMismatch, setExpandedMismatch] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    trackPageView("/tools/ais-26as-form16", "AIS vs 26AS vs Form 16 — AiTaxBot");
  }, []);

  // ── Analyse ────────────────────────────────────────────────────────────────
  async function handleAnalyse() {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!aisFile || !form26asFile || !form16File) {
      toast({ title: "Upload all 3 files", description: "Please upload AIS, 26AS, and Form 16 PDFs.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setProgress(10);
    setReport(null);

    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append("ais", aisFile);
      formData.append("form26as", form26asFile);
      formData.append("form16", form16File);
      if (aisPassword) formData.append("aisPassword", aisPassword);
      if (form26asPassword) formData.append("form26asPassword", form26asPassword);
      if (form16Password) formData.append("form16Password", form16Password);

      setProgress(30);
      const resp = await fetch("/api/tools/tax-reconcile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setProgress(80);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data = await resp.json();
      setProgress(100);
      setReport(data.report);
      setTimeout(() => setProgress(0), 800);
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

  // ── Status banner ──────────────────────────────────────────────────────────
  const statusConfig = report
    ? {
        CLEAN: { bg: "bg-green-50 border-green-200", icon: <CheckCircle2 className="w-6 h-6 text-green-600" />, label: "All Clear", textColor: "text-green-800" },
        NEEDS_ATTENTION: { bg: "bg-orange-50 border-orange-200", icon: <AlertTriangle className="w-6 h-6 text-orange-600" />, label: "Needs Attention", textColor: "text-orange-800" },
        CRITICAL: { bg: "bg-red-50 border-red-200", icon: <AlertCircle className="w-6 h-6 text-red-600" />, label: "Critical Issues Found", textColor: "text-red-800" },
      }[report.overallStatus]
    : null;

  return (
    <>
      <Helmet>
        <title>AIS vs 26AS vs Form 16 Reconciliation — AiTaxBot</title>
        <meta name="description" content="Upload your AIS, Form 26AS, and Form 16 to instantly detect mismatches, get AI-powered explanations, and prepare for error-free ITR filing." />
        <link rel="canonical" href="https://www.aitaxbot.co.in/tools/ais-26as-form16" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full mb-4">
              <Shield className="w-3.5 h-3.5" /> AI-Powered · Secure · Free
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              AIS vs 26AS vs Form 16
            </h1>
            <p className="text-blue-100 text-base md:text-lg max-w-xl mx-auto">
              Upload your tax documents and our AI instantly spots mismatches, explains them in plain English, and tells you exactly what to do before filing ITR.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-blue-100">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Salary reconciliation</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> TDS mismatch detection</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Capital gains alert</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> ITR filing guidance</span>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* ── Auth gate ──────────────────────────────────────────────────── */}
          {!isAuthenticated && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-start gap-3">
              <LogIn className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-800 text-sm">Login required</div>
                <div className="text-amber-700 text-sm mt-0.5">
                  Your tax documents are sensitive. Please{" "}
                  <button onClick={() => setLocation("/login")} className="underline font-medium">
                    sign in or create a free account
                  </button>{" "}
                  to use this tool securely.
                </div>
              </div>
            </div>
          )}

          {/* ── Upload cards ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Upload your tax documents</h2>
            <p className="text-sm text-gray-500 mb-5">
              Download all three from the{" "}
              <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Income Tax Portal
              </a>{" "}
              under My Account → AIS / Annual Tax Statement / Form 16 from employer.
            </p>

            <div className="grid gap-4">
              <FileCard
                label="Annual Information Statement (AIS)"
                description="Download from IT Portal → Services → Annual Information Statement"
                color="bg-blue-600"
                file={aisFile}
                onSelect={setAisFile}
                tip="AIS shows all income reported to IT dept — salary, interest, dividends, MF/stock transactions"
                passwordHint="AIS is usually not password-protected. Leave blank."
                password={aisPassword}
                onPasswordChange={setAisPassword}
              />
              <FileCard
                label="Form 26AS / Annual Tax Statement"
                description="Download from IT Portal → My Account → View Form 26AS / Annual Tax Statement"
                color="bg-purple-600"
                file={form26asFile}
                onSelect={setForm26asFile}
                tip="26AS shows TDS credits — salary TDS (Part A), bank TDS (Part B), advance tax (Part C)"
                passwordHint="If locked, the password is usually your PAN number (e.g. ABCDE1234F)"
                password={form26asPassword}
                onPasswordChange={setForm26asPassword}
              />
              <FileCard
                label="Form 16"
                description="From your employer (HR / payroll team)"
                color="bg-teal-600"
                file={form16File}
                onSelect={setForm16File}
                tip="Form 16 Part A: TDS deposited by employer. Part B: Salary breakup and Chapter VI-A deductions"
                passwordHint="Common passwords: PAN number, PAN+DOB (ABCDE1234F01011990), or employer-set"
                password={form16Password}
                onPasswordChange={setForm16Password}
              />
            </div>

            {/* Progress */}
            {loading && (
              <div className="mt-5">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {progress < 30 ? "Uploading documents…" : progress < 80 ? "Extracting data with AI…" : "Generating reconciliation report…"}
                </p>
              </div>
            )}

            <Button
              onClick={handleAnalyse}
              disabled={loading || !aisFile || !form26asFile || !form16File}
              className="mt-5 w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-base rounded-xl"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing Documents…</>
              ) : (
                <><ArrowRight className="w-4 h-4 mr-2" /> Reconcile My Documents</>
              )}
            </Button>

            <div className="flex items-center gap-1.5 mt-3 justify-center text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" /> Documents are processed securely and never stored
            </div>
          </div>

          {/* ── Report ──────────────────────────────────────────────────────── */}
          {report && (
            <div className="space-y-5">

              {/* Status Banner */}
              <div className={`border rounded-2xl p-5 flex items-start gap-4 ${statusConfig?.bg}`}>
                {statusConfig?.icon}
                <div className="flex-1">
                  <div className={`font-bold text-lg ${statusConfig?.textColor}`}>{statusConfig?.label}</div>
                  <div className={`text-sm mt-1 ${statusConfig?.textColor} opacity-90`}>{report.summary}</div>
                </div>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 border-gray-300 bg-white"
                >
                  {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                  PDF Report
                </Button>
              </div>

              {/* Extracted Data Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Extracted Data Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-3 text-gray-600 font-medium rounded-tl-lg">Metric</th>
                        <th className="text-right p-3 text-blue-700 font-semibold">AIS</th>
                        <th className="text-right p-3 text-teal-700 font-semibold">Form 16</th>
                        <th className="text-right p-3 text-purple-700 font-semibold rounded-tr-lg">26AS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Gross Salary / Salary Income", fmt(report.extractedData.ais.salaryIncome), fmt(report.extractedData.form16.grossSalary), "—"],
                        ["TDS on Salary", "—", fmt(report.extractedData.form16.totalTaxDeducted), fmt(report.extractedData.form26as.tdsSalary)],
                        ["Taxable Income", "—", fmt(report.extractedData.form16.taxableIncome), "—"],
                        ["FD Interest", fmt(report.extractedData.ais.interestFromFD), "—", "—"],
                        ["Savings A/c Interest", fmt(report.extractedData.ais.interestFromSavings), "—", "—"],
                        ["Dividend Income", fmt(report.extractedData.ais.dividendIncome), "—", "—"],
                        ["TDS on Non-Salary", "—", "—", fmt(report.extractedData.form26as.tdsNonSalary)],
                        ["Advance Tax Paid", "—", "—", fmt(report.extractedData.form26as.advanceTaxPaid)],
                      ].map(([label, ais, f16, f26], i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="p-3 text-gray-700">{label}</td>
                          <td className="p-3 text-right text-blue-800 font-mono text-xs">{ais}</td>
                          <td className="p-3 text-right text-teal-800 font-mono text-xs">{f16}</td>
                          <td className="p-3 text-right text-purple-800 font-mono text-xs">{f26}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.extractedData.form16.employerName && (
                  <div className="mt-3 text-xs text-gray-500">
                    Employer: <span className="font-medium text-gray-700">{report.extractedData.form16.employerName}</span>
                    {report.extractedData.form16.employerTAN && ` · TAN: ${report.extractedData.form16.employerTAN}`}
                  </div>
                )}
              </div>

              {/* Reconciliation Checks */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Reconciliation Checks</h3>
                <div className="space-y-2">
                  {report.checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      {checkIcon[check.status]}
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{check.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{check.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mismatches */}
              {report.mismatches.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Issues Found <span className="text-gray-400 font-normal text-sm">({report.mismatches.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {report.mismatches.map((m) => (
                      <div key={m.id} className={`border rounded-xl overflow-hidden ${severityColor[m.severity]}`}>
                        <button
                          className="w-full flex items-center gap-3 p-4 text-left"
                          onClick={() => setExpandedMismatch(expandedMismatch === m.id ? null : m.id)}
                        >
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBadge[m.severity]}`}>
                            {m.severity}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{m.title}</div>
                            <div className="text-xs opacity-80 mt-0.5 line-clamp-1">{m.description}</div>
                          </div>
                          {expandedMismatch === m.id
                            ? <ChevronUp className="w-4 h-4 flex-shrink-0" />
                            : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                        </button>
                        {expandedMismatch === m.id && (
                          <div className="px-4 pb-4 space-y-3">
                            <div className="text-sm">{m.description}</div>
                            {/* Values grid */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {[["AIS", m.aisValue], ["Form 16", m.form16Value], ["26AS", m.form26asValue]].map(
                                ([src, val]) =>
                                  val != null ? (
                                    <div key={src as string} className="bg-white/60 rounded-lg p-2 text-center">
                                      <div className="text-gray-500">{src}</div>
                                      <div className="font-bold font-mono">{fmt(val as number)}</div>
                                    </div>
                                  ) : null
                              )}
                            </div>
                            <div className="bg-white/50 rounded-lg p-3 text-xs space-y-2">
                              <div>
                                <span className="font-semibold">Why this happens: </span>
                                {m.ruleExplanation}
                              </div>
                              <div className="flex items-start gap-1.5">
                                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-700" />
                                <span><span className="font-semibold text-blue-800">Action: </span>{m.suggestedAction}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {report.aiInsights && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <h3 className="font-bold text-indigo-900">AI Analysis</h3>
                  </div>
                  <p className="text-sm text-indigo-800 whitespace-pre-line leading-relaxed">{report.aiInsights}</p>
                </div>
              )}

              {/* Action Items */}
              {report.actionItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" /> Action Items Before Filing ITR
                  </h3>
                  <ol className="space-y-2">
                    {report.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* ITR Impact */}
              {report.itrImpact && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> ITR Filing Impact
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.itrImpact}</p>
                </div>
              )}

              {/* Restart */}
              <Button
                onClick={() => { setReport(null); setAisFile(null); setForm26asFile(null); setForm16File(null); setAisPassword(""); setForm26asPassword(""); setForm16Password(""); }}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Start New Reconciliation
              </Button>

              <div className="text-center text-xs text-gray-400 pb-4">
                <Shield className="w-3.5 h-3.5 inline mr-1" />
                Report generated at {new Date(report.generatedAt).toLocaleString("en-IN")} · Documents not stored
              </div>
            </div>
          )}

          {/* ── How it works ────────────────────────────────────────────────── */}
          {!report && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">How it works</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Upload 3 PDFs", desc: "AIS, 26AS, and Form 16 from the Income Tax Portal and your employer", color: "bg-blue-600" },
                  { step: "2", title: "AI Extracts & Compares", desc: "Gemini AI reads each document, extracts key figures, and runs 5 reconciliation checks", color: "bg-purple-600" },
                  { step: "3", title: "Get Your Report", desc: "Instant mismatch report with explanations, severity ratings, and exact actions to take", color: "bg-teal-600" },
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div className={`w-10 h-10 ${s.color} text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3`}>
                      {s.step}
                    </div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">{s.title}</div>
                    <div className="text-xs text-gray-500">{s.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800">
                <strong>⚠️ ITR filing deadline: July 31, 2026.</strong> Reconcile your documents now to avoid filing errors, notices from IT department, or missing TDS credits.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
