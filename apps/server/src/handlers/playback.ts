import {
  playbackPlaySchema,
  playbackSeekSchema,
  trackEndedSchema,
  trackErrorSchema,
} from '@jamwave/shared';
import { AppError } from '../lib/errors';
import {
  attempt,
  parse,
  requireControl,
  requireMembership,
  respond,
  type AppSocket,
  type HandlerContext,
  type Membership,
} from './context';

/** Track-end / error reports are trusted from the host, or from anyone while the host is away. */
function isTrustedReporter({ room, participant }: Membership): boolean {
  if (room.isHost(participant.id)) return true;
  const host = room.getParticipant(room.hostId);
  return !host || !host.connected;
}

export function registerPlaybackHandlers(ctx: HandlerContext, socket: AppSocket): void {
  socket.on('playback:play', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireControl(membership);
      const input = parse(playbackPlaySchema, payload ?? {});
      membership.room.play(input.trackId);
      ctx.manager.commit(membership.room, 'playback');
      return null;
    }),
  );

  socket.on('playback:pause', (ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireControl(membership);
      membership.room.pause();
      ctx.manager.commit(membership.room, 'playback');
      return null;
    }),
  );

  socket.on('playback:seek', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireControl(membership);
      const input = parse(playbackSeekSchema, payload);
      membership.room.seek(input.positionMs);
      ctx.manager.commit(membership.room, 'playback');
      return null;
    }),
  );

  socket.on('playback:skip', (ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireControl(membership);
      membership.room.skip();
      ctx.manager.commit(membership.room, 'playback');
      return null;
    }),
  );

  socket.on('vote:skip', (ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      const { room, participant } = membership;
      if (!room.settings.voteSkipEnabled) {
        throw new AppError('FORBIDDEN', 'Vote to skip is turned off in this jam');
      }
      const title = room.playback.track?.title;
      const result = room.voteSkip(participant.id);
      if (result.skipped && title) ctx.manager.system(room, `Skipped "${title}" by vote`);
      ctx.manager.commit(room, 'vote');
      return result;
    }),
  );

  socket.on('track:ended', (payload) =>
    attempt(ctx, () => {
      const membership = requireMembership(ctx, socket);
      if (!isTrustedReporter(membership)) return;
      const input = parse(trackEndedSchema, payload);
      if (membership.room.onTrackEnded(input.trackId)) {
        ctx.manager.commit(membership.room, 'track-ended');
      }
    }),
  );

  socket.on('track:error', (payload) =>
    attempt(ctx, () => {
      const membership = requireMembership(ctx, socket);
      if (!isTrustedReporter(membership)) return;
      const input = parse(trackErrorSchema, payload);
      const { room } = membership;
      const current = room.playback.track;
      if (!current || current.id !== input.trackId) return;
      room.advance();
      ctx.manager.system(room, `Skipped "${current.title}" — that video can't be played here`);
      ctx.manager.commit(room, 'track-ended');
    }),
  );
}
