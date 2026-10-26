'use client';

import { TIMING } from '@jamwave/shared';
import { useEffect } from 'react';
import { clock } from './clock';
import { getSocket } from './jamClient';
import { useRoomStore } from './store';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Keeps the shared server-clock estimate fresh: a quick burst of pings on (re)connect,
 * then one sample every 30 s. Cheap enough to leave running for the whole session.
 */
export function useClockSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    let cancelled = false;

    const ping = () =>
      new Promise<void>((resolve) => {
        const t0 = Date.now();
        socket.timeout(3_000).emit('time:ping', { t0 }, (err, pong) => {
          if (!err && pong && !cancelled) {
            const t2 = Date.now();
            clock.addSample(t0, pong.t1, t2);
            useRoomStore.getState().setSync({ offset: clock.offset, rtt: clock.rtt });
          }
          resolve();
        });
      });

    const burst = async () => {
      for (let i = 0; i < TIMING.CLOCK_INITIAL_BURST && !cancelled; i++) {
        await ping();
        await sleep(TIMING.CLOCK_BURST_INTERVAL_MS);
      }
    };

    const onConnect = () => {
      clock.reset();
      void burst();
    };

    void burst();
    const interval = setInterval(() => void ping(), TIMING.CLOCK_RESAMPLE_MS);
    socket.on('connect', onConnect);
    return () => {
      cancelled = true;
      clearInterval(interval);
      socket.off('connect', onConnect);
    };
  }, [enabled]);
}
