import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Briefcase, X } from "lucide-react";

const OCCUPATIONS = [
  { value: "salaried", label: "Salaried Employee" },
  { value: "business", label: "Business Owner / Self-Employed" },
  { value: "ca", label: "Chartered Accountant / Tax Professional" },
  { value: "nri", label: "NRI (Non-Resident Indian)" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

interface Props {
  onClose: () => void;
}

export default function ProfileCompletionModal({ onClose }: Props) {
  const { user, userProfile, getIdToken, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: userProfile?.firstName || user?.displayName?.split(' ')[0] || '',
    lastName: userProfile?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '',
    mobile: userProfile?.mobile || '',
    occupation: userProfile?.occupation || '',
    city: userProfile?.city || '',
    state: userProfile?.state || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mobile || !form.occupation) {
      toast({ title: "Required fields missing", description: "Please fill in mobile number and occupation.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...form, isProfileComplete: true })
      });
      if (!res.ok) throw new Error('Failed to save');
      await refreshProfile();
      toast({ title: "Profile saved!", description: "Welcome to AiTaxBot." });
      onClose();
    } catch {
      toast({ title: "Error", description: "Could not save profile. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl px-6 py-5 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 rounded-full p-2">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Complete your profile</h2>
          </div>
          <p className="text-blue-100 text-sm">Takes 30 seconds — helps us personalise your tax experience.</p>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{
                width: `${
                  (!!form.firstName ? 16 : 0) +
                  (!!form.lastName ? 16 : 0) +
                  (!!form.mobile ? 17 : 0) +
                  (!!form.occupation ? 17 : 0) +
                  (!!form.city ? 17 : 0) +
                  (!!form.state ? 17 : 0)
                }%`
              }}
            />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Ravi" required />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Sharma" />
            </div>
          </div>

          <div>
            <Label htmlFor="mobile" className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Mobile Number *</Label>
            <Input
              id="mobile"
              type="tel"
              value={form.mobile}
              onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
              placeholder="9876543210"
              maxLength={10}
              required
            />
          </div>

          <div>
            <Label htmlFor="occupation" className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> I am a... *</Label>
            <select
              id="occupation"
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.occupation}
              onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))}
              required
            >
              <option value="">Select occupation</option>
              {OCCUPATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city" className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> City</Label>
              <Input id="city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Skip for now
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
