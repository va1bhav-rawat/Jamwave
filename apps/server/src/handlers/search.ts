import { searchQuerySchema, searchResolveSchema } from '@jamwave/shared';
import { AppError } from '../lib/errors';
import {
  parse,
  requireMembership,
  respond,
  type AppSocket,
  type HandlerContext,
  type Membership,
} from './context';

function throttle(ctx: HandlerContext, { participant }: Membership): void {
  const result = ctx.limiters.search.tryAcquire(participant.id);
  if (!result.ok) {
    const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
    throw new AppError('RATE_LIMITED', `Too many searches — try again in ${seconds}s`);
  }
}

export function registerSearchHandlers(ctx: HandlerContext, socket: AppSocket): void {
  socket.on('search:query', (payload, ack) =>
    respond(ctx, socket, ack, async () => {
      const membership = requireMembership(ctx, socket);
      const input = parse(searchQuerySchema, payload);
      // Pasted links go straight to resolution so they never spend search quota.
      if (ctx.provider.canHandleUrl(input.q)) return ctx.provider.resolveUrl(input.q);
      throttle(ctx, membership);
      return ctx.provider.search(input.q);
    }),
  );

  socket.on('search:resolve', (payload, ack) =>
    respond(ctx, socket, ack, async () => {
      const membership = requireMembership(ctx, socket);
      const input = parse(searchResolveSchema, payload);
      throttle(ctx, membership);
      if (!ctx.provider.canHandleUrl(input.url)) {
        throw new AppError('UNSUPPORTED_URL', 'Only YouTube links are supported right now');
      }
      return ctx.provider.resolveUrl(input.url);
    }),
  );
}
