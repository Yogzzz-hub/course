import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Enable WAL mode & SQLite concurrency speed boosts
  client.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`).catch(() => {});
  client.$executeRawUnsafe(`PRAGMA synchronous = NORMAL;`).catch(() => {});
  client.$executeRawUnsafe(`PRAGMA cache_size = 10000;`).catch(() => {});
  client.$executeRawUnsafe(`PRAGMA temp_store = MEMORY;`).catch(() => {});
  client.$queryRawUnsafe(`PRAGMA busy_timeout = 5000;`).catch(() => {});

  return client;
}

export const prisma = globalThis.cachedPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.cachedPrisma = prisma;
}
