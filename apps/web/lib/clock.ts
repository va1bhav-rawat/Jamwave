import { ClockSync } from '@jamwave/shared';

/** Single estimator of the server clock shared by every component in the tab. */
export const clock = new ClockSync();

export function serverNow(): number {
  return clock.now();
}
