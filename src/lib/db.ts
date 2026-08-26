import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function getAdapter() {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.startsWith('file:')) {
    // Provide a dummy postgres URL for Next.js build step if they haven't set the real one yet
    dbUrl = 'postgresql://postgres:postgres@localhost:5432/dummy';
  }
  
  const pool = new pg.Pool({ connectionString: dbUrl });
  return new PrismaPg(pool);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (typeof window === "undefined") {
  const adapter = getAdapter();
  const config = adapter ? { adapter } : undefined;
  
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient(config);
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient(config);
    }
    prisma = globalForPrisma.prisma;
  }
}

export default prisma!;
