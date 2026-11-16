'use client';

import { useEffect, useState } from 'react';
import { authClient } from './auth-client';
import { normalizeUsername, usernameProblem } from './username';

export type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

interface CheckResult {
  username: string;
  state: 'available' | 'taken' | 'error';
}

const DEBOUNCE_MS = 350;

/** Live "is this username free?" check for a username being typed. */
export function useUsernameAvailability(value: string): UsernameStatus {
  const username = normalizeUsername(value);
  const valid = username.length > 0 && usernameProblem(username) === null;
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      authClient
        .isUsernameAvailable({ username })
        .then(({ data, error }) => {
          if (cancelled) return;
          setResult({ username, state: error ? 'error' : data?.available ? 'available' : 'taken' });
        })
        .catch(() => {
          if (!cancelled) setResult({ username, state: 'error' });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, valid]);

  if (!username) return 'idle';
  if (!valid) return 'invalid';
  if (result?.username !== username) return 'checking';
  return result.state;
}
