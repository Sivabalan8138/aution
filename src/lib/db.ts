import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function getAdapter() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    return new PrismaPg(pool);
  }
  
  return undefined;
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
