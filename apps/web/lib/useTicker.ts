'use client';

import { useEffect, useState } from 'react';

/** Re-render on an interval while `active` (used for the progress bar). */
export function useTicker(active: boolean, intervalMs = 250): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(interval);
  }, [active, intervalMs]);
  return tick;
}
