/**
 * View model for the Login surface, ported from Login.dc.html's renderVals().
 * Kept as plain data + pure functions so a real authentication API can be
 * substituted by passing an `authenticate` prop into <Login> without
 * touching the component itself.
 */

export const DEFAULT_HEADING = 'Sign in to GitLab M3';

export const BRAND_CONTENT = Object.freeze({
  mark: 'G',
  title: 'GitLab M3',
  tagline:
    'One DevSecOps platform, redesigned in Material 3. Plan, code, build, secure, deploy — with agent memory built in.',
});

export const AUTH_PROVIDERS = Object.freeze([
  { id: 'sso', icon: 'key', label: 'SSO', href: '/users/auth/saml' },
  { id: 'ldap', icon: 'badge', label: 'LDAP', href: '/users/auth/ldapmain' },
]);

export const DEFAULT_LINKS = Object.freeze({
  forgotPassword: '/users/password/new',
  register: '/users/sign_up',
  continueTo: '/dashboard/issues',
});

export function createInitialState(overrides = {}) {
  return {
    username: '',
    password: '',
    revealPassword: false,
    remember: true,
    error: null,
    signedIn: false,
    submitting: false,
    ...overrides,
  };
}

/** Pure validation, ported verbatim from the design's doSignIn() guard clause. */
export function validateCredentials({ username, password }) {
  if (!username || !username.trim() || !password) {
    return { ok: false, error: 'Enter a username and password.' };
  }
  return { ok: true, error: null };
}

/**
 * Default local authenticator. Mirrors the design's mock doSignIn(), which
 * only validates presence and never contacts a server. Replace it for real
 * use by passing an `authenticate` prop returning
 * `Promise<{ ok, error, redirectTo? }>` — a truthy `redirectTo` sends the
 * browser onward immediately instead of showing the inline success banner.
 */
export async function authenticate({ username, password }) {
  const validation = validateCredentials({ username, password });
  if (!validation.ok) return validation;
  return { ok: true, error: null, redirectTo: null };
}
