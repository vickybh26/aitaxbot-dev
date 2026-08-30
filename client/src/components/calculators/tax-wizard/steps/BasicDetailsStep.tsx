import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { BasicDetails } from "../types";

interface BasicDetailsStepProps {
  value: BasicDetails;
  onChange: (next: BasicDetails) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/; // Indian mobile numbers: 10 digits, starts 6-9

export function isBasicDetailsValid(value: BasicDetails): boolean {
  return (
    value.name.trim().length >= 2 &&
    MOBILE_PATTERN.test(value.mobile.trim()) &&
    EMAIL_PATTERN.test(value.email.trim())
  );
}

export default function BasicDetailsStep({ value, onChange }: BasicDetailsStepProps) {
  const { isAuthenticated, userProfile, user } = useAuth();

  // Autofill once, the first time account details become available — a ref
  // (not a value in `value` itself) tracks whether we've already done this,
  // so we don't clobber the user's own edits on every re-render if they
  // change a prefilled field afterwards.
  const hasAutofilled = useRef(false);

  useEffect(() => {
    if (hasAutofilled.current || !isAuthenticated) return;

    const nameFromProfile = [userProfile?.firstName, userProfile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const emailFromAccount = userProfile?.email || user?.email || "";
    const mobileFromProfile = userProfile?.mobile || "";

    // Only autofill fields that are still empty — never overwrite something
    // the user already typed in this session (e.g. they opened the wizard
    // while signed in, cleared the name, and typed a different one).
    if (nameFromProfile || emailFromAccount || mobileFromProfile) {
      onChange({
        name: value.name || nameFromProfile,
        mobile: value.mobile || mobileFromProfile,
        email: value.email || emailFromAccount,
      });
      hasAutofilled.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userProfile, user]);

  const mobileTouched = value.mobile.length > 0;
  const emailTouched = value.email.length > 0;
  const mobileValid = MOBILE_PATTERN.test(value.mobile.trim());
  const emailValid = EMAIL_PATTERN.test(value.email.trim());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Let's start with the basics</h2>
        <p className="text-sm text-neutral-500 mt-1">
          {isAuthenticated
            ? "Pulled from your account — feel free to correct anything."
            : "Just enough to personalise your result. Nothing is saved unless you sign in later."}
        </p>
      </div>

      <div>
        <Label htmlFor="wizard-name">Full Name</Label>
        <Input
          id="wizard-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g., Rohit Sharma"
          className="mt-1"
          autoComplete="name"
        />
      </div>

      <div>
        <Label htmlFor="wizard-mobile">Mobile Number</Label>
        <Input
          id="wizard-mobile"
          type="tel"
          inputMode="numeric"
          value={value.mobile}
          onChange={(e) => onChange({ ...value, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          placeholder="e.g., 9876543210"
          className="mt-1"
          autoComplete="tel"
          maxLength={10}
        />
        {mobileTouched && !mobileValid && (
          <p className="text-xs text-destructive mt-1">Enter a valid 10-digit Indian mobile number.</p>
        )}
      </div>

      <div>
        <Label htmlFor="wizard-email">Email Address</Label>
        <Input
          id="wizard-email"
          type="email"
          inputMode="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="e.g., name@example.com"
          className="mt-1"
          autoComplete="email"
        />
        {emailTouched && !emailValid && (
          <p className="text-xs text-destructive mt-1">Enter a valid email address.</p>
        )}
      </div>
    </div>
  );
}
