import "server-only";
import mongoose from "mongoose";
import { getMongoUri } from "@/lib/env";
import { Order, Product, User } from "@/models";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Cached on `globalThis` so hot reloads in development and parallel route handlers
// share one connection pool instead of opening a new one each time.
const globalForMongoose = globalThis as typeof globalThis & {
  __thefitMongoose?: MongooseCache;
};
const cache: MongooseCache = (globalForMongoose.__thefitMongoose ??= {
  conn: null,
  promise: null,
});

/** Creates the indexes declared on the schemas (unique email / slug / order number, ...). */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([User.createIndexes(), Product.createIndexes(), Order.createIndexes()]);
}

/** Connects to MongoDB once per process and returns the shared mongoose instance. */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose
    .connect(getMongoUri(), { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 })
    .then(async (instance) => {
      await ensureIndexes();
      return instance;
    });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}

/** Closes the shared connection (used by scripts and tests so the process can exit). */
export async function disconnectDB(): Promise<void> {
  cache.conn = null;
  cache.promise = null;
  await mongoose.disconnect();
}
