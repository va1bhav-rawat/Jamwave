import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Forgot your password?</h1>
      <p className="mb-6 mt-1 text-fg-muted">
        Enter the email address of your account and we&apos;ll send you a link to set a new one.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
