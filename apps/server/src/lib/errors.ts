import type { ErrorCode, ErrorPayload } from '@jamwave/shared';

/** An error with a stable code that is safe to send to clients. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toPayload(): ErrorPayload {
    return { code: this.code, message: this.message };
  }
}
