import {
  createRoomSchema,
  hostTransferSchema,
  joinRoomSchema,
  roomSettingsSchema,
  type JoinResult,
} from '@jamwave/shared';
import { AppError } from '../lib/errors';
import type { SlidingWindowLimiter } from '../lib/rateLimit';
import type { ParticipantRecord, Room } from '../rooms/Room';
import {
  clientIp,
  parse,
  requireHost,
  requireMembership,
  respond,
  type AppSocket,
  type HandlerContext,
} from './context';

function throttleByIp(
  ctx: HandlerContext,
  limiter: SlidingWindowLimiter,
  socket: AppSocket,
  what: string,
): void {
  const result = limiter.tryAcquire(clientIp(socket, ctx.trustProxyHops));
  if (!result.ok) {
    const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
    throw new AppError('RATE_LIMITED', `Too many ${what} — try again in ${seconds}s`);
  }
}

export function registerRoomHandlers(ctx: HandlerContext, socket: AppSocket): void {
  const leaveCurrent = (): void => {
    const { roomCode, participantId } = socket.data;
    if (roomCode && participantId) {
      socket.leave(roomCode);
      const room = ctx.manager.getRoom(roomCode);
      // Only remove the seat if this socket still owns it (a reclaimed seat belongs to a newer socket).
      if (room?.getParticipant(participantId)?.socketId === socket.id) {
        ctx.manager.leave(roomCode, participantId);
      }
    }
    socket.data.roomCode = undefined;
    socket.data.participantId = undefined;
  };

  const enter = (room: Room, participant: ParticipantRecord): JoinResult => {
    socket.data.roomCode = room.code;
    socket.data.participantId = participant.id;
    socket.join(room.code);
    return {
      snapshot: room.snapshot(),
      self: { participantId: participant.id, secret: participant.secret },
      chat: [...room.chat],
    };
  };

  /** Detach an older socket that still points at this seat (e.g. a tab that was refreshed). */
  const kickStaleSocket = (
    room: Room,
    participant: ParticipantRecord,
    previousSocketId: string | null,
  ) => {
    if (!previousSocketId || previousSocketId === socket.id) return;
    const stale = ctx.io.sockets.sockets.get(previousSocketId);
    if (!stale) return;
    stale.leave(room.code);
    stale.data.roomCode = undefined;
    stale.data.participantId = undefined;
    ctx.log.debug({ code: room.code, participant: participant.id }, 'detached stale socket');
  };

  socket.on('room:create', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const input = parse(createRoomSchema, payload);
      throttleByIp(ctx, ctx.limiters.create, socket, 'new jams');
      leaveCurrent();
      const { room, participant } = ctx.manager.createRoom({
        hostName: input.name,
        roomName: input.roomName,
        socketId: socket.id,
      });
      return enter(room, participant);
    }),
  );

  socket.on('room:join', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const input = parse(joinRoomSchema, payload);
      if (socket.data.roomCode && socket.data.roomCode !== input.code) leaveCurrent();
      if (socket.data.roomCode === input.code && socket.data.participantId) {
        const room = ctx.manager.getRoom(input.code);
        const me = room?.getParticipant(socket.data.participantId);
        if (room && me && me.socketId === socket.id) return enter(room, me);
      }
      const previousSocketId = input.reclaim
        ? (ctx.manager.getRoom(input.code)?.getParticipant(input.reclaim.participantId)?.socketId ??
          null)
        : null;
      // Reclaims (a refresh) are free; fresh seats are limited per address.
      if (!previousSocketId) throttleByIp(ctx, ctx.limiters.join, socket, 'joins');
      const { room, participant, reclaimed } = ctx.manager.join({
        code: input.code,
        name: input.name,
        socketId: socket.id,
        reclaim: input.reclaim,
      });
      if (reclaimed) kickStaleSocket(room, participant, previousSocketId);
      ctx.log.info(
        { code: room.code, participant: participant.name, reclaimed },
        'participant joined',
      );
      return enter(room, participant);
    }),
  );

  socket.on('room:leave', (ack) =>
    respond(ctx, socket, ack, () => {
      leaveCurrent();
      return null;
    }),
  );

  socket.on('room:settings', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireHost(membership);
      const patch = parse(roomSettingsSchema, payload);
      membership.room.updateSettings(patch);
      ctx.manager.commit(membership.room, 'settings');
      return null;
    }),
  );

  socket.on('host:transfer', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireHost(membership);
      const input = parse(hostTransferSchema, payload);
      ctx.manager.transferHost(membership.room, input.participantId);
      return null;
    }),
  );

  socket.on('disconnect', (reason) => {
    const { roomCode, participantId } = socket.data;
    if (!roomCode || !participantId) return;
    const room = ctx.manager.getRoom(roomCode);
    const participant = room?.getParticipant(participantId);
    // A newer socket may already own this seat (reclaim raced the disconnect): leave it alone.
    if (!room || !participant || participant.socketId !== socket.id) return;
    ctx.log.debug({ code: roomCode, participant: participantId, reason }, 'socket disconnected');
    ctx.manager.handleDisconnect(roomCode, participantId);
  });
}
