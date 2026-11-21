import { z } from 'zod';
import { LIMITS, REACTION_EMOJIS } from './constants';
import { ROOM_CODE_REGEX } from './roomCode';

export const nicknameSchema = z
  .string()
  .trim()
  .min(LIMITS.NICKNAME_MIN, 'Pick a nickname')
  .max(LIMITS.NICKNAME_MAX, `Nickname must be ${LIMITS.NICKNAME_MAX} characters or fewer`);

export const roomNameSchema = z.string().trim().max(LIMITS.ROOM_NAME_MAX);

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ROOM_CODE_REGEX, 'Room codes are 6 letters or digits');

export const reclaimSchema = z.object({
  participantId: z.string().min(1).max(64),
  secret: z.string().min(1).max(128),
});

export const createRoomSchema = z.object({
  name: nicknameSchema,
  roomName: roomNameSchema.optional(),
});

export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  name: nicknameSchema,
  reclaim: reclaimSchema.optional(),
});

export const searchResultSchema = z.object({
  provider: z.literal('youtube'),
  providerId: z.string().min(1).max(64),
  title: z.string().max(300),
  artist: z.string().max(200),
  thumbnailUrl: z.string().max(500),
  durationMs: z.number().int().nonnegative(),
});

export const queueAddSchema = z.object({
  items: z.array(searchResultSchema).min(1).max(LIMITS.QUEUE_ADD_BATCH_MAX),
  /** Insert at the front of the queue ("play next"). */
  playNext: z.boolean().optional(),
});

export const queueRemoveSchema = z.object({ trackId: z.string().min(1) });

export const queueReorderSchema = z.object({
  trackId: z.string().min(1),
  toIndex: z.number().int().min(0),
});

export const playbackPlaySchema = z.object({
  /** Jump straight to this queued track; omit to resume / start the next one. */
  trackId: z.string().min(1).optional(),
});

export const playbackSeekSchema = z.object({ positionMs: z.number().int().min(0) });

export const trackEndedSchema = z.object({ trackId: z.string().min(1) });

export const trackErrorSchema = z.object({
  trackId: z.string().min(1),
  code: z.number().int().optional(),
});

/** Plausible track lengths only: one second to one day. */
export const trackDurationSchema = z.object({
  trackId: z.string().min(1),
  durationMs: z
    .number()
    .int()
    .min(1_000)
    .max(24 * 60 * 60_000),
});

export const chatSendSchema = z.object({
  text: z.string().trim().min(1).max(LIMITS.CHAT_MAX_LEN),
});

export const reactionSendSchema = z.object({ emoji: z.enum(REACTION_EMOJIS) });

export const roomSettingsSchema = z.object({
  name: roomNameSchema.optional(),
  everyoneControls: z.boolean().optional(),
  anyoneCanAdd: z.boolean().optional(),
  voteSkipEnabled: z.boolean().optional(),
});

export const hostTransferSchema = z.object({ participantId: z.string().min(1) });

export const participantControlSchema = z.object({
  participantId: z.string().min(1).max(64),
  canControl: z.boolean(),
});

export const participantRemoveSchema = z.object({ participantId: z.string().min(1).max(64) });

export const timePingSchema = z.object({ t0: z.number() });

export const searchQuerySchema = z.object({
  q: z.string().trim().min(LIMITS.SEARCH_MIN).max(LIMITS.SEARCH_MAX),
});

export const searchResolveSchema = z.object({
  url: z.string().trim().min(5).max(500),
});

export type CreateRoomPayload = z.infer<typeof createRoomSchema>;
export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;
export type ReclaimPayload = z.infer<typeof reclaimSchema>;
export type QueueAddPayload = z.infer<typeof queueAddSchema>;
export type QueueRemovePayload = z.infer<typeof queueRemoveSchema>;
export type QueueReorderPayload = z.infer<typeof queueReorderSchema>;
export type PlaybackPlayPayload = z.infer<typeof playbackPlaySchema>;
export type PlaybackSeekPayload = z.infer<typeof playbackSeekSchema>;
export type TrackEndedPayload = z.infer<typeof trackEndedSchema>;
export type TrackErrorPayload = z.infer<typeof trackErrorSchema>;
export type TrackDurationPayload = z.infer<typeof trackDurationSchema>;
export type ChatSendPayload = z.infer<typeof chatSendSchema>;
export type ReactionSendPayload = z.infer<typeof reactionSendSchema>;
export type RoomSettingsPayload = z.infer<typeof roomSettingsSchema>;
export type HostTransferPayload = z.infer<typeof hostTransferSchema>;
export type ParticipantControlPayload = z.infer<typeof participantControlSchema>;
export type ParticipantRemovePayload = z.infer<typeof participantRemoveSchema>;
export type TimePingPayload = z.infer<typeof timePingSchema>;
export type SearchQueryPayload = z.infer<typeof searchQuerySchema>;
export type SearchResolvePayload = z.infer<typeof searchResolveSchema>;
