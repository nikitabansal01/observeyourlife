import { getAuth } from '@clerk/express';
import { isClerkEnabled } from './clerk.js';

function userFromAuth(auth) {
  if (!auth?.userId) return null;

  const email = auth.sessionClaims?.email
    || auth.sessionClaims?.primary_email_address
    || auth.sessionClaims?.email_address
    || '';

  return { id: auth.userId, email };
}

export function optionalAuth(req, _res, next) {
  if (!isClerkEnabled()) {
    req.user = null;
    return next();
  }
  req.user = userFromAuth(getAuth(req));
  next();
}

export function requireAuth(req, res, next) {
  if (!isClerkEnabled()) {
    return res.status(503).json({ error: 'Sign-in is not configured on this server' });
  }
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  req.user = userFromAuth(auth);
  next();
}
