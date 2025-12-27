# API Testing Guide

This guide provides example requests to test the Scrape Job API after running `docker compose up --build`.

## Prerequisites

1. Ensure all services are running: `docker compose up --build`
2. Run database migrations: `docker compose exec api npm run migrate`
3. Wait for services to be ready (check logs: `docker compose logs api`)

## API Endpoints

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

### 2. Create a Scrape Job (POST /jobs)

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: dk_live_test123" \
  -d '{
    "url": "https://example.com",
    "options": {
      "wait_for": "networkidle"
    }
  }'
```

Expected response (202 Accepted):
```json
{
  "job_id": "job_abc123",
  "status": "pending",
  "status_url": "/jobs/job_abc123"
}
```

**Save the `job_id` from the response** - you'll need it for subsequent requests.

### 3. Get Job Status (GET /jobs/{id})

Replace `{job_id}` with the actual job ID from step 2:

```bash
curl http://localhost:3000/jobs/{job_id}
```

Example:
```bash
curl http://localhost:3000/jobs/job_abc123
```

Expected response (200 OK):
```json
{
  "id": "job_abc123",
  "status": "pending",
  "created_at": "2025-01-15T10:30:00Z",
  "completed_at": null
}
```

**Note**: Status will change from `pending` → `processing` → `completed` as the worker processes the job (takes 5-10 seconds).

### 4. Get Job Result (GET /jobs/{id}/result)

Wait for the job to complete (status = "completed"), then:

```bash
curl http://localhost:3000/jobs/{job_id}/result
```

Example:
```bash
curl http://localhost:3000/jobs/job_abc123/result
```

Expected response (200 OK when completed):
```json
{
  "job_id": "job_abc123",
  "url": "https://example.com",
  "extracted_at": "2025-01-15T10:30:45Z",
  "data": {
    "title": "Mock Page",
    "content": "Extracted text content...",
    "metadata": {
      "author": "deck",
      "date": "2025-01-15T10:30:45Z"
    }
  }
}
```

If job is still pending/processing, you'll get:
```json
{
  "message": "result not available"
}
```

### 5. List Jobs (GET /jobs)

```bash
curl -H "x-api-key: dk_live_test123" \
  "http://localhost:3000/jobs?page=1&page_size=20"
```

Expected response (200 OK):
```json
{
  "data": [
    {
      "id": "job_abc123",
      "api_key": "dk_live_test123",
      "url": "https://example.com",
      "status": "completed",
      "created_at": "2025-01-15T10:30:00Z",
      "completed_at": "2025-01-15T10:30:45Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

## Testing the Cache

The `resultsStore` uses an in-memory cache (Map) that stores results after they're first loaded. Here's how to test it:

### Test 1: Cache Hit (Result Loaded from Memory)

1. **Create and wait for a job to complete:**
```bash
# Create job
JOB_ID=$(curl -s -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: dk_live_test123" \
  -d '{"url": "https://example.com"}' | jq -r '.job_id')

echo "Job ID: $JOB_ID"

# Wait for completion (check status every 2 seconds)
while true; do
  STATUS=$(curl -s http://localhost:3000/jobs/$JOB_ID | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ]; then
    break
  fi
  sleep 2
done
```

2. **First request - loads from storage, populates cache:**
```bash
curl http://localhost:3000/jobs/$JOB_ID/result
```

3. **Second request - served from cache (faster):**
```bash
curl http://localhost:3000/jobs/$JOB_ID/result
```

Both requests should return the same data, but the second one is served from the in-memory cache.

### Test 2: Cache Miss (Result Loaded from Storage)

To test cache miss, you need to restart the API server (which clears the in-memory cache):

1. **Restart the API service:**
```bash
docker compose restart api
```

2. **Request the result again - it will load from storage (MinIO or filesystem):**
```bash
curl http://localhost:3000/jobs/$JOB_ID/result
```

This request will:
- Check in-memory cache (miss - cache was cleared on restart)
- Load from storage (MinIO or filesystem)
- Populate the cache for future requests

### Test 3: Verify Storage Persistence

1. **Create a job and wait for completion**
2. **Check where the result is stored:**

If using MinIO:
```bash
# Access MinIO console at http://localhost:9001
# Login: minio / minio123
# Check bucket "results" for the JSON file
```

If using filesystem:
```bash
# Check the results directory
docker compose exec api ls -la /app/data/results/
docker compose exec api cat /app/data/results/{job_id}.json
```

3. **Restart API and verify result is still accessible:**
```bash
docker compose restart api
# Wait a few seconds for API to start
curl http://localhost:3000/jobs/{job_id}/result
```

The result should still be available even after restart, proving persistence works.

## Complete Test Workflow

Here's a complete bash script to test the full workflow:

```bash
#!/bin/bash

API_URL="http://localhost:3000"
API_KEY="dk_live_test123"

echo "=== Creating a new job ==="
RESPONSE=$(curl -s -X POST "$API_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"url": "https://example.com", "options": {"wait_for": "networkidle"}}')

JOB_ID=$(echo $RESPONSE | jq -r '.job_id')
echo "Job created: $JOB_ID"
echo "Response: $RESPONSE"

echo -e "\n=== Checking job status ==="
for i in {1..10}; do
  STATUS=$(curl -s "$API_URL/jobs/$JOB_ID" | jq -r '.status')
  echo "Attempt $i: Status = $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo -e "\n=== Job completed! Fetching result ==="
    curl -s "$API_URL/jobs/$JOB_ID/result" | jq '.'
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Job failed!"
    break
  fi
  
  sleep 2
done

echo -e "\n=== Listing all jobs ==="
curl -s -H "x-api-key: $API_KEY" "$API_URL/jobs?page=1&page_size=10" | jq '.'
```

Save this as `test-api.sh`, make it executable (`chmod +x test-api.sh`), and run it.

## Using Swagger UI

You can also test the API interactively using Swagger UI:

1. Open `http://localhost:3000/docs` in your browser
2. Click on any endpoint to expand it
3. Click "Try it out"
4. Fill in the parameters and click "Execute"
5. View the response

## Troubleshooting

### Jobs stuck in "pending" status
- Check worker logs: `docker compose logs worker`
- Ensure Redis is running: `docker compose ps redis`
- Check queue connection: `docker compose logs api | grep redis`

### Results not found (404)
- Wait for job to complete (status = "completed")
- Check worker logs for errors
- Verify storage is configured correctly

### Database connection errors
- Ensure PostgreSQL is running: `docker compose ps postgres`
- Run migrations: `docker compose exec api npm run migrate`
- Check database URL in environment variables

