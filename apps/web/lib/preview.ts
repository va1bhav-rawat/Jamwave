import type { RoomPreview } from '@jamwave/shared';
import { SERVER_INTERNAL_URL } from './env';

/** Server-side lookup of a room's public preview; null when the room is unknown or the server is down. */
export async function fetchRoomPreview(code: string): Promise<RoomPreview | null> {
  try {
    const response = await fetch(`${SERVER_INTERNAL_URL}/api/rooms/${code}/preview`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return null;
    return (await response.json()) as RoomPreview;
  } catch {
    return null;
  }
}
