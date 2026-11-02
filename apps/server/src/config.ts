import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/** Load a root .env (if any) without overriding variables already in the environment. */
export function loadDotEnv(cwd: string = process.cwd()): void {
  const candidates = [path.resolve(cwd, '.env'), path.resolve(cwd, '../../.env')];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch {
      // Malformed env files are ignored; explicit env vars still apply.
    }
  }
}

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  YOUTUBE_API_KEY: optionalString,
  ROOM_EMPTY_TTL_MINUTES: z.coerce.number().positive().default(10),
  RECLAIM_GRACE_SECONDS: z.coerce.number().positive().default(60),
  SEARCH_RATE_PER_MINUTE: z.coerce.number().int().positive().default(10),
  SEARCH_DAILY_CAP: z.coerce.number().int().positive().default(95),
  ROOM_CREATE_RATE_PER_MINUTE: z.coerce.number().int().positive().default(5),
  ROOM_JOIN_RATE_PER_MINUTE: z.coerce.number().int().positive().default(30),
  MAX_ROOMS: z.coerce.number().int().positive().default(5_000),
  LOG_LEVEL: z.string().default('info'),
});

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  isProd: boolean;
  port: number;
  corsOrigins: string[];
  youtubeApiKey: string | undefined;
  roomEmptyTtlMs: number;
  reclaimGraceMs: number;
  searchRatePerMinute: number;
  searchDailyCap: number;
  /** Per-IP limits on creating and joining rooms (abuse protection). */
  roomCreateRatePerMinute: number;
  roomJoinRatePerMinute: number;
  maxRooms: number;
  logLevel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    port: e.PORT,
    corsOrigins: e.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    youtubeApiKey: e.YOUTUBE_API_KEY,
    roomEmptyTtlMs: e.ROOM_EMPTY_TTL_MINUTES * 60_000,
    reclaimGraceMs: e.RECLAIM_GRACE_SECONDS * 1_000,
    searchRatePerMinute: e.SEARCH_RATE_PER_MINUTE,
    searchDailyCap: e.SEARCH_DAILY_CAP,
    roomCreateRatePerMinute: e.ROOM_CREATE_RATE_PER_MINUTE,
    roomJoinRatePerMinute: e.ROOM_JOIN_RATE_PER_MINUTE,
    maxRooms: e.MAX_ROOMS,
    logLevel: e.LOG_LEVEL,
  };
}
