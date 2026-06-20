import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

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
    </div>
  );
}