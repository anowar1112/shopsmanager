import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './modules/auth/router.js';
import { dashboardRouter } from './modules/dashboard/router.js';
import { productsRouter } from './modules/products/router.js';
import { salesRouter } from './modules/sales/router.js';
import { customersRouter } from './modules/customers/router.js';
import { suppliersRouter } from './modules/suppliers/router.js';
import { purchasesRouter } from './modules/purchases/router.js';
import { expensesRouter } from './modules/expenses/router.js';
import { reportsRouter } from './modules/reports/router.js';
import { notificationsRouter } from './modules/notifications/router.js';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ success: true, data: { status: 'ok', db: 'up', time: new Date().toISOString() } });
    } catch {
      res.status(503).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' },
      });
    }
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/purchases', purchasesRouter);
  app.use('/api/v1/expenses', expensesRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  // app.use('/api/v1/products', productRouter);
  // ...

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
