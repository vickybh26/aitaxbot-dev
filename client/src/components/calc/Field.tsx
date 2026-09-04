import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Ported verbatim (structure + classNames) from Lovable's src/components/calc/Field.tsx,
 * 2026-09-04, per Vicky's explicit "I want the exact same UI". The `ink`/`credit`/`rule`
 * Tailwind classes below are aliases added in tailwind.config.ts pointing at this
 * codebase's own already-verified tokens (--primary, --success-green, --border) — see
 * that file's comment — so this is the same visual result, not a copy of Lovable's
 * design system running in parallel.
 *
 * Only the calculation logic that CONSUMES these components differs, and it stays
 * ours: shared/taxLiability.ts, the wizard's own multi-step state, HRA's 8-metro-city
 * rule, the computed itrDeadline() — none of that is touched by this file.
 */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-ink/55">{hint}</p>}
    </label>
  );
}

export function MoneyInput({
  value,
  onChange,
  min = 0,
  step = 1000,
  prefix = "₹",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  prefix?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-rule bg-paper px-4 py-3 focus-within:border-credit">
      <span className="text-sm font-semibold text-ink/45">{prefix}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="tabular-figures w-full bg-transparent text-[15px] font-semibold outline-none"
      />
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  ...rest
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  type?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "placeholder" | "type">) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-rule bg-paper px-4 py-3 text-[15px] font-medium outline-none focus:border-credit"
      {...rest}
    />
  );
}

export function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-rule bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            value === o.value
              ? "bg-ink text-paper"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean | undefined;
  tone?: "credit" | "debit" | undefined;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0 ${
        strong ? "font-bold" : ""
      }`}
    >
      <span className={`text-sm ${strong ? "" : "text-ink/65"}`}>{label}</span>
      <span
        className={`tabular-figures text-sm font-semibold ${
          tone === "credit" ? "text-credit" : tone === "debit" ? "text-debit" : ""
        } ${strong ? "text-base" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
