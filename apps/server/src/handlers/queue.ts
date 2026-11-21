import { queueAddSchema, queueRemoveSchema, queueReorderSchema } from '@jamwave/shared';
import { AppError } from '../lib/errors';
import {
  parse,
  requireAdd,
  requireControl,
  requireMembership,
  respond,
  type AppSocket,
  type HandlerContext,
} from './context';

export function registerQueueHandlers(ctx: HandlerContext, socket: AppSocket): void {
  socket.on('queue:add', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      const input = parse(queueAddSchema, payload);
      // Anyone may add unless the host locked the queue; jumping the queue is always control.
      requireAdd(membership);
      if (input.playNext) requireControl(membership);
      const { room, participant } = membership;
      const { added } = room.addTracks(
        input.items,
        { id: participant.id, name: participant.name },
        input.playNext ?? false,
      );
      ctx.manager.recordTracksAdded(added.length);
      ctx.manager.commit(room, 'queue');
      return { added: added.length };
    }),
  );

  socket.on('queue:remove', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      const input = parse(queueRemoveSchema, payload);
      const track = membership.room.findQueued(input.trackId);
      if (!track) throw new AppError('TRACK_NOT_FOUND', 'That track is no longer in the queue');
      // Anyone may remove their own addition; otherwise you need control.
      if (track.addedBy.id !== membership.participant.id) requireControl(membership);
      membership.room.removeTrack(input.trackId);
      ctx.manager.commit(membership.room, 'queue');
      return null;
    }),
  );

  socket.on('queue:reorder', (payload, ack) =>
    respond(ctx, socket, ack, () => {
      const membership = requireMembership(ctx, socket);
      requireControl(membership);
      const input = parse(queueReorderSchema, payload);
      membership.room.reorderTrack(input.trackId, input.toIndex);
      ctx.manager.commit(membership.room, 'queue');
      return null;
    }),
  );
}
