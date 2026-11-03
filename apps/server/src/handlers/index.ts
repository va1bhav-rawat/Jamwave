import { registerChatHandlers } from './chat';
import type { AppSocket, HandlerContext } from './context';
import { registerFloodGuard } from './flood';
import { registerPlaybackHandlers } from './playback';
import { registerQueueHandlers } from './queue';
import { registerRoomHandlers } from './room';
import { registerSearchHandlers } from './search';
import { registerTimeHandlers } from './time';

export type { AppServer, AppSocket, HandlerContext, Limiters } from './context';

export function registerSocketHandlers(ctx: HandlerContext, socket: AppSocket): void {
  ctx.log.debug({ socket: socket.id }, 'socket connected');
  registerFloodGuard(ctx, socket);
  registerTimeHandlers(socket);
  registerRoomHandlers(ctx, socket);
  registerQueueHandlers(ctx, socket);
  registerPlaybackHandlers(ctx, socket);
  registerChatHandlers(ctx, socket);
  registerSearchHandlers(ctx, socket);
}
