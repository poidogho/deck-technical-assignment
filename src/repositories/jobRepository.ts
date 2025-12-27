import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import type { Job, JobStatus } from '../services/jobService.js';
import { retry } from '../utils/retry.js';

interface JobRow {
  id: string;
  api_key: string;
  url: string;
  status: JobStatus;
  created_at: Date;
  completed_at: Date | null;
  result_location: string | null;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    apiKey: row.api_key,
    url: row.url,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    resultLocation: row.result_location,
  };
}

export const jobRepository = {
  async create(input: {
    apiKey: string;
    url: string;
    status: JobStatus;
  }): Promise<Job> {
    const id = `job_${randomUUID()}`;
    const [row] = await retry('jobRepository.create', () =>
      db
        .knex<JobRow>('jobs')
        .insert({
          id,
          api_key: input.apiKey,
          url: input.url,
          status: input.status,
        })
        .returning('*')
    );

    return rowToJob(row);
  },

  async findById(id: string): Promise<Job | null> {
    const row = await retry('jobRepository.findById', () =>
      db.knex<JobRow>('jobs').where({ id }).first()
    );
    if (!row) {
      return null;
    }
    return rowToJob(row);
  },

  async updateStatus(input: {
    id: string;
    status: JobStatus;
    completedAt?: string;
    resultLocation?: string;
  }): Promise<Job | null> {
    const updateData: Partial<JobRow> = {
      status: input.status,
    };

    if (input.completedAt !== undefined) {
      updateData.completed_at = input.completedAt
        ? new Date(input.completedAt)
        : null;
    }

    if (input.resultLocation !== undefined) {
      updateData.result_location = input.resultLocation;
    }

    const [row] = await retry('jobRepository.updateStatus', () =>
      db
        .knex<JobRow>('jobs')
        .where({ id: input.id })
        .update(updateData)
        .returning('*')
    );

    if (!row) {
      return null;
    }

    return rowToJob(row);
  },

  async listByApiKey(params: {
    apiKey: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const [rows, countResult] = await retry('jobRepository.listByApiKey', () =>
      Promise.all([
        db
          .knex<JobRow>('jobs')
          .where({ api_key: params.apiKey })
          .orderBy('created_at', 'desc')
          .limit(params.pageSize)
          .offset(offset),
        db
          .knex('jobs')
          .where({ api_key: params.apiKey })
          .count('* as total')
          .first<{ total: string | number }>(),
      ])
    );

    const total = Number((countResult?.total as string | number) ?? 0);

    return {
      data: rows.map(rowToJob),
      page: params.page,
      page_size: params.pageSize,
      total,
    };
  },
};
