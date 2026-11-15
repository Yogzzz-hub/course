import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Only run SQLite concurrency pragmas if a file-based SQLite database is configured
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("file:")) {
    client.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`).catch(() => {});
    client.$executeRawUnsafe(`PRAGMA synchronous = NORMAL;`).catch(() => {});
    client.$executeRawUnsafe(`PRAGMA cache_size = 10000;`).catch(() => {});
    client.$executeRawUnsafe(`PRAGMA temp_store = MEMORY;`).catch(() => {});
    client.$queryRawUnsafe(`PRAGMA busy_timeout = 5000;`).catch(() => {});
  }

  return client;
}

export const prisma = globalThis.cachedPrisma ?? createPrismaClient();

// In serverless / Next.js environments, persist the Prisma client globally to avoid connection exhaustion on Supabase
if (!globalThis.cachedPrisma) {
  globalThis.cachedPrisma = prisma;
}
