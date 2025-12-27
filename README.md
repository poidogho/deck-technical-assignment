
# Deck-task

Minimal TypeScript Node service implementing a Scrape Job API with an API server and background worker. Includes structured logging, graceful shutdown, and Docker Compose for easy local development (Postgres, Redis, MinIO).

## Features

- API + worker separation
- PostgreSQL (Knex) migrations
- Redis-backed queue
- Structured logging and graceful shutdown
- Docker Compose for local infra

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

## Environment

Create a `.env` file or set environment variables. Important variables:

- `DATABASE_URL` — Postgres connection string (required)
- `PORT` — API port (default: 3000)
- `REDIS_URL` — Redis connection string (default: redis://localhost:6379)
- `NODE_ENV` — environment (development|production)
- `LOG_LEVEL` — logging level (info|debug|error)

Example `.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deck
PORT=3000
REDIS_URL=redis://localhost:6379
NODE_ENV=development
LOG_LEVEL=info
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
