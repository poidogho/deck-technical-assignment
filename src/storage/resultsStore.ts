import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'minio';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';
import type { JobResult } from '../services/jobService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const results = new Map<string, JobResult>();

// Initialize MinIO client lazily
let minioClient: Client | null = null;
let minioInitialized = false;
let filesystemInitialized = false;

async function ensureMinIOInitialized(): Promise<Client | null> {
  if (minioInitialized) {
    return minioClient;
  }

  logger.info(
    {
      useMinio: config.useMinio,
      endpoint: config.minioEndpoint,
      useMinioEnv: process.env.USE_MINIO,
    },
    'MinIO: checking configuration'
  );

  if (!config.useMinio) {
    logger.info('MinIO: disabled, using filesystem');
    minioInitialized = true;
    return null;
  }

  try {
    const url = new URL(config.minioEndpoint);
    minioClient = new Client({
      endPoint: url.hostname,
      port: url.port
        ? parseInt(url.port, 10)
        : url.protocol === 'https:'
        ? 443
        : 80,
      useSSL: url.protocol === 'https:',
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    });

    // Ensure bucket exists
    const bucketExists = await minioClient.bucketExists(config.minioBucket);
    if (!bucketExists) {
      await minioClient.makeBucket(config.minioBucket);
      logger.info({ bucket: config.minioBucket }, 'MinIO: created bucket');
    }
    logger.info(
      {
        endpoint: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        bucket: config.minioBucket,
      },
      'MinIO: initialized successfully'
    );
    minioInitialized = true;
    return minioClient;
  } catch (err) {
    logger.error(
      { err, endpoint: config.minioEndpoint },
      'MinIO: failed to initialize, falling back to filesystem'
    );
    minioClient = null;
    minioInitialized = true;
    return null;
  }
}

async function ensureFilesystemInitialized(): Promise<void> {
  if (filesystemInitialized) {
    return;
  }

  try {
    const resultsDir = config.resultsDir.startsWith('/')
      ? config.resultsDir
      : join(process.cwd(), config.resultsDir);
    await fs.mkdir(resultsDir, { recursive: true });
    logger.info({ dir: resultsDir }, 'filesystem: results directory ready');
    filesystemInitialized = true;
  } catch (err) {
    logger.error(
      { err, dir: config.resultsDir },
      'filesystem: failed to create results directory'
    );
    throw err;
  }
}

function getResultPath(jobId: string): string {
  const resultsDir = config.resultsDir.startsWith('/')
    ? config.resultsDir
    : join(process.cwd(), config.resultsDir);
  return join(resultsDir, `${jobId}.json`);
}

async function saveToFilesystem(result: JobResult): Promise<void> {
  await ensureFilesystemInitialized();
  const filePath = getResultPath(result.job_id);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
}

async function getFromFilesystem(jobId: string): Promise<JobResult | null> {
  try {
    const filePath = getResultPath(jobId);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as JobResult;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

async function saveToMinIO(result: JobResult): Promise<void> {
  const client = await ensureMinIOInitialized();
  if (!client) {
    throw new Error('MinIO client not initialized');
  }
  const objectName = `${result.job_id}.json`;
  const content = JSON.stringify(result, null, 2);
  await client.putObject(
    config.minioBucket,
    objectName,
    content,
    content.length,
    {
      'Content-Type': 'application/json',
    }
  );
}

async function getFromMinIO(jobId: string): Promise<JobResult | null> {
  const client = await ensureMinIOInitialized();
  if (!client) {
    return null;
  }
  try {
    const objectName = `${jobId}.json`;
    const stream = await client.getObject(config.minioBucket, objectName);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(content) as JobResult;
  } catch (err) {
    if (
      (err as Error).message.includes('does not exist') ||
      (err as Error).message.includes('NoSuchKey')
    ) {
      return null;
    }
    throw err;
  }
}

export const resultsStore = {
  async saveResult(result: JobResult) {
    // Save to in-memory cache
    results.set(result.job_id, result);

    // Persist to storage
    try {
      const client = await ensureMinIOInitialized();
      if (config.useMinio && client) {
        await saveToMinIO(result);
        logger.info(
          { jobId: result.job_id, storage: 'MinIO' },
          'results: saved'
        );
      } else {
        await saveToFilesystem(result);
        logger.info(
          { jobId: result.job_id, storage: 'filesystem' },
          'results: saved'
        );
      }
    } catch (err) {
      logger.error({ err, jobId: result.job_id }, 'results: failed to persist');
      throw err;
    }
  },

  async getResult(jobId: string): Promise<JobResult | null> {
    // Check in-memory cache first
    const cached = results.get(jobId);
    if (cached) {
      return cached;
    }

    // Load from storage
    try {
      const client = await ensureMinIOInitialized();
      if (config.useMinio && client) {
        const result = await getFromMinIO(jobId);
        if (result) {
          results.set(jobId, result);
        }
        return result;
      } else {
        const result = await getFromFilesystem(jobId);
        if (result) {
          results.set(jobId, result);
        }
        return result;
      }
    } catch (err) {
      logger.error({ err, jobId }, 'results: failed to load');
      return null;
    }
  },
};
