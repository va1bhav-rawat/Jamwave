/**
 * Outgoing email through Brevo's HTTP API (free tier: 300 a day, any verified sender address, so
 * it works before Jamwave has a domain). Only password resets use it so far.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const EMAIL_FROM = process.env.EMAIL_FROM?.trim();

/** Email goes out only when Brevo is configured; callers decide what to do otherwise. */
export const emailEnabled = Boolean(BREVO_API_KEY && EMAIL_FROM);

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!BREVO_API_KEY || !EMAIL_FROM) {
    throw new Error('Email is not configured: set BREVO_API_KEY and EMAIL_FROM');
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: EMAIL_FROM, name: 'Jamwave' },
      to: [{ email: email.to }],
      subject: email.subject,
      textContent: email.text,
      htmlContent: email.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo answered ${response.status}: ${body.slice(0, 300)}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function passwordResetEmail(to: string, url: string): Email {
  const safeUrl = escapeHtml(url);
  return {
    to,
    subject: 'Reset your Jamwave password',
    text: [
      'Someone asked to reset the password of the Jamwave account for this email address.',
      '',
      `Set a new password here (the link works for one hour): ${url}`,
      '',
      "If that wasn't you, ignore this email. Your password stays as it is.",
    ].join('\n'),
    html: `<p>Someone asked to reset the password of the Jamwave account for this email address.</p>
<p><a href="${safeUrl}">Set a new password</a> — the link works for one hour.</p>
<p>If that wasn't you, ignore this email. Your password stays as it is.</p>
<p style="color:#888;font-size:12px">${safeUrl}</p>`,
  };
}
