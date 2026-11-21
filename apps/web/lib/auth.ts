import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins/username';
import { headers } from 'next/headers';
import { connectDb, db } from './db';
import { emailEnabled, passwordResetEmail, sendEmail } from './email';
import { APP_URL } from './env';
import {
  USERNAME_MAX,
  USERNAME_MIN,
  defaultUsernameBase,
  isValidUsername,
  normalizeUsername,
} from './username';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();

/** Google sign-in is offered only when its credentials are configured. */
export const googleEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

const SUFFIX_ATTEMPTS = 8;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Reset links go out by email when Brevo is configured. In development without it the link is
 * printed to the terminal instead. In production without it the option stays undefined, so
 * better-auth answers RESET_PASSWORD_DISABLED and the form points people at the contact address.
 */
const sendResetPassword =
  emailEnabled || !isProduction
    ? async ({ user, url }: { user: { email: string }; url: string }) => {
        if (!emailEnabled) {
          console.log(`[auth] Password reset link for ${user.email}: ${url}`);
          return;
        }
        await sendEmail(passwordResetEmail(user.email, url));
      }
    : undefined;

/**
 * A free username derived from the email: the part before the @, or that plus a few digits
 * when someone else already has it (or it is a reserved name).
 */
async function pickDefaultUsername(email: string): Promise<string> {
  const base = defaultUsernameBase(email);
  const users = db.collection('user');
  const isFree = async (candidate: string) =>
    isValidUsername(candidate) && !(await users.findOne({ username: candidate }));
  if (await isFree(base)) return base;
  const stem = base.slice(0, USERNAME_MAX - 5);
  for (let attempt = 0; attempt < SUFFIX_ATTEMPTS; attempt++) {
    const candidate = `${stem}_${Math.floor(1000 + Math.random() * 9000)}`;
    if (await isFree(candidate)) return candidate;
  }
  return `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export const auth = betterAuth({
  appName: 'Jamwave',
  baseURL: APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword,
    resetPasswordTokenExpiresIn: 60 * 60,
    // A reset usually means the old password may be known to someone else.
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: GOOGLE_CLIENT_ID!,
          clientSecret: GOOGLE_CLIENT_SECRET!,
          prompt: 'select_account',
        },
      }
    : {},
  account: {
    // Emails are not verified yet, so a Google sign-in must not be merged into a password
    // account that merely claims the same address.
    accountLinking: { enabled: false },
  },
  databaseHooks: {
    user: {
      create: {
        // Every account has a username from the start. Choosing one is an optional step after
        // sign-up (/onboarding); until then it is the part of the email before the @.
        before: async (user) => {
          if (typeof user.username === 'string' && user.username) return { data: user };
          return { data: { ...user, username: await pickDefaultUsername(user.email) } };
        },
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: isValidUsername,
      usernameNormalization: normalizeUsername,
      displayUsername: false,
    }),
    // Must stay last: lets server actions and server components set auth cookies.
    nextCookies(),
  ],
});

/**
 * The signed-in session for the current request, or null.
 * If the database cannot be reached the visitor is treated as signed out, so public pages
 * keep rendering.
 */
export async function getServerSession() {
  // Outside the try: this is also how Next.js learns the page depends on the request, and
  // that signal must not be swallowed.
  const requestHeaders = await headers();
  try {
    await connectDb();
    return await auth.api.getSession({ headers: requestHeaders });
  } catch (error) {
    console.error('Could not read the session', error);
    return null;
  }
}
