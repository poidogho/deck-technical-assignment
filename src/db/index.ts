import knex from 'knex';
import type { Knex } from 'knex';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

let knexInstance: Knex | null = null;

export const db = {
  async connect() {
    if (knexInstance) {
      logger.info('db: already connected');
      return;
    }

    knexInstance = knex({
      client: 'pg',
      connection: config.databaseUrl,
      pool: {
        min: 2,
        max: 10,
      },
    });

    // Test the connection
    await knexInstance.raw('SELECT 1');
    logger.info('db: connected successfully');
  },

  async close() {
    if (knexInstance) {
      await knexInstance.destroy();
      knexInstance = null;
      logger.info('db: connection pool closed');
    }
  },

  get knex(): Knex {
    if (!knexInstance) {
      throw new Error('Database not initialized. Call db.connect() first.');
    }
    return knexInstance;
  },
};
