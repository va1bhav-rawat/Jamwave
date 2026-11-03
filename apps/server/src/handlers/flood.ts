import type { ErrorPayload } from '@jamwave/shared';
import type { AppSocket, HandlerContext } from './context';

const RATE_LIMITED: ErrorPayload = { code: 'RATE_LIMITED', message: 'Slow down a little' };

/**
 * Per-socket flood guard. Runs as socket middleware so it sits in front of every handler
 * (including ones added later) and costs nothing but a map lookup before any parsing happens.
 * Over the limit, an event is answered with RATE_LIMITED through its ack (or `server:error`)
 * and never reaches a handler; a surplus `time:ping` is simply dropped.
 */
export function registerFloodGuard(ctx: HandlerContext, socket: AppSocket): void {
  socket.use(([event, ...args], next) => {
    const isPing = event === 'time:ping';
    const limiter = isPing ? ctx.limiters.ping : ctx.limiters.flood;
    if (limiter.tryAcquire(socket.id).ok) {
      next();
      return;
    }
    if (isPing) return;
    ctx.log.warn({ socket: socket.id, event }, 'socket flood limit hit');
    const ack = args[args.length - 1];
    if (typeof ack === 'function') ack({ ok: false, error: RATE_LIMITED });
    else socket.emit('server:error', RATE_LIMITED);
  });
  socket.on('disconnect', () => {
    ctx.limiters.flood.forget(socket.id);
    ctx.limiters.ping.forget(socket.id);
  });
}
