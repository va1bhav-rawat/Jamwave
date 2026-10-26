import { chatSendSchema, reactionSendSchema } from '@jamwave/shared';
import { AppError } from '../lib/errors';
import { newId } from '../lib/ids';
import {
  attempt,
  parse,
  requireMembership,
  respond,
  type AppSocket,
  type HandlerContext,
  type Membership,
} from './context';

function throttle(ctx: HandlerContext, { participant }: Membership): void {
  const result = ctx.limiters.chat.tryAcquire(participant.id);
  if (!result.ok) throw new AppError('RATE_LIMITED', 'Slow down a little');
}

export function registerChatHandlers(ctx: HandlerContext, socket: AppSocket): void {
  socket.on('chat:send', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      throttle(ctx, membership);
      const input = parse(chatSendSchema, payload);
      const { room, participant } = membership;
      const message = room.addChat({
        kind: 'user',
        participantId: participant.id,
        name: participant.name,
        color: participant.color,
        text: input.text,
      });
      ctx.io.to(room.code).emit('chat:message', message);
      return null;
    }),
  );

  socket.on('reaction:send', (payload) =>
    attempt(ctx, () => {
      const membership = requireMembership(ctx, socket);
      throttle(ctx, membership);
      const input = parse(reactionSendSchema, payload);
      ctx.io.to(membership.room.code).emit('reaction', {
        id: newId(),
        participantId: membership.participant.id,
        emoji: input.emoji,
        sentAt: Date.now(),
      });
    }),
  );
}
