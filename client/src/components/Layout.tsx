import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import MobileTabBar from "./MobileTabBar";

interface LayoutProps {
  children: ReactNode;
  showModal?: (modalType: string) => void;
}

export default function Layout({ children, showModal }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showModal={showModal} />
      <main className="w-full flex-1">
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