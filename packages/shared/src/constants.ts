/** Hard limits shared by server validation and client UI. */
export const LIMITS = {
  NICKNAME_MIN: 1,
  NICKNAME_MAX: 24,
  ROOM_NAME_MAX: 40,
  MAX_QUEUE: 200,
  MAX_PARTICIPANTS: 50,
  CHAT_HISTORY: 100,
  CHAT_MAX_LEN: 500,
  HISTORY_MAX: 20,
  SEARCH_MIN: 3,
  SEARCH_MAX: 100,
  SEARCH_RESULTS: 10,
  PLAYLIST_IMPORT_MAX: 50,
  QUEUE_ADD_BATCH_MAX: 50,
} as const;

/** Timing constants for the sync protocol and room lifecycle (milliseconds). */
export const TIMING = {
  RECLAIM_GRACE_MS: 60_000,
  ROOM_EMPTY_TTL_MS: 10 * 60_000,
  CLOCK_SAMPLES: 8,
  CLOCK_INITIAL_BURST: 5,
  CLOCK_BURST_INTERVAL_MS: 250,
  CLOCK_RESAMPLE_MS: 30_000,
  DRIFT_CHECK_MS: 1_000,
  HARD_SEEK_THRESHOLD_MS: 300,
  SEEK_LOOKAHEAD_MS: 150,
  SEEK_JUMP_MS: 1_500,
  SEEK_CONFIRM_MS: 500,
  SYNC_MAX_STRIKES: 3,
  SYNC_MAX_THRESHOLD_MS: 2_400,
  SYNC_COOLDOWN_MS: 5_000,
  SYNC_MAX_COOLDOWN_MS: 20_000,
  SYNC_BUFFERED_COOLDOWN_MS: 2_000,
  SYNC_DECAY_MS: 60_000,
  SYNC_BUFFER_MARGIN_MS: 500,
  SYNC_UNBUFFERED_SEEK_MS: 3_000,
  SYNC_MAX_DRIFT_MS: 5_000,
  SYNC_BACK_BUFFER_MS: 30_000,
  SYNC_SEEK_COST_STRIKE_MS: 250,
  SYNC_MAX_LOOKAHEAD_MS: 1_500,
  LOAD_GRACE_MS: 8_000,
  TRACK_END_SLACK_MS: 400,
} as const;

export const REACTION_EMOJIS = ['🔥', '❤️', '🎉', '😂', '😍', '🕺', '👏', '😭'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** Distinct, dark-background friendly colors assigned to participants. */
export const PARTICIPANT_COLORS = [
  '#f97316',
  '#22c55e',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#eab308',
  '#3b82f6',
  '#14b8a6',
  '#f43f5e',
  '#84cc16',
] as const;
