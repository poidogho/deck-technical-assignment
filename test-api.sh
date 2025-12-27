#!/bin/bash

API_URL="http://localhost:3000"
API_KEY="dk_live_test123"

echo "=== Testing Scrape Job API ==="
echo ""

# Health check
echo "1. Health Check:"
curl -s "$API_URL/health" | jq '.'
echo ""

# Create a job
echo "2. Creating a new job:"
RESPONSE=$(curl -s -X POST "$API_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"url": "https://example.com", "options": {"wait_for": "networkidle"}}')

JOB_ID=$(echo $RESPONSE | jq -r '.job_id')
echo "Response: $RESPONSE"
echo "Job ID: $JOB_ID"
echo ""

# Check status
echo "3. Checking job status (will poll until completed):"
for i in {1..15}; do
  STATUS_RESPONSE=$(curl -s "$API_URL/jobs/$JOB_ID")
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  echo "  Attempt $i: Status = $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "  Job completed!"
    echo "  Full status: $STATUS_RESPONSE" | jq '.'
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "  Job failed!"
    break
  fi
  
  sleep 2
done
echo ""

# Get result
if [ "$STATUS" = "completed" ]; then
  echo "4. Fetching job result (first request - from storage):"
  RESULT1=$(curl -s "$API_URL/jobs/$JOB_ID/result")
  echo "$RESULT1" | jq '.'
  echo ""
  
  echo "5. Fetching job result again (second request - from cache):"
  RESULT2=$(curl -s "$API_URL/jobs/$JOB_ID/result")
  echo "$RESULT2" | jq '.'
  echo ""
  
  echo "6. Cache test: Both requests should return identical data"
  if [ "$RESULT1" = "$RESULT2" ]; then
    echo "   ✓ Cache working correctly (results match)"
  else
    echo "   ✗ Results differ"
  fi
  echo ""
fi

# List jobs
echo "7. Listing all jobs:"
curl -s -H "x-api-key: $API_KEY" "$API_URL/jobs?page=1&page_size=10" | jq '.'
echo ""

echo "=== Test Complete ==="
echo ""
echo "To test cache persistence:"
echo "  1. Restart API: docker compose restart api"
echo "  2. Request result again: curl $API_URL/jobs/$JOB_ID/result"
echo "     (Should load from storage and repopulate cache)"

