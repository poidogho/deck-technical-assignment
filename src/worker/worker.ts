import { db } from '../db/index.js';
import { logger } from '../logger/index.js';
import { jobRepository } from '../repositories/jobRepository.js';
import { queueClient } from '../queue/index.js';
import { resultsStore } from '../storage/resultsStore.js';

async function mockScrape(jobId: string, url: string) {
  // Simulate scraping by waiting 5-10 seconds
  const delay = 5000 + Math.random() * 5000;
  await new Promise((resolve) => setTimeout(resolve, delay));
  const extractedAt = new Date().toISOString();
  return {
    job_id: jobId,
    url,
    extracted_at: extractedAt,
    data: {
      title: 'Mock Page',
      content: 'Extracted text content...',
      metadata: { author: 'deck', date: extractedAt },
    },
  };
}

let isShuttingDown = false;

async function run() {
  logger.info('worker: starting');

  // Connect to database
  await db.connect();

  logger.info('worker: ready to process jobs');

  // Main processing loop
  while (!isShuttingDown) {
    try {
      const job = await queueClient.dequeue();
      if (!job) {
        // Timeout reached, continue loop
        continue;
      }

      await processJob(job.jobId, job.url);
    } catch (err) {
      logger.error({ err }, 'worker: error processing job');
      // Continue processing other jobs
    }
  }

  logger.info('worker: stopped processing jobs');
}

async function shutdown() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info('worker: shutdown signal received');
  await queueClient.close();
  await db.close();
  logger.info('worker: shutdown complete');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void run().catch((err) => {
  logger.error({ err }, 'worker: fatal error');
  process.exit(1);
});

export async function processJob(jobId: string, url: string) {
  try {
    logger.info({ jobId, url }, 'worker: processing job');
    await jobRepository.updateStatus({ id: jobId, status: 'processing' });

    const result = await mockScrape(jobId, url);
    await resultsStore.saveResult(result);
    await jobRepository.updateStatus({
      id: jobId,
      status: 'completed',
      completedAt: result.extracted_at,
      resultLocation: `local://results/${jobId}.json`,
    });

    logger.info({ jobId }, 'worker: job completed');
  } catch (err) {
    logger.error({ err, jobId }, 'worker: job failed');
    await jobRepository.updateStatus({ id: jobId, status: 'failed' });
    throw err;
  }
}
