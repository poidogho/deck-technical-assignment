import { jobRepository } from "../repositories/jobRepository.js";
import { queueClient } from "../queue/index.js";
import { resultsStore } from "../storage/resultsStore.js";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type Job = {
  id: string;
  apiKey: string;
  url: string;
  status: JobStatus;
  createdAt: string;
  completedAt?: string | null;
  resultLocation?: string | null;
};

export type JobResult = {
  job_id: string;
  url: string;
  extracted_at: string;
  data: Record<string, unknown>;
};

export const jobService = {
  async createJob(input: { apiKey: string; url: string; options?: unknown }): Promise<Job> {
    const job = await jobRepository.create({
      apiKey: input.apiKey,
      url: input.url,
      status: "pending"
    });

    await queueClient.enqueue({ jobId: job.id, url: job.url, options: input.options });

    return job;
  },

  async getJob(id: string): Promise<Job | null> {
    return jobRepository.findById(id);
  },

  async getJobResult(id: string): Promise<JobResult | null> {
    const job = await jobRepository.findById(id);
    if (!job || job.status !== "completed") {
      return null;
    }

    return resultsStore.getResult(id);
  },

  async listJobs(params: { apiKey: string; page: number; pageSize: number }) {
    return jobRepository.listByApiKey(params);
  }
};
