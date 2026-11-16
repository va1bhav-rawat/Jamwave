import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/jamwave';

const globalForMongo = globalThis as unknown as { __jamwaveMongo?: MongoClient };

/** One client per process; reused across hot reloads in development. */
export const mongoClient =
  globalForMongo.__jamwaveMongo ??
  // Fail a request after a few seconds instead of the driver's default 30 when the database is down.
  new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8_000 });
globalForMongo.__jamwaveMongo = mongoClient;

/**
 * The database named in MONGODB_URI.
 *
 * The auth layer creates the unique indexes on `user.email` and `user.username` itself, so the
 * database (not only the pre-check) guarantees uniqueness when two sign-ups race.
 */
export const db = mongoClient.db();

/**
 * Connect before using `db`. Cheap once connected.
 *
 * The driver can connect implicitly on the first query, but if that first attempt fails (the
 * database was down when the app started) the client stays closed and every later query fails
 * until a restart. An explicit connect() opens a fresh connection instead.
 */
export async function connectDb(): Promise<void> {
  await mongoClient.connect();
}
