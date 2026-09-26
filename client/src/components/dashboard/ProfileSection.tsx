/**
 * ProfileSection — personal details, account info and account deletion.
 *
 * Merged into the dashboard 2026-09-26. Vicky: "We have profile and
 * Dashboard separately, Merge them" — the account menu carried two links
 * to two different pages, and both said who you were: this section used
 * to be a whole separate /profile page whose own header card (avatar,
 * name, email, occupation badge, completion bar) duplicated exactly what
 * the dashboard's own "Good to see you, {name}" greeting and profile-
 * completion banner already show above this. Only the parts that were
 * genuinely new information are kept here: the editable details form,
 * the account metadata, and the DPDP right-to-erasure control.
 *
 * /profile still exists as a route — it just redirects here (see
 * pages/Profile.tsx) so a bookmarked or emailed link keeps working.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/firebase";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  Mail,
  Shield,
  CheckCircle,
  Clock,
  Edit2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import Panel from "./Panel";

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
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

/**
 * Firestore's Admin SDK writes a raw `new Date()` as a Timestamp, which
 * serialises to `{_seconds, _nanoseconds}` over JSON rather than an ISO
 * string — `new Date(...)` on that object is silently "Invalid Date". Every
 * account created before 2026-09-26 has this shape for `createdAt` (fixed
 * going forward in storage.ts's upsertUser, but existing documents don't
 * self-heal). AdminUsers.tsx already carries this same fallback for the
 * admin-side user list; applied here too rather than showing "Invalid Date"
 * on a page a real user sees.
 */
function parseFirestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "_seconds" in (value as any)) {
    return new Date((value as any)._seconds * 1000);
  }
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

export default function ProfileSection() {
  const { user, userProfile, getIdToken, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    occupation: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    if (userProfile) {
      setForm({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        mobile: userProfile.mobile || "",
        occupation: userProfile.occupation || "",
        city: userProfile.city || "",
        state: userProfile.state || "",
      });
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          isProfileComplete: !!(form.firstName && form.lastName && form.mobile),
        }),
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
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      await logout();
      toast({ title: "Account deleted", description: "Your account and data have been removed." });
      setLocation("/");
    } catch {
      toast({
        title: "Error",
        description: "Could not delete your account. Please try again or email admin@aitaxbot.co.in.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  const memberSince = parseFirestoreDate(userProfile?.createdAt);

  return (
    <>
      <Panel
        id="profile"
        title="Profile & account"
        meta="Your details, sign-in method, and account controls"
      >
        <div className="space-y-6">
          {/* ── Personal details ── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Personal details</h3>
              {!editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1"
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>

            {!editing ? (
              <div className="space-y-4">
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Name"
                  value={
                    userProfile?.firstName
                      ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
                      : "—"
                  }
                />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || "—"} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile" value={userProfile?.mobile || "—"} />
                <InfoRow
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Occupation"
                  value={
                    userProfile?.occupation
                      ? OCCUPATIONS[userProfile.occupation] || userProfile.occupation
                      : "—"
                  }
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={[userProfile?.city, userProfile?.state].filter(Boolean).join(", ") || "—"}
                />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="Ravi"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Sharma"
                    />
                  </div>
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label>Occupation</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.occupation}
                    onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))}
                  >
                    <option value="">Select occupation</option>
                    {Object.entries(OCCUPATIONS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.state}
                      onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <hr className="border-rule" />

          {/* ── Account details ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">Account details</h3>
            <div className="space-y-4">
              <InfoRow
                icon={<Shield className="h-4 w-4" />}
                label="Sign-in method"
                value={
                  userProfile?.authProvider === "google.com" || userProfile?.authProvider === "google"
                    ? "Google"
                    : "Email & Password"
                }
              />
              <InfoRow
                icon={<CheckCircle className="h-4 w-4 text-credit" />}
                label="Account status"
                value="Active"
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Member since"
                value={
                  memberSince
                    ? memberSince.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                    : "—"
                }
              />
            </div>
          </div>

          <hr className="border-rule" />

          {/* ── Danger zone — DPDP Right to Erasure ── */}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-debit">
              <AlertTriangle className="h-4 w-4" /> Delete account
            </h3>
            <p className="mb-4 text-sm text-ink/65">
              Permanently delete your AiTaxBot account and all associated personal data
              (profile, saved calculation history, profile change logs). This cannot be
              undone. Under India's Digital Personal Data Protection Act, 2023, you have
              the right to request erasure of your data at any time.
            </p>
            <Button
              variant="outline"
              className="border-debit/40 text-debit hover:bg-debit-wash hover:text-debit"
              onClick={() => setDeleteOpen(true)}
              data-testid="button-delete-account"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete My Account & Data
            </Button>
          </div>
        </div>
      </Panel>

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-debit">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-ink/80">
              You are about to <strong>permanently delete</strong> your AiTaxBot account
              and all data linked to it — profile, saved calculations, and profile history.
            </p>
            <p className="text-sm font-medium text-debit">
              This action cannot be undone. You will be signed out immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDeleteAccount}>
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
      <div className="shrink-0 text-ink/65">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink/65">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
