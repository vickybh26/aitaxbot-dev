import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isPlaceholderKey = !rawApiKey || rawApiKey === "your_firebase_api_key_here";

const firebaseConfig = {
  apiKey: isPlaceholderKey ? "dummy-firebase-api-key-for-local-dev-rendering" : rawApiKey,
  authDomain: `${isPlaceholderKey ? "aitaxbot-e5c0e" : import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: isPlaceholderKey ? "https://aitaxbot-e5c0e-default-rtdb.firebaseio.com" : import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: isPlaceholderKey ? "aitaxbot-e5c0e" : import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${isPlaceholderKey ? "aitaxbot-e5c0e" : import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: isPlaceholderKey ? "275518195519" : import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: isPlaceholderKey ? "1:275518195519:web:00bbefb3e9f4c21470358a" : import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: isPlaceholderKey ? "G-WYGS15GW5J" : import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  try {
    analyticsInstance = getAnalytics(app);
  } catch (e) {
    console.warn('[Firebase Analytics] Failed to initialize:', e);
  }
}
export const analytics = analyticsInstance;

export const auth = getAuth(app);

// Firebase App Check — protects Gemini quota from abuse
// Uses reCAPTCHA v3; site key is public (safe in client code)
//
// IMPORTANT: App Check enforcement is enabled on Firebase Authentication, not
// just on Gemini. A signUp / signInWithPassword call without a valid App Check
// token is rejected with 401 "Firebase App Check token is invalid". So if token
// acquisition fails here, the user cannot create an account at all.
//
// The try/catch below only ever caught synchronous initialisation errors. Token
// acquisition is asynchronous and used to fail completely silently — which is
// the worst case, because the symptom (sign-ups quietly not happening) shows up
// in the metrics weeks later with nothing in the logs to explain it. We now
// probe for a token once on load and report failures.
if (typeof window !== 'undefined') {
  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lee0X8sAAAAACedq2LTR5ojEoSddwas2wnN2u2c'
      ),
      isTokenAutoRefreshEnabled: true, // auto-refreshes token in background
    });

    // Fire-and-forget health probe. If this fails the visitor is very likely
    // running a privacy blocker that blocks www.google.com/recaptcha, and any
    // sign-in or sign-up attempt they make will be rejected.
    void getToken(appCheck, /* forceRefresh */ false).catch((e) => {
      console.warn('[App Check] Could not obtain a token — sign-in will fail for this visitor:', e);
      void fetch('/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'app-check-token-failure',
          reason: String((e as any)?.code || (e as any)?.message || 'unknown').slice(0, 200),
          path: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => { /* never let telemetry break the page */ });
    });
  } catch (e) {
    // App Check may fail in localhost dev if domain isn't whitelisted — non-fatal
    console.warn('[App Check] Initialization skipped:', e);
  }
}

// Firebase AI Logic — Gemini Developer API
// Requires "AI Logic" to be enabled in your Firebase console project
// (Build → AI Logic → Get started → select Gemini Developer API)
let _firebaseAI: ReturnType<typeof getAI> | null = null;
let _geminiModel: ReturnType<typeof getGenerativeModel> | null = null;

export function getGeminiModel() {
  if (!_geminiModel) {
    try {
      _firebaseAI = getAI(app, { backend: new GoogleAIBackend() });
      _geminiModel = getGenerativeModel(_firebaseAI, {
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });
    } catch (e) {
      console.warn("[Firebase AI] Not configured — falling back to server-side Gemini:", e);
    }
  }
  return _geminiModel;
}
export const googleProvider = new GoogleAuthProvider();

// Set custom parameters for better UX
googleProvider.setCustomParameters({
  prompt: 'select_account' // Always show account selector
});

// Auth functions
// Google sign-in: try popup first (fastest, no page reload). If the popup
// itself is blocked or gets cancelled by the browser — very common with
// third-party-cookie blocking in Safari/Chrome privacy modes and most
// ad/privacy extensions, and reported by users as "sign-in cancelled" even
// though they didn't close anything — fall back to a full-page redirect
// flow instead of surfacing an error. Genuine user-initiated cancellation
// (closing the popup deliberately) still fails normally via the catch in
// the calling code, since redirect can't distinguish "blocked" from
// "closed" — but redirect itself doesn't have the blocking problem, so
// this converts most environmental failures into a successful sign-in.
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/popup-closed-by-user",
]);

/**
 * sessionStorage key holding where to send the user once a redirect-based
 * Google sign-in completes.
 *
 * The redirect flow reloads the whole page, so any returnUrl held in React
 * state or in the /login query string is gone by the time the user comes back.
 * Previously that meant every popup-blocked Google user landed on "/" instead
 * of the dashboard — or, worse, instead of the calculator they were part-way
 * through filling in.
 */
export const AUTH_REDIRECT_DEST_KEY = "aitaxbot:authRedirectDest";

/** Only same-origin relative paths are ever honoured — guards against open redirect. */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export const signInWithGoogle = async (redirectDest?: string) => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (POPUP_FALLBACK_CODES.has(error?.code)) {
      // Remember where the user was headed before we navigate away. Defaults
      // to the current page, which is the right answer for the in-page
      // AuthModal on a calculator.
      try {
        const dest = redirectDest ?? `${window.location.pathname}${window.location.search}`;
        if (isSafeRedirectPath(dest)) {
          sessionStorage.setItem(AUTH_REDIRECT_DEST_KEY, dest);
        }
      } catch {
        // Private-mode Safari can throw on sessionStorage writes — sign-in
        // still works, the user just lands on the default destination.
      }

      // signInWithRedirect navigates away — the promise never resolves in
      // this tab. The caller's .then()/finally logic simply won't run
      // before navigation, which is expected for a redirect flow.
      await signInWithRedirect(auth, googleProvider);
      return undefined as any;
    }
    throw error;
  }
};

// Completes a redirect-based sign-in on page load, if one is in progress.
// Call this once on app init (see AuthContext) — resolves to null if the
// user didn't just come back from a redirect sign-in.
export const completeGoogleRedirectSignIn = () => getRedirectResult(auth);

/** Reads and clears the pending redirect destination. Returns null if unset or unsafe. */
export function consumeAuthRedirectDest(): string | null {
  try {
    const dest = sessionStorage.getItem(AUTH_REDIRECT_DEST_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_DEST_KEY);
    return isSafeRedirectPath(dest) ? dest : null;
  } catch {
    return null;
  }
}

export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export { onAuthStateChanged, type User };
