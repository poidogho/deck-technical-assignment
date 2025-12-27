import { buildApp } from './app.js';
import { config } from './config/index.js';
import { db } from './db/index.js';
import { logger } from './logger/index.js';
import { queueClient } from './queue/index.js';
import { registerShutdown } from './shutdown.js';

async function start() {
  await db.connect();

  const app = buildApp();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'api server listening');
  });

  registerShutdown({
    server,
    onShutdown: async () => {
      logger.info('shutdown: starting cleanup');
      await queueClient.close();
      await db.close();
      await logger.flush();
    },
  });
}

start().catch((err) => {
  logger.error({ err }, 'failed to start server');
  process.exit(1);
});
