'use client';

import { useEffect } from 'react';
import { identify } from '@/lib/analytics';
import { authClient } from '@/lib/auth-client';

/**
 * Ties analytics to the account id while signed in, so sign-ups and returns can be counted.
 * Sign-out and account deletion call `resetIdentity` themselves.
 */
export function AnalyticsIdentity() {
  const { data } = authClient.useSession();
  const userId = data?.user.id;
  useEffect(() => {
    if (userId) identify(userId);
  }, [userId]);
  return null;
}
