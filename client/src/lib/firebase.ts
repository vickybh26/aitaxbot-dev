import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

let analyticsInstance = null;
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
// Using signInWithPopup for reliable auth in all environments (dev & production)
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export { onAuthStateChanged, type User };
