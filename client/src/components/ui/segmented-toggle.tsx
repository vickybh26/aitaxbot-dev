/**
 * SegmentedToggle — AiTaxBot Design System
 * The "Old Regime / New Regime" toggle pattern used throughout tax calculators.
 * Translated from the DS JSX spec into production Tailwind/React.
 */
import { cn } from "@/lib/utils";

interface SegmentOption {
  value: string;
  label: string;
}

interface SegmentedToggleProps {
  options: (SegmentOption | string)[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedToggle({
  options,
  value,
  onChange,
  size = "md",
  fullWidth = false,
  className,
}: SegmentedToggleProps) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex p-1 gap-1 bg-slate-100 rounded-xl",
        fullWidth && "w-full",
        className
      )}
    >
      {normalized.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              // whitespace-nowrap used to be unconditional here. Combined with
              // fullWidth's flex-1, that gives every button a minimum width
              // equal to its own (unshrinkable) content width — fine for short
              // 2-option labels ("Old Regime"/"New Regime"), but with 3 longer
              // labels (e.g. "80+ (Super Senior)") the row's total minimum
              // width exceeds a phone screen and there's no wrap or scroll
              // fallback, so the last option silently clips off-screen. This
              // was the only call site (grep confirmed) at the time of the
              // fix, so allowing wrap here is safe for every current usage:
              // short labels never wrap regardless, longer ones now wrap to a
              // second line instead of overflowing horizontally.
              "rounded-lg font-semibold text-center leading-tight transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--interactive-blue))]",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              fullWidth && "flex-1 min-w-0",
              active
                ? "bg-white text-primary shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
