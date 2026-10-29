import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck, type VerifyAppCheckTokenResponse } from 'firebase-admin/app-check';
import { getFirestore as sdkFirestore, FieldValue } from 'firebase-admin/firestore';

let firebaseApp: App;

export function initializeFirebase() {
  if (!firebaseApp) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    try {
      const serviceAccountJSON = JSON.parse(serviceAccount);
      
      firebaseApp = initializeApp({
        credential: cert(serviceAccountJSON),
        storageBucket: 'aitaxbot-e5c0e.firebasestorage.app'
      });
      
      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }
  
  return firebaseApp;
}

export function getFirestore() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return sdkFirestore(firebaseApp);
}

export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken | null> {
  try {
    if (!firebaseApp) {
      initializeFirebase();
    }
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

/**
 * Verify a Firebase App Check token. Used to confirm that a request is
 * actually coming from our real web app (reCAPTCHA v3 challenge) and not
 * from a script hammering public endpoints. Returns the decoded token on
 * success, or null on failure. Never throws.
 */
export async function verifyAppCheckToken(
  token: string
): Promise<VerifyAppCheckTokenResponse | null> {
  try {
    if (!firebaseApp) {
      initializeFirebase();
    }
    return await getAppCheck(firebaseApp).verifyToken(token);
  } catch (error) {
    console.error('Error verifying Firebase App Check token:', error);
    return null;
  }
}

// Small compatibility facade for existing internal consumers. All SDK calls
// use the supported modular entry points; no legacy namespace import remains.
export const admin = {
  auth: () => getAuth(initializeFirebase()),
  firestore: Object.assign(getFirestore, { FieldValue }),
};
