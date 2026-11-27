'use client';

import { usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { CONTACT_EMAIL } from './env';

/** Browser-side auth client; talks to /api/auth on this origin. */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

interface AuthError {
  code?: string;
  message?: string;
  status?: number;
}

const MESSAGES: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN: 'That username is already taken',
  USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER: 'That username is already taken',
  INVALID_USERNAME: 'Usernames can only use letters, numbers and underscores',
  USERNAME_TOO_SHORT: 'That username is too short',
  USERNAME_TOO_LONG: 'That username is too long',
  USER_ALREADY_EXISTS: 'An account with this email already exists',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists',
  // Two sign-ups raced for the same email or default username and the database rejected one.
  FAILED_TO_CREATE_USER: 'Could not create the account. Please try again.',
  INVALID_EMAIL: 'Enter a valid email address',
  PASSWORD_TOO_SHORT: 'Use at least 8 characters for your password',
  PASSWORD_TOO_LONG: 'That password is too long',
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password',
  INVALID_USERNAME_OR_PASSWORD: 'Wrong username or password',
  // Password reset
  INVALID_TOKEN: 'This link has expired or was already used. Request a new one.',
  USER_NOT_FOUND: 'This link has expired or was already used. Request a new one.',
  RESET_PASSWORD_DISABLED: `Password reset isn't set up yet. Email ${CONTACT_EMAIL} and we'll sort it out.`,
  // Account deletion
  INVALID_PASSWORD: 'Wrong password',
  SESSION_EXPIRED: 'For safety, sign out, sign in again and then try once more.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'This account has no password. Sign out, sign in again and then try once more.',
};

/** A message fit for showing to the person, from an auth client error. */
export function authErrorMessage(
  error: AuthError | null | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error) return fallback;
  if (error.status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;
  return error.message || fallback;
}

/** The account username of the signed-in person ('' when signed out or still loading). */
export function useAccountName(): string {
  const { data } = authClient.useSession();
  return data?.user.username ?? '';
}
