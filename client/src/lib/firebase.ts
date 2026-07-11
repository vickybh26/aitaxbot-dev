import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
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
if (typeof window !== 'undefined') {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lee0X8sAAAAACedq2LTR5ojEoSddwas2wnN2u2c'
      ),
      isTokenAutoRefreshEnabled: true, // auto-refreshes token in background
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

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (POPUP_FALLBACK_CODES.has(error?.code)) {
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

export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export { onAuthStateChanged, type User };
