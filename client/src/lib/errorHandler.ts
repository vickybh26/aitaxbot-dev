/**
 * Security utility to sanitize error messages before displaying to users.
 * Prevents exposure of sensitive information like API keys, tokens, or configuration details.
 */

interface FirebaseError extends Error {
  code?: string;
  customData?: any;
}

/**
 * Sanitizes Firebase authentication error messages to prevent
 * exposure of sensitive configuration details (API keys, tokens, etc.)
 */
export function sanitizeAuthError(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred";
  }

  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError.code;

  // Map Firebase error codes to user-friendly messages
  // This prevents exposing internal error details
  const errorMessages: Record<string, string> = {
    // Authentication errors
    'auth/invalid-email': 'Invalid email address format',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/operation-not-allowed': 'This sign-in method is not enabled',
    'auth/account-exists-with-different-credential': 'An account already exists with this email',
    'auth/invalid-verification-code': 'Invalid verification code',
    'auth/invalid-verification-id': 'Invalid verification ID',
    
    // Popup and redirect errors
    'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups for this site',
    'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again',
    'auth/cancelled-popup-request': 'Sign-in cancelled',
    'auth/unauthorized-domain': 'This domain is not authorized for authentication',
    
    // Network errors
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/timeout': 'Request timed out. Please try again',
    
    // Token errors (CRITICAL - never expose these raw)
    'auth/invalid-api-key': 'Authentication service error. Please contact support',
    'auth/app-deleted': 'Authentication service error. Please contact support',
    'auth/app-not-authorized': 'Authentication service error. Please contact support',
    'auth/argument-error': 'Invalid request. Please try again',
    'auth/invalid-tenant-id': 'Authentication service error. Please contact support',
    'auth/requires-recent-login': 'Please log out and log in again to continue',
    
    // Rate limiting
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    
    // Other errors
    'auth/internal-error': 'An internal error occurred. Please try again',
  };

  // Return sanitized message based on error code
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // For unknown errors, return a generic message
  // NEVER return the raw error message as it might contain sensitive data
  console.error('[Auth Error]', errorCode || 'unknown', firebaseError);
  
  return 'An error occurred during sign-in. Please try again';
}

/**
 * Sanitizes general errors to prevent sensitive data exposure
 */
export function sanitizeError(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred";
  }

  const err = error as Error;
  const message = err.message || String(error);

  // Check for potential sensitive data patterns and replace them
  // This regex matches common patterns for API keys, tokens, etc.
  const sensitivePatterns = [
    /AIza[0-9A-Za-z-_]{35}/g,  // Google API keys
    /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g,  // OAuth client IDs
    /ya29\.[0-9A-Za-z\-_]+/g,  // Google OAuth tokens
    /sk_live_[0-9a-zA-Z]{24,}/g,  // Stripe live keys
    /sk_test_[0-9a-zA-Z]{24,}/g,  // Stripe test keys
    /Bearer [A-Za-z0-9\-._~+\/]+=*/g,  // Bearer tokens
    /[a-zA-Z0-9]{32,}/g,  // Generic long alphanumeric strings (potential tokens)
  ];

  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  // If the message was modified, log the original for debugging (server-side only)
  if (sanitized !== message) {
    console.warn('[Security] Sensitive data detected in error message and redacted');
    console.error('[Original Error]', err);
  }

  return sanitized;
}
