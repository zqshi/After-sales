#!/usr/bin/env bash
set -euo pipefail

# Simple workflow sample runner for local backend
# Usage: scripts/run-workflow-sample.sh [BASE_URL]
# Example: scripts/run-workflow-sample.sh http://localhost:8080

BASE_URL="${1:-http://localhost:8080}"
ENDPOINT="${BASE_URL%/}/api/im/incoming-message"

cat <<'JSON' | curl -sS -X POST "${ENDPOINT}" \
  -H 'Content-Type: application/json' \
  -d @- | python3 -m json.tool
{
  "customerId": "CUST-TEST-001",
  "content": "发票怎么开？系统提示错误。",
  "channel": "web",
  "senderId": "USER-TEST-001",
  "mode": "agent_auto",
  "metadata": {
    "trace_id": "workflow-sample"
  }
}
JSON
