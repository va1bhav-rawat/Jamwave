import type { SearchResult, Track } from '@jamwave/shared';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** 213000 -> "3:33"; 3723000 -> "1:02:03"; 0 / unknown -> "–:––". */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0 || !Number.isFinite(ms)) return '–:––';
  return formatSeconds(Math.floor(ms / 1000));
}

/** Like formatDuration but 0 renders as "0:00" (used for the live position). */
export function formatPosition(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  return formatSeconds(Math.floor(safe / 1000));
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Strip queue bookkeeping so a track can be queued again (in this or another jam). */
export function trackToSearchResult(track: Track): SearchResult {
  const { provider, providerId, title, artist, thumbnailUrl, durationMs } = track;
  return { provider, providerId, title, artist, thumbnailUrl, durationMs };
}

/** "just now", "5 min ago", "3 h ago", "yesterday". */
export function timeAgo(ms: number, now: number = Date.now()): string {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return 'yesterday';
}

export function looksLikeUrl(input: string): boolean {
  const s = input.trim();
  return /^https?:\/\//i.test(s) || /youtu\.?be/i.test(s) || /^[A-Za-z0-9_-]{11}$/.test(s);
}
