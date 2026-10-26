import { describe, expect, it } from 'vitest';
import {
  ROOM_CODE_ALPHABET,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '../roomCode';

describe('roomCode', () => {
  it('generates valid 6-char codes from the alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(isValidRoomCode(code)).toBe(true);
      for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch);
    }
  });

  it('normalizes user input', () => {
    expect(normalizeRoomCode(' abc-123 ')).toBe('ABC123');
    expect(normalizeRoomCode('a b c 2 3 4')).toBe('ABC234');
  });

  it('rejects ambiguous characters and wrong lengths', () => {
    expect(isValidRoomCode('ABC10O')).toBe(false);
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('ABCDEFG')).toBe(false);
    expect(isValidRoomCode('ABCDEF')).toBe(true);
  });
});
