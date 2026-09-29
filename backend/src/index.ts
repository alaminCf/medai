import prisma from './utils/prisma';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import casesRoutes from './routes/cases';
import sessionsRoutes from './routes/sessions';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';
import examsRoutes from './routes/exams';
import learningRoutes from './routes/learning';
import notesRoutes from './routes/notes';
import tutorRoutes from './routes/tutor';
import flashcardRoutes from './routes/flashcards';
import mcqRoutes from './routes/mcq';
import vivaRoutes from './routes/viva';
import revisionRoutes from './routes/revision';
import adaptiveRoutes from './routes/adaptive';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware (allowing inline scripts/styles for React build)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));

// Rate limiting for general requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Auth rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many authentication attempts, please try again later.',
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check

// Debug endpoint for deployment verification
app.get('/api/debug', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: 'ok',
      version: 'debug-v1',
      dbUrl: process.env.DATABASE_URL,
      userCount,
      jwtSecretSet: !!process.env.JWT_SECRET
    });
  } catch (e: any) {
    res.status(500).json({
      status: 'error',
      version: 'debug-v1',
      dbUrl: process.env.DATABASE_URL,
      error: e?.message || String(e),
      stack: e?.stack,
      cwd: process.cwd(),
      dirname: __dirname,
      prismaFiles: fs.existsSync(path.join(process.cwd(), 'prisma')) ? fs.readdirSync(path.join(process.cwd(), 'prisma')) : 'not-found',
      backendPrismaFiles: fs.existsSync(path.join(process.cwd(), 'backend/prisma')) ? fs.readdirSync(path.join(process.cwd(), 'backend/prisma')) : 'not-found'
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'techboloy-med-backend', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/mcq', mcqRoutes);
app.use('/api/viva', vivaRoutes);
app.use('/api/revision', revisionRoutes);
app.use('/api/adaptive', adaptiveRoutes);

// Static frontend serving
const possibleStaticDirs = [
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, 'public'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'dist-frontend'),
];

for (const dir of possibleStaticDirs) {
  if (fs.existsSync(dir)) {
    app.use(express.static(dir));
  }
}

// SPA fallback for all non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }

  for (const dir of possibleStaticDirs) {
    const indexPath = path.join(dir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }

  // Also check current directory
  const rootIndex = path.join(process.cwd(), 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }

  next();
});

// 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('Server started on port', PORT);
  });
}

export default app;
