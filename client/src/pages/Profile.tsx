import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/firebase";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Briefcase, Mail, Shield, CheckCircle, Clock, Edit2, AlertTriangle, Trash2 } from "lucide-react";

const OCCUPATIONS: Record<string, string> = {
  salaried: "Salaried Employee",
  business: "Business Owner / Self-Employed",
  ca: "Chartered Accountant / Tax Professional",
  nri: "NRI (Non-Resident Indian)",
  student: "Student",
  retired: "Retired",
  other: "Other",
};

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal",
];

export default function Profile() {
  const { user, userProfile, isAuthenticated, loading, getIdToken, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    occupation: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation('/login?returnUrl=/profile');
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (userProfile) {
      setForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        mobile: userProfile.mobile || '',
        occupation: userProfile.occupation || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
      });
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          isProfileComplete: !!(form.firstName && form.lastName && form.mobile)
        })
      });
      if (!res.ok) throw new Error();
      await refreshProfile();
      toast({ title: "Profile updated", description: "Your details have been saved." });
      setEditing(false);
    } catch {
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      await logout();
      toast({ title: "Account deleted", description: "Your account and data have been removed." });
      setLocation('/');
    } catch {
      toast({ title: "Error", description: "Could not delete your account. Please try again or email info@aitaxbot.in.", variant: "destructive" });
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const completedFields = [form.firstName, form.lastName, form.mobile, form.occupation, form.city, form.state].filter(Boolean).length;
  const completionPct = Math.round((completedFields / 6) * 100);

  return (
    <>
      <Helmet>
        <title>My Profile - AiTaxBot</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="bg-slate-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-persian-blue-600 to-persian-blue-700 px-6 py-8 text-white">
              <div className="flex items-center gap-4">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-white/50" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {(userProfile?.firstName || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">
                    {userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.displayName || 'Your Profile'}
                  </h1>
                  <p className="text-blue-100 text-sm">{user?.email}</p>
                  {userProfile?.occupation && (
                    <span className="inline-block mt-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {OCCUPATIONS[userProfile.occupation] || userProfile.occupation}
                    </span>
                  )}
                </div>
              </div>

              {/* Completion bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-blue-100 mb-1">
                  <span>Profile completion</span>
                  <span>{completionPct}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                </div>
                {completionPct < 100 && (
                  <p className="text-blue-100 text-xs mt-1">Complete your profile to unlock personalised tax tips.</p>
                )}
              </div>
            </div>
          </Card>

          {/* Details card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Personal Details</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="flex items-center gap-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!editing ? (
                <div className="space-y-4">
                  <InfoRow icon={<User className="w-4 h-4" />} label="Name"
                    value={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : '—'} />
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email || '—'} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Mobile" value={userProfile?.mobile || '—'} />
                  <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Occupation"
                    value={userProfile?.occupation ? (OCCUPATIONS[userProfile.occupation] || userProfile.occupation) : '—'} />
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location"
                    value={[userProfile?.city, userProfile?.state].filter(Boolean).join(', ') || '—'} />
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>First Name</Label>
                      <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Ravi" />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Sharma" />
                    </div>
                  </div>
                  <div>
                    <Label>Mobile Number</Label>
                    <Input type="tel" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="9876543210" maxLength={10} />
                  </div>
                  <div>
                    <Label>Occupation</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.occupation}
                      onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))}
                    >
                      <option value="">Select occupation</option>
                      {Object.entries(OCCUPATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>City</Label>
                      <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
                    </div>
                    <div>
                      <Label>State</Label>
                      <select
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.state}
                        onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                      >
                        <option value="">Select state</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={<Shield className="w-4 h-4" />} label="Sign-in method"
                value={userProfile?.authProvider === 'google.com' || userProfile?.authProvider === 'google' ? 'Google' : 'Email & Password'} />
              <InfoRow icon={<CheckCircle className="w-4 h-4 text-green-500" />} label="Account status" value="Active" />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Member since"
                value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
            </CardContent>
          </Card>

          {/* Danger zone — DPDP Right to Erasure */}
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Delete Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Permanently delete your AiTaxBot account and all associated personal data
                (profile, saved calculation history, profile change logs). This cannot be
                undone. Under India's Digital Personal Data Protection Act, 2023, you have
                the right to request erasure of your data at any time.
              </p>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete My Account & Data
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              You are about to <strong>permanently delete</strong> your AiTaxBot account
              and all data linked to it — profile, saved calculations, and profile history.
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. You will be signed out immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? "Deleting…" : "Yes, Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-500 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
