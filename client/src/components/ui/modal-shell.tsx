/**
 * ModalShell — dialog semantics and focus management for hand-rolled overlays.
 *
 * WHY THIS EXISTS
 * ---------------
 * Five overlays in this codebase were built as plain `fixed inset-0` divs
 * rather than with the Radix <Dialog> that already lives in components/ui.
 * None of them had role="dialog", aria-modal, a focus trap, an Escape handler,
 * background scroll-lock or focus restoration. In practice that meant:
 *
 *   - a screen reader was never told a dialog had opened;
 *   - a keyboard user tabbed straight out of the dialog into the page behind it
 *     and could then "click" controls they could not see;
 *   - Escape did nothing, so the only way out was to find the ✕ with a mouse;
 *   - the page behind scrolled while the dialog stayed put.
 *
 * The obvious fix is to port all five to Radix. That is still the right
 * end state, but each of those overlays has bespoke layout — gradient headers,
 * full-bleed mobile sheets, custom widths — and porting them wholesale risks
 * visual regressions on flows that are currently converting. This wrapper buys
 * the entire accessibility contract while rendering *nothing* of its own beyond
 * the overlay div, so the markup inside is untouched and the visuals are
 * pixel-identical.
 *
 * USAGE
 *   <ModalShell onClose={close} labelledBy="profile-modal-title">
 *     <div className="bg-white rounded-2xl …">
 *       <h2 id="profile-modal-title">Complete your profile</h2>
 *       …
 *     </div>
 *   </ModalShell>
 *
 * If a dialog has no visible heading to point at, pass `label` instead.
 */

import { useEffect, useRef, type ReactNode } from "react";

interface ModalShellProps {
  children: ReactNode;
  /** Called on Escape, on overlay click, and by the caller's own close controls. */
  onClose: () => void;
  /** id of the element that titles this dialog. Prefer this over `label`. */
  labelledBy?: string;
  /** Accessible name, when there is no visible heading to reference. */
  label?: string;
  /** Set false for dialogs that must not be dismissed by clicking the backdrop. */
  closeOnOverlayClick?: boolean;
  /** Overlay classes. Defaults match the most common existing overlay. */
  className?: string;
  "data-testid"?: string;
}

/** Elements that can hold focus, minus anything explicitly removed from the order. */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),details,[tabindex]:not([tabindex="-1"])';

export default function ModalShell({
  children,
  onClose,
  labelledBy,
  label,
  closeOnOverlayClick = true,
  className = "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4",
  "data-testid": testId,
}: ModalShellProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remember where focus came from so it can be handed back on close. Without
    // this, dismissing a dialog drops the caret back at the top of the document
    // and a keyboard user has to tab all the way to where they were.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog. Prefer the first field over the close button
    // so the user lands on the thing they came to do, not the way out.
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    // Lock the background. Restoring the exact previous value rather than
    // clearing it avoids stomping on any other component doing the same thing.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;

      // Focus trap: cycle within the dialog rather than escaping to the page.
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      tabIndex={-1}
      data-testid={testId}
      className={className}
      onMouseDown={(e) => {
        // Only the backdrop itself dismisses — not a mousedown that began on the
        // panel and happened to end on the backdrop (e.g. text selection drag).
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
