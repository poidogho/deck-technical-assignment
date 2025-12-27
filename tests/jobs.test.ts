import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { jobService } from '../src/services/jobService.js';

vi.mock('../src/services/jobService.js', () => ({
  jobService: {
    createJob: vi.fn(),
    listJobs: vi.fn(),
    getJob: vi.fn(),
    getJobResult: vi.fn()
  }
}));

const jobServiceMock = jobService as unknown as {
  createJob: ReturnType<typeof vi.fn>;
  listJobs: ReturnType<typeof vi.fn>;
  getJob: ReturnType<typeof vi.fn>;
  getJobResult: ReturnType<typeof vi.fn>;
};

describe('jobs routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a job and returns status metadata', async () => {
    jobServiceMock.createJob.mockResolvedValue({
      id: 'job_123',
      apiKey: 'dk_live_test',
      url: 'https://example.com',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00Z'
    });

    const app = buildApp();
    const response = await request(app)
      .post('/jobs')
      .set('x-api-key', 'dk_live_test')
      .send({ url: 'https://example.com', options: { wait_for: 'networkidle' } });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      job_id: 'job_123',
      status: 'pending',
      status_url: '/jobs/job_123'
    });
    expect(jobServiceMock.createJob).toHaveBeenCalledWith({
      apiKey: 'dk_live_test',
      url: 'https://example.com',
      options: { wait_for: 'networkidle' }
    });
  });

  it('lists jobs with pagination', async () => {
    jobServiceMock.listJobs.mockResolvedValue({
      data: [{ id: 'job_1' }],
      page: 2,
      pageSize: 10,
      total: 25
    });

    const app = buildApp();
    const response = await request(app)
      .get('/jobs?page=2&page_size=10')
      .set('x-api-key', 'dk_live_test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{ id: 'job_1' }],
      page: 2,
      pageSize: 10,
      total: 25
    });
    expect(jobServiceMock.listJobs).toHaveBeenCalledWith({
      apiKey: 'dk_live_test',
      page: 2,
      pageSize: 10
    });
  });

  it('returns job status when found', async () => {
    jobServiceMock.getJob.mockResolvedValue({
      id: 'job_123',
      apiKey: 'dk_live_test',
      url: 'https://example.com',
      status: 'completed',
      createdAt: '2025-01-01T00:00:00Z',
      completedAt: '2025-01-01T00:00:05Z'
    });

    const app = buildApp();
    const response = await request(app).get('/jobs/job_123');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'job_123',
      status: 'completed',
      created_at: '2025-01-01T00:00:00Z',
      completed_at: '2025-01-01T00:00:05Z'
    });
  });

  it('returns 404 when job result is unavailable', async () => {
    jobServiceMock.getJobResult.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app).get('/jobs/job_123/result');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'result not available' });
  });

  it('returns job result when completed', async () => {
    jobServiceMock.getJobResult.mockResolvedValue({
      job_id: 'job_123',
      url: 'https://example.com',
      extracted_at: '2025-01-01T00:00:05Z',
      data: { title: 'Hello' }
    });

    const app = buildApp();
    const response = await request(app).get('/jobs/job_123/result');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      job_id: 'job_123',
      url: 'https://example.com',
      extracted_at: '2025-01-01T00:00:05Z',
      data: { title: 'Hello' }
    });
  });
});
