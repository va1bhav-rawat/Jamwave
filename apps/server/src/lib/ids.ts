import { randomBytes, randomUUID } from 'node:crypto';

export function newId(): string {
  return randomUUID();
}

/** Opaque per-participant secret used to reclaim a seat after a reconnect. */
export function newSecret(): string {
  return randomBytes(18).toString('base64url');
}
