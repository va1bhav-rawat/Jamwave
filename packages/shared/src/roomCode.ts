/** Uppercase letters and digits without the ambiguous 0 / O / 1 / I. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

function randomIndices(count: number, max: number): number[] {
  const out: number[] = [];
  const cryptoObj = (
    globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }
  ).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint32Array(count);
    cryptoObj.getRandomValues(buf);
    for (const n of buf) out.push(n % max);
    return out;
  }
  for (let i = 0; i < count; i++) out.push(Math.floor(Math.random() * max));
  return out;
}

export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  return randomIndices(length, ROOM_CODE_ALPHABET.length)
    .map((i) => ROOM_CODE_ALPHABET[i])
    .join('');
}

/** Uppercases and strips whitespace / dashes so "abc-123" -> "ABC123". */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code);
}
