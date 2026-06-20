/**
 * Callout — AiTaxBot Design System
 * Inline alert / tip / disclaimer boxes used throughout calculators and guides.
 * Translated from the DS JSX spec into production Tailwind/React.
 */
import { AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type CalloutTone = "info" | "success" | "warning" | "danger";

const TONE_STYLES: Record<
  CalloutTone,
  { bg: string; border: string; icon: string; title: string; Icon: typeof AlertCircle }
> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    icon: "text-blue-600",
    title: "text-blue-700",
    Icon: AlertCircle,
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-100",
    icon: "text-green-600",
    title: "text-green-700",
    Icon: CheckCircle2,
  },
  warning: {
    bg: "bg-orange-50",
    border: "border-orange-100",
    icon: "text-orange-500",
    title: "text-orange-700",
    Icon: AlertTriangle,
  },
  danger: {
    bg: "bg-red-50",
    border: "border-red-100",
    icon: "text-red-500",
    title: "text-red-600",
    Icon: XCircle,
  },
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Callout({ tone = "info", title, children, className }: CalloutProps) {
  const styles = TONE_STYLES[tone];
  const { Icon } = styles;

  return (
    <div
      className={cn(
        "flex gap-3 p-3.5 rounded-xl border",
        styles.bg,
        styles.border,
        className
      )}
    >
      <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", styles.icon)} />
      <div className="flex flex-col gap-0.5">
        {title && (
          <span className={cn("text-sm font-semibold", styles.title)}>{title}</span>
        )}
        <span className="text-sm text-slate-700 leading-relaxed">{children}</span>
      </div>
    </div>
  );
}
