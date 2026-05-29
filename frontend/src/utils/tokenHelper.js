/**
 * Decode JWT payload without verification (client-side only).
 * Returns null if token is invalid/malformed.
 */
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is still valid (not expired).
 * Returns true if token exists and exp is in the future.
 */
export function isTokenValid(token) {
  if (!token) return false;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;
  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 > Date.now();
}
