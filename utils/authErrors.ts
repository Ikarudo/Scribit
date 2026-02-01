/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Firebase errors: https://firebase.google.com/docs/auth/admin/errors
 */
function extractErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const err = error as { code?: string; message?: string };
  if (err.code) return String(err.code);
  // Fallback: extract auth/xxx from "Firebase: Error (auth/invalid-credential)."
  const match = String(err.message || '').match(/auth\/[a-z-]+/i);
  return match ? match[0] : '';
}

export function getAuthErrorMessage(error: unknown, context: 'login' | 'signup' = 'login'): string {
  const code = extractErrorCode(error);
  const fallback = context === 'login'
    ? 'Sign in failed. Please check your email and password and try again.'
    : 'Sign up failed. Please check your details and try again.';

  switch (code) {
    // Sign in errors
    case 'auth/user-not-found':
      return 'No account found with this email. Please check the address or sign up for a new account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';

    // Sign up errors
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-up is not enabled. Please contact support.';

    default:
      return fallback;
  }
}
