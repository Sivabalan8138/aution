import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import path from 'path';
import fs from 'fs';

function getAdapter() {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    return new PrismaPg(pool);
  }

  // SQLite Adapter Logic
  let dbPath = dbUrl.replace(/^file:/, '');

  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';

  if (isServerless) {
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath)) {
      const candidates = [
        path.join(/*turbopackIgnore: true*/ process.cwd(), 'dev.db'),
        path.join(/*turbopackIgnore: true*/ process.cwd(), 'prisma', 'dev.db'),
        path.resolve(process.cwd(), dbPath),
      ];

      let copied = false;
      for (const src of candidates) {
        if (fs.existsSync(/*turbopackIgnore: true*/ src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            console.log(`Successfully copied SQLite database from ${src} to ${tmpDbPath}`);
            copied = true;
            break;
          } catch (e) {
            console.error('Failed to copy db to /tmp:', e);
          }
        }
      }

      if (!copied) {
        try {
          fs.writeFileSync(tmpDbPath, '');
        } catch (e) {
          console.error('Could not create fallback tmp db:', e);
        }
      }
    }
    dbPath = tmpDbPath;
  } else if (!path.isAbsolute(dbPath)) {
    dbPath = path.join(/*turbopackIgnore: true*/ process.cwd(), dbPath);
  }

  return new PrismaBetterSqlite3({ url: `file:${dbPath}` });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (typeof window === "undefined") {
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({ adapter: getAdapter() });
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({ adapter: getAdapter() });
    }
    prisma = globalForPrisma.prisma;
  }
}

export default prisma!;
