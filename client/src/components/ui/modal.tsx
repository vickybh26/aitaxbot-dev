import { ReactNode, useId } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl";
}

export default function Modal({ isOpen, onClose, title, children, size = "4xl" }: ModalProps) {
  const titleId = useId();
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl", 
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl"
  };

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      /* Overlay unified to bg-black/50 — this was the only one using the
         legacy `bg-black bg-opacity-50` pair, so backdrops differed slightly
         from dialog to dialog across the site. */
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <Card className={`bg-card rounded-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id={titleId} className="text-2xl font-bold text-ink">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-ink/55 hover:text-ink/80"
              aria-label="Close"
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {children}
        </div>
      </Card>
    </ModalShell>
  );
}
