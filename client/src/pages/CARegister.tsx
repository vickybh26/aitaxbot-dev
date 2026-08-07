import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, AlertCircle, BookOpen, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { insertCAProfileSchema, CA_PRACTICE_AREAS, CA_PRACTICE_AREA_LABELS } from "@shared/schema";

// ─── Form schema (strip agreeToEthics for display, add back for submit) ────
const formSchema = insertCAProfileSchema;
type FormData = z.infer<typeof formSchema>;

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Puducherry",
];

const LANGUAGES = [
  "English","Hindi","Marathi","Bengali","Tamil","Telugu","Gujarati",
  "Kannada","Malayalam","Punjabi","Odia","Assamese","Urdu",
];

export default function CARegister() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      practiceAreas: [],
      languages: [],
      yearsOfPractice: 1,
      agreeToEthics: undefined,
    },
  });

  const selectedAreas = watch("practiceAreas") || [];
  const selectedLangs = watch("languages") || [];
  const agreeToEthics = watch("agreeToEthics");

  function toggleArea(area: typeof CA_PRACTICE_AREAS[number]) {
    const current = watch("practiceAreas") || [];
    if (current.includes(area)) {
      setValue("practiceAreas", current.filter((a) => a !== area), { shouldValidate: true });
    } else {
      setValue("practiceAreas", [...current, area], { shouldValidate: true });
    }
  }

  function toggleLang(lang: string) {
    const current = watch("languages") || [];
    if (current.includes(lang)) {
      setValue("languages", current.filter((l) => l !== lang), { shouldValidate: true });
    } else {
      setValue("languages", [...current, lang], { shouldValidate: true });
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/ca/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        setServerError(body.error || "Registration failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch (e) {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-persian-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you. We'll verify your ICAI membership number and approve your profile within
            <strong> 1–2 business days</strong>. You'll receive a confirmation email once you're live.
          </p>
          <Link href="/find-ca" className="text-blue-600 hover:underline text-sm">
            View CA Directory →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Register as a CA — AiTaxBot | List Your Practice for Free</title>
        <meta
          name="description"
          content="List your CA practice on AiTaxBot's free directory. Connect with Indian taxpayers who need help with ITR filing, tax planning, NRI taxation, and more."
        />
      </Helmet>

      <div className="bg-gradient-to-br from-blue-50 to-persian-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Free Listing · ICAI Act Compliant
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Register as a CA</h1>
            <p className="text-slate-500 max-w-lg mx-auto">
              List your practice on AiTaxBot's free CA directory. Connect with qualified taxpayers
              who are actively looking for help filing their ITR.
            </p>
          </div>

          {/* Compliance notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
            <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>ICAI Code of Ethics compliance:</strong> This directory lists only factual
              practice information (name, city, ICAI number, services). No ratings, rankings, or
              endorsements are shown. AiTaxBot is a technology platform — not a tax practice.
              Listing here is a free introduction service and does not constitute advertising of
              professional services under the Chartered Accountants Act, 1949.
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">

            {/* Personal Details */}
            <div>
              <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b">
                1. Personal &amp; ICAI Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name (as per ICAI records) *</Label>
                  <Input id="fullName" {...register("fullName")} placeholder="CA Rajesh Kumar" className="mt-1" />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="icaiMembershipNumber">ICAI Membership Number *</Label>
                  <Input id="icaiMembershipNumber" {...register("icaiMembershipNumber")} placeholder="e.g. 123456" className="mt-1" />
                  {errors.icaiMembershipNumber && <p className="text-red-500 text-xs mt-1">{errors.icaiMembershipNumber.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="firmName">Firm Name (optional)</Label>
                  <Input id="firmName" {...register("firmName")} placeholder="e.g. Kumar & Associates" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b">
                2. Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" {...register("city")} placeholder="e.g. Mumbai" className="mt-1" />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <div className="relative mt-1">
                    <select
                      {...register("state")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                </div>
              </div>
            </div>

            {/* Practice Areas */}
            <div>
              <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b">
                3. Areas of Practice *
              </h3>
              <div className="flex flex-wrap gap-2">
                {CA_PRACTICE_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedAreas.includes(area)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                    }`}
                  >
                    {CA_PRACTICE_AREA_LABELS[area]}
                  </button>
                ))}
              </div>
              {errors.practiceAreas && (
                <p className="text-red-500 text-xs mt-2">{errors.practiceAreas.message}</p>
              )}
            </div>

            {/* Languages */}
            <div>
              <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b">
                4. Languages *
              </h3>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLang(lang)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedLangs.includes(lang)
                        ? "bg-persian-blue-700 text-white border-persian-blue-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-persian-blue-400"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              {errors.languages && (
                <p className="text-red-500 text-xs mt-2">{errors.languages.message}</p>
              )}
            </div>

            {/* Experience & Contact */}
            <div>
              <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b">
                5. Experience &amp; Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yearsOfPractice">Years of Practice *</Label>
                  <Input
                    id="yearsOfPractice"
                    type="number"
                    min={0}
                    max={60}
                    {...register("yearsOfPractice", { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {errors.yearsOfPractice && <p className="text-red-500 text-xs mt-1">{errors.yearsOfPractice.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email Address (shown to users) *</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="you@example.com" className="mt-1" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="whatsappNumber">WhatsApp Number (optional, shown as chat link)</Label>
                  <Input id="whatsappNumber" {...register("whatsappNumber")} placeholder="e.g. 919876543210 (with country code)" className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="bio">Brief Profile (optional, max 200 characters)</Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    rows={2}
                    maxLength={200}
                    placeholder="e.g. Practising CA with focus on individual taxation, ITR filing, and NRI tax matters."
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-400 mt-1">Factual practice description only. No marketing claims.</p>
                  {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
                </div>
              </div>
            </div>

            {/* Ethics declaration */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreeToEthics"
                  checked={!!agreeToEthics}
                  onCheckedChange={(checked) =>
                    setValue("agreeToEthics", checked ? true : (undefined as any), { shouldValidate: true })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="agreeToEthics" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
                  I confirm that I am a member of the Institute of Chartered Accountants of India (ICAI),
                  that my ICAI membership number is correct, and that this listing complies with the
                  Chartered Accountants Act, 1949 and the ICAI Code of Ethics. I understand that AiTaxBot
                  is a technology platform providing a free introduction service and is not responsible for
                  any professional engagement between me and users. *
                </Label>
              </div>
              {errors.agreeToEthics && (
                <p className="text-red-500 text-xs mt-2 ml-7">{errors.agreeToEthics.message}</p>
              )}
            </div>

            {serverError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {serverError}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-persian-blue-700 hover:bg-persian-blue-800 text-white h-11 text-base font-semibold">
              {loading ? "Submitting…" : "Submit for Review"}
            </Button>

            <p className="text-center text-xs text-slate-400">
              Profile goes live after admin verification of your ICAI membership number (1–2 business days).
              Free listing. No charges. No hidden fees.
            </p>
          </form>

          {/* ICAI verify link */}
          <p className="text-center text-xs text-slate-500 mt-4">
            Verify ICAI membership at{" "}
            <a
              href="https://www.icai.org/post.html?post_id=11967"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              icai.org Member Search →
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
