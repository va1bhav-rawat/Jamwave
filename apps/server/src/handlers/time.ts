import type { AppSocket } from './context';

/** Clock sync: answer immediately with the server time. Deliberately has no validation overhead. */
export function registerTimeHandlers(socket: AppSocket): void {
  socket.on('time:ping', (payload, ack) => {
    if (typeof ack !== 'function') return;
    const t0 = typeof payload?.t0 === 'number' ? payload.t0 : 0;
    ack({ t0, t1: Date.now() });
  });
}
