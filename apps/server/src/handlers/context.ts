import type {
  AckFn,
  ClientToServerEvents,
  ErrorPayload,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@jamwave/shared';
import type { Server, Socket } from 'socket.io';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import type { SlidingWindowLimiter } from '../lib/rateLimit';
import type { MusicProvider } from '../providers/types';
import type { ParticipantRecord, Room } from '../rooms/Room';
import type { RoomManager } from '../rooms/RoomManager';

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface Limiters {
  search: SlidingWindowLimiter;
  chat: SlidingWindowLimiter;
}

export interface HandlerContext {
  io: AppServer;
  manager: RoomManager;
  provider: MusicProvider;
  limiters: Limiters;
  log: Logger;
}

export interface Membership {
  room: Room;
  participant: ParticipantRecord;
}

/** Validate an incoming payload, turning the first zod issue into a client-safe error. */
export function parse<T>(schema: ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('INVALID_PAYLOAD', result.error.issues[0]?.message ?? 'Invalid request');
  }
  return result.data;
}

/** The room and participant this socket currently represents (rejects stale sockets). */
export function requireMembership(ctx: HandlerContext, socket: AppSocket): Membership {
  const { roomCode, participantId } = socket.data;
  if (!roomCode || !participantId) throw new AppError('NOT_IN_ROOM', 'Join a jam first');
  const room = ctx.manager.getRoom(roomCode);
  if (!room) {
    socket.data.roomCode = undefined;
    socket.data.participantId = undefined;
    throw new AppError('ROOM_NOT_FOUND', 'That jam has ended');
  }
  const participant = room.getParticipant(participantId);
  if (!participant || participant.socketId !== socket.id) {
    throw new AppError('NOT_IN_ROOM', 'You are no longer in this jam');
  }
  return { room, participant };
}

export function requireControl({ room, participant }: Membership): void {
  if (!room.canControl(participant.id)) {
    throw new AppError('FORBIDDEN', 'Only the host can control playback in this jam');
  }
}

export function requireHost({ room, participant }: Membership): void {
  if (!room.isHost(participant.id)) throw new AppError('FORBIDDEN', 'Only the host can do that');
}

export function toErrorPayload(error: unknown, log: Logger): ErrorPayload {
  if (error instanceof AppError) return error.toPayload();
  log.error({ err: error }, 'unhandled handler error');
  return { code: 'INTERNAL', message: 'Something went wrong. Please try again.' };
}

/** Run a handler and deliver its result (or error) through the optional ack. */
export async function respond<T>(
  ctx: HandlerContext,
  socket: AppSocket,
  ack: AckFn<T> | undefined,
  fn: () => T | Promise<T>,
): Promise<void> {
  try {
    const data = await fn();
    if (typeof ack === 'function') ack({ ok: true, data });
  } catch (error) {
    const payload = toErrorPayload(error, ctx.log);
    if (typeof ack === 'function') ack({ ok: false, error: payload });
    else socket.emit('server:error', payload);
  }
}

/** For fire-and-forget events: swallow client mistakes, log real failures. */
export function attempt(ctx: HandlerContext, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) {
      ctx.log.debug({ code: error.code }, 'ignored fire-and-forget error');
      return;
    }
    ctx.log.error({ err: error }, 'unhandled fire-and-forget error');
  }
}
