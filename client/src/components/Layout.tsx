import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import MobileTabBar from "./MobileTabBar";

interface LayoutProps {
  children: ReactNode;
  showModal?: (modalType: string) => void;
}

export default function Layout({ children, showModal }: LayoutProps) {
  // bg-paper (warm cream, index.css) instead of bg-white — the "Warm Ledger"
  // direction ported from Lovable 2026-09-04. Set once here at the app-shell
  // level rather than per-page: every nested surface (Card, bg-white
  // sections, bg-slate-50 panels) already declares its own explicit
  // background, so they render as bright cards on top of this canvas — the
  // standard pattern, not a risk. The print stylesheet (index.css, @media
  // print) independently forces `background: #fff !important` on html/body,
  // so printed output is unaffected regardless of this token's value.
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Skip link. On a calculator page a keyboard user previously had to tab
          through the logo, six nav links, a dropdown, a CTA and the login link
          before reaching the first form field — on every single page load.
          Visually hidden until focused, then rendered as a normal button. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]
                   focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-ink
                   focus:text-paper focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Header showModal={showModal} />
      <main id="main" tabIndex={-1} className="w-full flex-1">
        {children}
      </main>
      <Footer />
      {/* Spacer sits AFTER the footer, not before it: the tab bar is fixed to
          the viewport, so what needs clearing is the end of the scrollable
          document. Placed above the footer it would merely push the footer up
          and the bar would still cover the footer's last rows. Height matches
          the bar (56px) plus the iOS home-indicator inset. */}
      <div className="md:hidden h-[calc(56px+env(safe-area-inset-bottom))]" aria-hidden="true" />
      <MobileTabBar />
    </div>
  );
}