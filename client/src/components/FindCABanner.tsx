/**
 * FindCABanner — CTA shown after calculator results
 * Drop this at the bottom of any calculator page.
 */
import { UserCheck, ArrowRight } from "lucide-react";

interface Props {
  context?: string; // e.g. "filing your ITR" or "understanding your HRA"
}

export default function FindCABanner({ context = "filing your ITR" }: Props) {
  return (
    <div className="mt-8 bg-gradient-to-r from-blue-50 to-persian-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <UserCheck className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">
          Need expert help {context}?
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Connect with a practicing CA near you — free introduction, no platform fee.
        </p>
      </div>
      <a
        href="/find-ca"
        className="flex-shrink-0 inline-flex items-center gap-1.5 bg-persian-blue-700 hover:bg-persian-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
      >
        Find a CA
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
