import admin from 'firebase-admin';

let firebaseApp: admin.app.App;

export function initializeFirebase() {
  if (!firebaseApp) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    try {
      const serviceAccountJSON = JSON.parse(serviceAccount);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJSON),
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
  return admin.firestore();
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    if (!firebaseApp) {
      initializeFirebase();
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
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
): Promise<admin.appCheck.VerifyAppCheckTokenResponse | null> {
  try {
    if (!firebaseApp) {
      initializeFirebase();
    }
    return await admin.appCheck().verifyToken(token);
  } catch (error) {
    console.error('Error verifying Firebase App Check token:', error);
    return null;
  }
}

export { admin };
