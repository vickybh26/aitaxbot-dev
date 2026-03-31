/**
 * WhatsAppButton.tsx
 * Floating WhatsApp chat button for aitaxbot.co.in
 *
 * - Bottom-right corner, always visible
 * - Opens WhatsApp with a pre-filled "Hi AiTaxBot" message
 * - Shows a dismissible tooltip bubble after 5 seconds
 * - Pulses to draw attention
 */

import { useState, useEffect } from "react";

// Replace with your WhatsApp Business number (country code + number, no +, no spaces)
// e.g. if your number is +91 98765 43210, use "919876543210"
const WHATSAPP_NUMBER = process.env.VITE_WHATSAPP_NUMBER ?? "";

const PRE_FILLED_MESSAGE = encodeURIComponent(
  "Hi AiTaxBot! I need help with my taxes."
);

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${PRE_FILLED_MESSAGE}`;

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed]     = useState(false);

  // Show tooltip after 5 seconds, hide after 8 seconds
  useEffect(() => {
    if (dismissed) return;
    const showTimer    = setTimeout(() => setShowTooltip(true),  5_000);
    const hideTimer    = setTimeout(() => setShowTooltip(false), 12_000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [dismissed]);

  // Don't render if no number is configured yet
  if (!WHATSAPP_NUMBER) return null;

  return (
    <>
      {/* Tooltip bubble */}
      {showTooltip && !dismissed && (
        <div
          className="fixed bottom-24 right-4 z-50 max-w-[220px] bg-white rounded-2xl shadow-xl border border-gray-100 p-3 animate-fade-in"
          style={{ animation: "fadeInUp 0.3s ease" }}
        >
          <button
            onClick={() => { setShowTooltip(false); setDismissed(true); }}
            className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 text-xs leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
          <p className="text-xs font-semibold text-gray-800 leading-snug pr-4">
            Have a tax question?
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Chat with AiTaxBot on WhatsApp — free, instant answers.
          </p>
          {/* Arrow pointing down-right */}
          <div
            className="absolute bottom-[-8px] right-6 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45"
          />
        </div>
      )}

      {/* WhatsApp button */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with AiTaxBot on WhatsApp"
        onClick={() => setShowTooltip(false)}
        className="fixed bottom-5 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
      >
        {/* WhatsApp SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-7 h-7"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>

        {/* Pulse ring */}
        <span
          className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping"
          style={{ backgroundColor: "#25D366" }}
        />
      </a>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
