import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
  showModal?: (modalType: string) => void;
}

export default function Layout({ children, showModal }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header showModal={showModal} />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}