import { logger } from "../logger/index.js";
import type { JobResult } from "../services/jobService.js";

const results = new Map<string, JobResult>();

export const resultsStore = {
  async saveResult(result: JobResult) {
    results.set(result.job_id, result);
    logger.info({ jobId: result.job_id }, "results: saved");
    // TODO: persist to local filesystem or MinIO.
  },

  async getResult(jobId: string): Promise<JobResult | null> {
    return results.get(jobId) ?? null;
  }
};
