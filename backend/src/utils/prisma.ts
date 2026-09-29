import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

function getDatabaseUrl(): string {
  const possiblePaths = [
    path.join(__dirname, '../../prisma/dev.db'),
    path.join(__dirname, '../prisma/dev.db'),
    path.join(process.cwd(), 'prisma/dev.db'),
    path.join(process.cwd(), 'backend/prisma/dev.db'),
    path.join(process.cwd(), 'dev.db'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return 'file:' + path.resolve(p);
    }
  }
  return process.env.DATABASE_URL || 'file:./dev.db';
}

const dbUrl = getDatabaseUrl();
console.log('🔗 Prisma SQLite Database URL resolved to:', dbUrl);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
