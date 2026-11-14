import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { BasicDetails } from "./model";

/** Fill empty fields once; account updates must not overwrite user edits. */
export function useBasicDetailsAutofill(value: BasicDetails, onChange: (next: BasicDetails) => void) {
  const { isAuthenticated, userProfile, user } = useAuth();

  // Autofill once, the first time account details become available — a ref
  // (not a value in `value` itself) tracks whether we've already done this,
  // so we don't clobber the user's own edits on every re-render if they
  // change a prefilled field afterwards.
  const hasAutofilled = useRef(false);

  useEffect(() => {
    if (hasAutofilled.current || !isAuthenticated) return;

    const nameFromProfile = [userProfile?.firstName, userProfile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const emailFromAccount = userProfile?.email || user?.email || "";
    const mobileFromProfile = userProfile?.mobile || "";

    // Only autofill fields that are still empty — never overwrite something
    // the user already typed in this session (e.g. they opened the wizard
    // while signed in, cleared the name, and typed a different one).
    if (nameFromProfile || emailFromAccount || mobileFromProfile) {
      onChange({
        name: value.name || nameFromProfile,
        mobile: value.mobile || mobileFromProfile,
        email: value.email || emailFromAccount,
      });
      hasAutofilled.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userProfile, user]);

  return { isAuthenticated };
}
