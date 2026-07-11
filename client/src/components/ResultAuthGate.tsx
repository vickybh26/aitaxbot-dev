/**
 * ResultAuthGate
 *
 * Shown in place of a calculator's result when the visitor is not signed in.
 * The calculation itself still runs freely (no gate on inputs) — only the
 * computed numbers are hidden until the user signs in or creates a free
 * account. This is the shared building block for the sitewide "sign in to
 * see your result" flow.
 */

import { Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

interface ResultAuthGateProps {
  /** Human-readable tool name shown in the CTA copy, e.g. "HRA Calculator" */
  toolName: string;
}

export default function ResultAuthGate({ toolName }: ResultAuthGateProps) {
  const [currentPath] = useLocation();
  const returnUrl = encodeURIComponent(
    currentPath + (typeof window !== "undefined" ? window.location.search : "")
  );

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50">
      <CardContent className="py-10 px-6 text-center">
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          Sign in to see your result
        </h3>
        <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
          Your {toolName} result is ready. Sign in or create a free AiTaxBot
          account to view it — takes 10 seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`/login?tab=signup&returnUrl=${returnUrl}`}>
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Create Free Account
            </Button>
          </a>
          <a href={`/login?returnUrl=${returnUrl}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Free forever. Your inputs are not saved unless you choose to.
        </p>
      </CardContent>
    </Card>
  );
}
