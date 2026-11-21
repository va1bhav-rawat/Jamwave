import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import type { Config } from './config';
import { registerSocketHandlers, type AppServer } from './handlers';
import { resolveClientIp } from './handlers/context';
import { createRequestHandler } from './http';
import type { Logger } from './lib/logger';
import { SlidingWindowLimiter } from './lib/rateLimit';
import type { MusicProvider } from './providers/types';
import { YouTubeProvider } from './providers/youtube';
import { RoomManager } from './rooms/RoomManager';

export interface AppOptions {
  config: Config;
  logger: Logger;
  /** Override the catalogue (tests inject a fake). */
  provider?: MusicProvider;
}

export interface App {
  httpServer: HttpServer;
  io: AppServer;
  manager: RoomManager;
  provider: MusicProvider;
  /** Start listening; resolves with the bound port (pass 0 for a random one). */
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
}

/** Wire the HTTP server, Socket.IO, the room manager and the catalogue together. */
export function createApp({ config, logger, provider: providerOverride }: AppOptions): App {
  const startedAt = Date.now();
  if (!config.jamTokenSecret) {
    logger.warn('JAM_TOKEN_SECRET is not set: jams know nobody by account and /api/presence is off');
  }
  const provider: MusicProvider =
    providerOverride ??
    new YouTubeProvider({
      apiKey: config.youtubeApiKey,
      dailySearchCap: config.searchDailyCap,
      logger,
    });

  // The manager's callbacks close over `io`, which is created right after the HTTP server below.
  const manager = new RoomManager({
    emptyTtlMs: config.roomEmptyTtlMs,
    reclaimGraceMs: config.reclaimGraceMs,
    maxRooms: config.maxRooms,
    logger,
    onRoomChanged: (room) => {
      io.to(room.code).emit('room:state', room.snapshot());
    },
    onSystemMessage: (room, message) => {
      io.to(room.code).emit('chat:message', message);
    },
    onRoomClosed: (room, reason) => {
      io.to(room.code).emit('room:closed', { reason });
      const members = io.sockets.adapter.rooms.get(room.code);
      if (!members) return;
      for (const socketId of members) {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) continue;
        socket.data.roomCode = undefined;
        socket.data.participantId = undefined;
        socket.leave(room.code);
      }
    },
  });

  const httpServer = createServer(
    createRequestHandler({
      manager,
      provider,
      corsOrigins: config.corsOrigins,
      jamTokenSecret: config.jamTokenSecret,
      startedAt,
    }),
  );

  const io: AppServer = new Server(httpServer, {
    cors: { origin: config.corsOrigins, methods: ['GET', 'POST'] },
    serveClient: false,
    pingInterval: 10_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 64 * 1024,
  });

  const limiters = {
    search: new SlidingWindowLimiter(config.searchRatePerMinute, 60_000),
    chat: new SlidingWindowLimiter(20, 5_000),
    // Keyed by client IP: a script must not be able to fill memory with rooms or seats.
    create: new SlidingWindowLimiter(config.roomCreateRatePerMinute, 60_000),
    join: new SlidingWindowLimiter(config.roomJoinRatePerMinute, 60_000),
    flood: new SlidingWindowLimiter(60, 10_000),
    ping: new SlidingWindowLimiter(20, 10_000),
  };

  // Connections per client address: a script opening thousands of sockets is refused at the
  // handshake, before it costs a room, a seat or a limiter entry.
  const connectionsByIp = new Map<string, number>();
  io.use((socket, next) => {
    const ip = resolveClientIp(
      socket.handshake.headers['x-forwarded-for'],
      socket.handshake.address,
      config.trustProxyHops,
    );
    const current = connectionsByIp.get(ip) ?? 0;
    if (current >= config.maxConnectionsPerIp) {
      logger.warn({ ip, connections: current }, 'connection limit per address reached');
      next(new Error('TOO_MANY_CONNECTIONS'));
      return;
    }
    connectionsByIp.set(ip, current + 1);
    socket.once('disconnect', () => {
      const remaining = (connectionsByIp.get(ip) ?? 1) - 1;
      if (remaining <= 0) connectionsByIp.delete(ip);
      else connectionsByIp.set(ip, remaining);
    });
    next();
  });

  io.on('connection', (socket) => {
    registerSocketHandlers(
      {
        io,
        manager,
        provider,
        limiters,
        trustProxyHops: config.trustProxyHops,
        jamTokenSecret: config.jamTokenSecret,
        log: logger,
      },
      socket,
    );
  });

  const pruneTimer = setInterval(() => {
    for (const limiter of Object.values(limiters)) limiter.prune();
  }, 5 * 60_000);
  pruneTimer.unref();

  return {
    httpServer,
    io,
    manager,
    provider,
    listen(port = config.port) {
      return new Promise<number>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, () => {
          httpServer.off('error', reject);
          manager.startSweeper();
          const address = httpServer.address() as AddressInfo | null;
          resolve(address?.port ?? port);
        });
      });
    },
    async close() {
      clearInterval(pruneTimer);
      // Rooms live in memory: tell everyone the jam is closing so their browser can offer to
      // rebuild it, and give the transport a moment to flush before the sockets are dropped.
      const closed = manager.closeAll('server_restart');
      if (closed > 0) {
        logger.info({ rooms: closed }, 'closed rooms for restart');
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      manager.dispose();
      await new Promise<void>((resolve) => {
        io.close(() => {
          httpServer.close(() => resolve());
        });
      });
    },
  };
}
