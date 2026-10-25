import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.ts';
import { attachUser } from './server/middleware.ts';
import { authRouter } from './server/routes/auth.routes.ts';
import { surveyRouter } from './server/routes/survey.routes.ts';
import { responseRouter } from './server/routes/response.routes.ts';
import { adminRouter } from './server/routes/admin.routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Trust reverse proxy for correct client IP detection in rate limiting and logs
  app.set('trust proxy', 1);

  // CORS & Preflight handling
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    );

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Body and cookie parsing
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // Attach session user to all requests
  app.use(attachUser);

  // Pre-initialize SQLite Database
  try {
    await getDb();
    console.log('✓ SQLite database initialized and ready.');
  } catch (err) {
    console.error('Database initialization error:', err);
  }

  // Mount API endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/surveys', surveyRouter);
  app.use('/api/responses', responseRouter);
  app.use('/api/admin', adminRouter);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global API error handler
  app.use('/api', (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  // Mount Vite or static files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ SurveyPulse Server listening on http://0.0.0.0:${PORT}`);
  });

  // Cloud Run & upstream proxy keep-alive duration optimization
  // Prevents 502/ECONNRESET when load balancers reuse idle connections
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
