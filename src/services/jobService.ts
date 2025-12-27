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
    try {
      const job = await jobRepository.create({
        apiKey: input.apiKey,
        url: input.url,
        status: "pending"
      });

      await queueClient.enqueue({ jobId: job.id, url: job.url, options: input.options });

      return job;
    } catch (error) {
      throw new Error("jobService.createJob failed", { cause: error as Error });
    }
  },

  async getJob(id: string): Promise<Job | null> {
    try {
      return await jobRepository.findById(id);
    } catch (error) {
      throw new Error("jobService.getJob failed", { cause: error as Error });
    }
  },

  async getJobResult(id: string): Promise<JobResult | null> {
    try {
      const job = await jobRepository.findById(id);
      if (!job || job.status !== "completed") {
        return null;
      }

      return resultsStore.getResult(id);
    } catch (error) {
      throw new Error("jobService.getJobResult failed", { cause: error as Error });
    }
  },

  async listJobs(params: { apiKey: string; page: number; pageSize: number }) {
    try {
      return await jobRepository.listByApiKey(params);
    } catch (error) {
      throw new Error("jobService.listJobs failed", { cause: error as Error });
    }
  }
};
