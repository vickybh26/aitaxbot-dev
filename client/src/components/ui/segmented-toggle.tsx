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
              "rounded-lg font-semibold whitespace-nowrap transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              fullWidth && "flex-1",
              active
                ? "bg-white text-blue-600 shadow-sm"
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
