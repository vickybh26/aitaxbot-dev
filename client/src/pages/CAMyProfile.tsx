/**
 * CAMyProfile.tsx
 * Allows a CA whose profile is already in the directory to update it.
 *
 * Flow:
 *   Step 1 — Identity verification: enter ICAI number + registered email
 *   Step 2 — Edit form (pre-filled with current data)
 *   Step 3 — Success confirmation
 */

import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, UserCog, ShieldCheck } from "lucide-react";

// ---------- constants ----------

const PRACTICE_AREA_OPTIONS = [
  "Income Tax",
  "GST",
  "Audit",
  "Company Law",
  "International Tax",
  "Transfer Pricing",
  "NRI Taxation",
  "Tax Planning",
  "Startup Advisory",
  "Accounting",
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada",
  "Malayalam", "Bengali", "Gujarati", "Punjabi",
];

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal",
];

// ---------- types ----------

interface ProfileData {
  fullName: string;
  firmName: string;
  city: string;
  state: string;
  whatsappNumber: string;
  practiceAreas: string[];
  languages: string[];
  yearsOfPractice: string;
  bio: string;
}

// ---------- component ----------

export default function CAMyProfile() {
  const { toast } = useToast();

  // Step 1 state
  const [icai, setIcai] = useState("");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Step 2 state
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileData>({
    fullName: "", firmName: "", city: "", state: "",
    whatsappNumber: "", practiceAreas: [], languages: [],
    yearsOfPractice: "", bio: "",
  });
  const [saving, setSaving] = useState(false);

  // Identity is now proved by reading a code we email to the address on the
  // profile — not by quoting that address back to us. `requestId` is the
  // non-secret handle for a pending challenge; `editToken` is what actually
  // authorises the save.
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [editToken, setEditToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ---------- Step 1: request a one-time code ----------
  const handleRequestCode = async () => {
    if (!icai.trim() || !email.trim()) {
      toast({ title: "Required", description: "Enter both ICAI number and registered email.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/ca/my-profile/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icaiMembershipNumber: icai.trim(), email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not send code", description: data.error || "Please try again.", variant: "destructive" });
        return;
      }
      // The server answers identically whether or not a profile matched, so
      // this screen must not claim one exists. `requestId` is simply absent on
      // a non-match; advance either way so the UI leaks nothing the API didn't.
      setRequestId(data.requestId ?? null);
      setStep(2);
      toast({ title: "Check your email", description: data.message });
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // ---------- Step 2: exchange the code for an edit token ----------
  const handleVerify = async () => {
    if (!code.trim()) {
      toast({ title: "Required", description: "Enter the code from your email.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/ca/my-profile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Verification failed", description: data.error || "Incorrect code.", variant: "destructive" });
        return;
      }
      const pr = data.profile;
      setEditToken(data.editToken);
      setProfileId(pr.id);
      setForm({
        fullName: pr.fullName || "",
        firmName: pr.firmName || "",
        city: pr.city || "",
        state: pr.state || "",
        whatsappNumber: pr.whatsappNumber || "",
        practiceAreas: pr.practiceAreas || [],
        languages: pr.languages || [],
        yearsOfPractice: String(pr.yearsOfPractice || ""),
        bio: pr.bio || "",
      });
      setStep(3);
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  // ---------- Step 2: save updates ----------
  const handleSave = async () => {
    if (!form.fullName.trim() || !form.city.trim() || !form.state) {
      toast({ title: "Required fields missing", description: "Name, city and state are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ca/my-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editToken, updates: form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Update failed", description: data.error || "Could not save changes.", variant: "destructive" });
        return;
      }
      setStep(4);
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---------- helpers ----------
  const toggleMultiSelect = (key: "practiceAreas" | "languages", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  };

  // ---------- render ----------
  return (
    <>
      <Helmet>
        <title>Update My CA Profile - AiTaxBot</title>
        <meta name="description" content="Update your Chartered Accountant profile listed on AiTaxBot's Find-a-CA directory." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="bg-gradient-to-br from-paper to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
              <UserCog className="w-7 h-7 text-credit" />
            </div>
            <h1 className="text-3xl font-bold text-ink">Update My CA Profile</h1>
            <p className="text-ink/65 mt-2 text-sm">
              Verify your identity, then update your listing in the AiTaxBot directory.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${step === s ? "bg-ink text-white" : step > s ? "bg-green-500 text-white" : "bg-secondary text-ink/65"}`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 4 && <div className={`w-12 h-0.5 ${step > s ? "bg-green-500" : "bg-secondary"}`} />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Verify ── */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-credit" />
                  Verify Your Identity
                </CardTitle>
                <CardDescription>
                  Enter the ICAI membership number and email address you registered with. We will email a one-time code to that address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="icai">ICAI Membership Number *</Label>
                  <Input
                    id="icai"
                    placeholder="e.g. 012345"
                    value={icai}
                    onChange={(e) => setIcai(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Registered Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleRequestCode} disabled={sending} className="w-full">
                  {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending code…</> : "Email me a code"}
                </Button>
                <p className="text-xs text-ink/65 text-center">
                  Can't access your registered email?{" "}
                  <Link href="/contact" className="text-credit hover:underline">Contact support</Link>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: Enter the emailed code ── */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-credit" />
                  Enter your code
                </CardTitle>
                <CardDescription>
                  If that membership number matches a profile, we have emailed an 8-character code to the address registered on it. It expires in 15 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="code">One-time code *</Label>
                  <Input
                    id="code"
                    placeholder="XXXXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="mt-1 font-mono tracking-[0.3em] text-center text-lg"
                    maxLength={8}
                    autoComplete="one-time-code"
                  />
                </div>
                <Button onClick={handleVerify} disabled={verifying} className="w-full">
                  {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…</> : "Verify code"}
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button variant="ghost" onClick={handleRequestCode} disabled={sending} className="flex-1">
                    {sending ? "Sending…" : "Resend code"}
                  </Button>
                </div>
                <p className="text-xs text-ink/65 text-center">
                  Can't access your registered email?{" "}
                  <Link href="/contact" className="text-credit hover:underline">Contact support</Link>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: Edit form ── */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Update Your Profile</CardTitle>
                <CardDescription>
                  Changes will go back to <strong>pending review</strong> and appear in the directory once approved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Firm Name</Label>
                    <Input value={form.firmName} onChange={(e) => setForm({ ...form, firmName: e.target.value })} className="mt-1" placeholder="Optional" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>WhatsApp Number</Label>
                    <Input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} className="mt-1" placeholder="10-digit mobile" />
                  </div>
                  <div>
                    <Label>Years of Practice</Label>
                    <Input type="number" min={0} max={60} value={form.yearsOfPractice} onChange={(e) => setForm({ ...form, yearsOfPractice: e.target.value })} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Practice Areas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PRACTICE_AREA_OPTIONS.map((area) => (
                      <Badge
                        key={area}
                        variant={form.practiceAreas.includes(area) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleMultiSelect("practiceAreas", area)}
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <Badge
                        key={lang}
                        variant={form.languages.includes(lang) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleMultiSelect("languages", lang)}
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Bio / About You</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={4}
                    maxLength={600}
                    className="mt-1"
                    placeholder="Brief description of your expertise and services (max 600 characters)"
                  />
                  <p className="text-xs text-ink/65 mt-1 text-right">{form.bio.length}/600</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Submit for Review"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 4 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-ink mb-2">Profile Updated!</h2>
                <p className="text-ink/65 mb-6 max-w-sm mx-auto">
                  Your changes have been submitted for admin review. You'll receive a confirmation email once approved — usually within 1–2 business days.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => { setStep(1); setIcai(""); setEmail(""); setCode(""); setRequestId(null); setEditToken(null); }}>
                    Update Another Profile
                  </Button>
                  <Button asChild>
                    <Link href="/find-ca">Back to Directory</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </>
  );
}
