import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';
import { connectDb } from '@/lib/db';

const handlers = toNextJsHandler(auth);

async function withDb(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  try {
    await connectDb();
  } catch (error) {
    console.error('Auth request failed: database unavailable', error);
    return Response.json(
      {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Accounts are temporarily unavailable. Please try again in a moment.',
      },
      { status: 503 },
    );
  }
  return handler(request);
}

export const GET = (request: Request) => withDb(request, handlers.GET);
export const POST = (request: Request) => withDb(request, handlers.POST);
