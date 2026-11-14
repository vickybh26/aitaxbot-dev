import { EMAIL_PATTERN, MOBILE_PATTERN } from "@/features/income-tax/validation";
import { useBasicDetailsAutofill } from "@/features/income-tax/useBasicDetailsAutofill";
import { Field, TextInput } from "@/components/calc/Field";
import type { BasicDetails } from "@/features/income-tax/model";

interface BasicDetailsStepProps {
  value: BasicDetails;
  onChange: (next: BasicDetails) => void;
}

export default function BasicDetailsStep({ value, onChange }: BasicDetailsStepProps) {
  const { isAuthenticated } = useBasicDetailsAutofill(value, onChange);

  const mobileTouched = value.mobile.length > 0;
  const emailTouched = value.email.length > 0;
  const mobileValid = MOBILE_PATTERN.test(value.mobile.trim());
  const emailValid = EMAIL_PATTERN.test(value.email.trim());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Let's start with the basics</h2>
        <p className="text-sm text-ink/65 mt-1">
          {isAuthenticated
            ? "Pulled from your account — feel free to correct anything."
            : "Just enough to personalise your result. Nothing is saved unless you sign in later."}
        </p>
      </div>

      <Field label="Full Name">
        <TextInput
          id="wizard-name"
          value={value.name}
          onChange={(v) => onChange({ ...value, name: v })}
          placeholder="e.g., Rohit Sharma"
          autoComplete="name"
        />
      </Field>

      <Field label="Mobile Number">
        <TextInput
          id="wizard-mobile"
          type="tel"
          inputMode="numeric"
          value={value.mobile}
          onChange={(v) => onChange({ ...value, mobile: v.replace(/\D/g, "").slice(0, 10) })}
          placeholder="e.g., 9876543210"
          autoComplete="tel"
          maxLength={10}
        />
        {mobileTouched && !mobileValid && (
          <p className="text-xs text-debit mt-1.5">Enter a valid 10-digit Indian mobile number.</p>
        )}
      </Field>

      <Field label="Email Address">
        <TextInput
          id="wizard-email"
          type="email"
          inputMode="email"
          value={value.email}
          onChange={(v) => onChange({ ...value, email: v })}
          placeholder="e.g., name@example.com"
          autoComplete="email"
        />
        {emailTouched && !emailValid && (
          <p className="text-xs text-debit mt-1.5">Enter a valid email address.</p>
        )}
      </Field>
    </div>
  );
}
