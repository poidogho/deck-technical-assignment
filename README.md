
# Deck-task

Minimal TypeScript Node service implementing a Scrape Job API with an API server and background worker. Includes structured logging, graceful shutdown, and Docker Compose for easy local development (Postgres, Redis, MinIO).

## Features

- API + worker separation
- PostgreSQL (Knex) migrations
- Redis-backed queue
- Structured logging and graceful shutdown
- Docker Compose for local infra (Postgres, Redis, MinIO)
- Result storage: MinIO object storage or local filesystem
- OpenAPI/Swagger documentation

## Quick start

Prerequisites: Node 18+, PostgreSQL (or Docker), Docker (optional).

Install and run locally:

```sh
npm install
npm run dev
```

Run with Docker Compose (starts API, worker, Postgres, Redis, MinIO):

```sh
docker compose up --build
```

**MinIO Console**: When running with Docker Compose, access the MinIO console at `http://localhost:9001` (default credentials: `minio`/`minio123`).

## API Documentation

Interactive API documentation is available via Swagger UI:

- **Swagger UI**: `http://localhost:3000/docs` — Interactive API explorer with "Try it out" functionality
- **OpenAPI JSON**: `http://localhost:3000/docs/openapi.json` — Machine-readable API specification
- **OpenAPI YAML**: `http://localhost:3000/docs/openapi.yaml` — Human-readable API specification

The API documentation includes:
- All endpoint descriptions and parameters
- Request/response schemas
- Example requests and responses
- Authentication requirements

## Environment

Create a `.env` file or set environment variables. Important variables:

### Core Configuration

- `DATABASE_URL` — Postgres connection string (default: `postgres://postgres:postgres@localhost:5432/deck`)
- `PORT` — API port (default: `3000`)
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379`)
- `NODE_ENV` — environment (`development`|`production`, default: `development`)
- `LOG_LEVEL` — logging level (`info`|`debug`|`error`, default: `info`)

### Storage Configuration

The service supports two storage backends for job results:

1. **MinIO** (object storage) — used when `USE_MINIO=true` or when `MINIO_ENDPOINT` is set to a non-default value
2. **Local filesystem** — fallback option

MinIO variables:

- `USE_MINIO` — enable MinIO storage (`true`|`false`, default: auto-detected)
- `MINIO_ENDPOINT` — MinIO server endpoint (default: `http://localhost:9000`)
- `MINIO_BUCKET` — MinIO bucket name (default: `results`)
- `MINIO_ACCESS_KEY` — MinIO access key (default: `minio`)
- `MINIO_SECRET_KEY` — MinIO secret key (default: `minio123`)

Filesystem variables:

- `RESULTS_DIR` — local directory for storing results (default: `./data/results`)

Example `.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deck
PORT=3000
REDIS_URL=redis://localhost:6379
NODE_ENV=development
LOG_LEVEL=info

# MinIO storage (optional - will use filesystem if not configured)
USE_MINIO=true
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=results
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123

# Or use local filesystem storage
# RESULTS_DIR=./data/results
```

## Database & Migrations

This project uses Knex for migrations. Common commands:

```sh
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create a new migration (script provided)
npm run migrate:make -- migration_name
```

See `migrations/` for existing migration files.

## Project structure (top-level)

- `src/` — application source
- `migrations/` — Knex migrations
- `docker-compose.yml` — local infra
- `Dockerfile` — container build

Key source files:

- `src/app.ts` — express app setup
- `src/main.ts` — app bootstrap
- `src/worker/worker.ts` — background worker
- `src/repositories/jobRepository.ts` — job DB access

## Development

- Run the API in dev mode: `npm run dev`
- Build: `npm run build`
- Start (production): `npm start`
