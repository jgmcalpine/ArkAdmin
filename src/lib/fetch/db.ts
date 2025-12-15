import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 1. Read from Environment
const url = process.env.DATABASE_URL;

// 2. Safety Check (Developer Experience)
if (!url) {
  throw new Error(
    "❌ DATABASE_URL is missing from environment variables. Please add it to your .env file."
  );
}

console.log("🔌 Connecting to DB:", url);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}