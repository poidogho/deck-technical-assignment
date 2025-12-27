import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

export type QueueJob = {
  jobId: string;
  url: string;
  options?: unknown;
};

const QUEUE_NAME = 'scrape_jobs';

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'redis: connection error');
    });

    redisClient.on('connect', () => {
      logger.info('redis: connected');
    });
  }
  return redisClient;
}

export const queueClient = {
  async enqueue(payload: QueueJob) {
    const client = getRedisClient();
    const jobData = JSON.stringify(payload);
    await client.lpush(QUEUE_NAME, jobData);
    logger.info({ jobId: payload.jobId }, 'queue: job enqueued');
  },

  async dequeue(): Promise<QueueJob | null> {
    const client = getRedisClient();
    const result = await client.brpop(QUEUE_NAME, 5); // Block for 5 seconds
    if (!result || result.length < 2) {
      return null;
    }
    try {
      const jobData = JSON.parse(result[1]) as QueueJob;
      logger.info({ jobId: jobData.jobId }, 'queue: job dequeued');
      return jobData;
    } catch (err) {
      logger.error({ err, data: result[1] }, 'queue: failed to parse job data');
      return null;
    }
  },

  async close() {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('redis: connection closed');
    }
  },
};
