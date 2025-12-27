import express from 'express';
import pinoHttp, { type Options } from 'pino-http';
import { logger } from './logger/index.js';
import { jobsRouter } from './routes/jobs.js';
import { healthRouter } from './routes/health.js';
import { docsRouter } from './routes/docs.js';

export function buildApp() {
  const app = express();

  app.use(express.json());
  app.use(pinoHttp({ logger: logger as unknown as Options['logger'] }));

  app.use('/health', healthRouter);
  app.use('/docs', docsRouter);
  app.use('/jobs', jobsRouter);

  return app;
}
