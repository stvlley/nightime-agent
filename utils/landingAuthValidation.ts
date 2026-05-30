import type {
  LandingAuthMode,
  LandingSignupErrors,
  LandingSignupForm,
  LandingSignupRole,
} from '../components/landing/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateLandingAuthForm(
  form: LandingSignupForm,
  role: LandingSignupRole,
  mode: LandingAuthMode
): LandingSignupErrors {
  const errors: LandingSignupErrors = {};

  if (mode === 'signup' && !form.displayName.trim()) {
    errors.displayName = role === 'provider' ? 'Business or display name is required.' : 'A name or handle is required.';
  }

  const email = form.email.trim();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (mode === 'login' || role === 'provider') {
    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (mode === 'signup' && form.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
  }

  return errors;
}
