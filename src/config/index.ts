import { config as loadEnv } from "dotenv";

loadEnv();

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/deck",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  resultsDir: process.env.RESULTS_DIR ?? "./data/results",
  minioEndpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
  minioBucket: process.env.MINIO_BUCKET ?? "results",
  apiKeyHeader: "x-api-key"
};
