/**
 * Tools index (/tools)
 *
 * Exists so the "Tools" tab in the mobile bottom bar has a destination, and so
 * the non-calculator tools stop being reachable only by direct URL. The AIS
 * reconciliation tool is listed first and given the most prominent treatment:
 * it is the product's real differentiator and had recorded zero uses by any
 * real user, which was a discoverability failure rather than a demand one.
 */

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { trackPageView } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  FileSearch,
  Receipt,
  Calculator,
  BookOpen,
  UserCheck,
  ArrowRight,
} from "lucide-react";

const PRIMARY = {
  title: "AIS / 26AS / Form 16 Check",
  description:
    "Upload your AIS, Form 26AS and Form 16. We read all three, cross-check them against each other, and show you exactly what the Income Tax Department already knows about your income — before you file.",
  href: "/tools/ais-26as-form16",
  icon: FileSearch,
};

const TOOLS = [
  {
    title: "Rent Receipt Generator",
    description: "Generate signed rent receipts for your HRA claim, emailed as a PDF.",
    href: "/tools/rent-receipt",
    icon: Receipt,
  },
  {
    title: "All Calculators",
    description: "Income tax, HRA, SIP, SWP, PF, NPS, home loan, vehicle loan and trading tax.",
    href: "/calculators",
    icon: Calculator,
  },
  {
    title: "Accounting Tools",
    description: "Invoices, clients and registers for small businesses and professionals.",
    href: "/accounting",
    icon: BookOpen,
  },
  {
    title: "Find a CA",
    description: "Verified Chartered Accountants by city. Free directory, no platform fee.",
    href: "/find-ca",
    icon: UserCheck,
  },
];

export default function Tools() {
  useEffect(() => {
    trackPageView("/tools", "Tools - AiTaxBot");
  }, []);

  return (
    <>
      <Helmet>
        <title>Free Tax Tools — AIS Check, Rent Receipts &amp; Calculators | AiTaxBot</title>
        <meta
          name="description"
          content="Free Indian tax tools: reconcile your AIS, Form 26AS and Form 16 before filing, generate HRA rent receipts, and use 9 tax and investment calculators."
        />
        <link rel="canonical" href="https://www.aitaxbot.co.in/tools" />
      </Helmet>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-3xl font-bold text-ink mb-1">Tools</h1>
        <p className="text-ink/65 mb-8">
          Everything on AiTaxBot is free to use.
        </p>

        {/* Primary tool — deliberately given a full-width card of its own. */}
        <Link href={PRIMARY.href}>
          <div className="rounded-2xl border border-rule bg-gradient-to-br from-paper to-blue-50 p-6 mb-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center shrink-0">
                <PRIMARY.icon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-lg font-bold text-ink">{PRIMARY.title}</h2>
                  <span className="text-[10px] font-bold text-ink bg-card border border-rule px-2 py-0.5 rounded-full">
                    Most useful before filing
                  </span>
                </div>
                <p className="text-sm text-ink/80 leading-relaxed mb-4">
                  {PRIMARY.description}
                </p>
                <Button size="sm" className="bg-ink hover:bg-ink text-white">
                  Run a free check <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map(({ title, description, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="h-full rounded-2xl border border-rule bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-ink" />
                </div>
                <h2 className="text-base font-bold text-ink mb-1">{title}</h2>
                <p className="text-sm text-ink/65 leading-snug">{description}</p>
                <span className="mt-auto pt-3 text-xs font-semibold text-credit flex items-center gap-1">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
