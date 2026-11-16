/** Username rules shared by the sign-up forms and the auth server. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/** Names that would be confusing or collide with routes. */
const RESERVED = new Set([
  'admin',
  'administrator',
  'api',
  'help',
  'jam',
  'jamwave',
  'join',
  'login',
  'me',
  'moderator',
  'onboarding',
  'privacy',
  'root',
  'settings',
  'signup',
  'support',
  'system',
  'terms',
]);

/** Usernames are case-insensitive: they are stored and compared in lower case. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Why a username is not acceptable, or null when it is fine. */
export function usernameProblem(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters`;
  if (username.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters`;
  if (!USERNAME_PATTERN.test(username)) return 'Only letters, numbers and underscores';
  if (RESERVED.has(username)) return 'That username is reserved';
  return null;
}

export function isValidUsername(value: string): boolean {
  return usernameProblem(value) === null;
}

/**
 * The username an account gets when its owner does not choose one: the part of the email
 * before the @, cleaned up to fit the username rules. Not checked for availability.
 */
export function defaultUsernameBase(email: string): string {
  const base = (email.split('@')[0] ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, USERNAME_MAX);
  return base.length >= USERNAME_MIN ? base : `${base || 'user'}_jam`.slice(0, USERNAME_MAX);
}

/** A same-site path to return to after signing in; anything else falls back to the home page. */
export function safeNextPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
  return path;
}
