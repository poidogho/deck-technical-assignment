import { Router } from 'express';
import { jobService } from '../services/jobService.js';
import { validate } from '../middleware/validation.js';
import {
  validateCreateJob,
  validateListJobs,
  validateJobId,
} from '../middleware/jobValidators.js';

export const jobsRouter = Router();

// POST /jobs - Create a new job
jobsRouter.post('/', validate(validateCreateJob), async (req, res) => {
  const { url, options } = req.body;
  const apiKey = req.header('x-api-key')!;

  const job = await jobService.createJob({ apiKey, url, options });

  res.status(202).json({
    job_id: job.id,
    status: job.status,
    status_url: `/jobs/${job.id}`,
  });
});

// GET /jobs - List jobs (must come before /:id routes)
jobsRouter.get('/', validate(validateListJobs), async (req, res) => {
  const apiKey = req.header('x-api-key')!;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.page_size ?? 20);

  const results = await jobService.listJobs({ apiKey, page, pageSize });
  res.json(results);
});

// GET /jobs/:id/result - Get job result (must come before /:id)
jobsRouter.get('/:id/result', validate(validateJobId), async (req, res) => {
  const result = await jobService.getJobResult(req.params.id);
  if (!result) {
    res.status(404).json({ message: 'result not available' });
    return;
  }

  res.json(result);
});

// GET /jobs/:id - Get job status
jobsRouter.get('/:id', validate(validateJobId), async (req, res) => {
  const job = await jobService.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ message: 'job not found' });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    created_at: job.createdAt,
    completed_at: job.completedAt,
  });
});
