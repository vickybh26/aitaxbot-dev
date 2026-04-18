import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, verifyAppCheckToken } from '../firebase.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function authenticateFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional Firebase App Check middleware for PUBLIC endpoints (contact form,
 * rent-receipt email, etc.) where we don't have a user login but still want
 * to prove the request originated from our real web app.
 *
 * The client includes `X-Firebase-AppCheck` on the fetch; we verify it here.
 *
 * Behaviour controls:
 *   APP_CHECK_ENFORCE=true  → reject requests without a valid token (prod)
 *   APP_CHECK_ENFORCE unset → log violations but allow (safe rollout default)
 *
 * Dev mode (NODE_ENV=development) always allows, so local testing is easy.
 */
export async function appCheckGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const token =
    (req.header('X-Firebase-AppCheck') as string | undefined) ||
    (req.header('x-firebase-appcheck') as string | undefined);

  if (!token) {
    if (process.env.APP_CHECK_ENFORCE === 'true') {
      return res.status(401).json({ error: 'App verification required' });
    }
    // Rollout mode: log and allow.
    console.warn('[AppCheck] Missing token on', req.path, '— allowing (enforce off)');
    return next();
  }

  const decoded = await verifyAppCheckToken(token);
  if (!decoded) {
    if (process.env.APP_CHECK_ENFORCE === 'true') {
      return res.status(401).json({ error: 'App verification failed' });
    }
    console.warn('[AppCheck] Invalid token on', req.path, '— allowing (enforce off)');
    return next();
  }

  next();
}
