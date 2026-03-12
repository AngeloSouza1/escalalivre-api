#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
OPEN_JOB_ID="${OPEN_JOB_ID:-}"
PENDING_APPLICATION_ID="${PENDING_APPLICATION_ID:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Comando obrigatorio nao encontrado: $1"
    exit 1
  fi
}

extract_json_field() {
  local json="$1"
  local field="$2"

  node -e '
    const input = process.argv[1]
    const field = process.argv[2]
    const data = JSON.parse(input)
    const value = data[field]
    if (value === undefined) process.exit(1)
    if (typeof value === "object") {
      console.log(JSON.stringify(value))
    } else {
      console.log(String(value))
    }
  ' "$json" "$field"
}

extract_job_id() {
  local json="$1"

  node -e '
    const data = JSON.parse(process.argv[1])
    const jobs = Array.isArray(data.jobs) ? data.jobs : []
    const openJob = jobs.find((job) => job.status === "OPEN")
    if (!openJob?.id) process.exit(1)
    console.log(openJob.id)
  ' "$json"
}

extract_pending_application_id() {
  local json="$1"

  node -e '
    const data = JSON.parse(process.argv[1])
    const applications = Array.isArray(data.applications) ? data.applications : []
    const pending = applications.find((application) => application.status === "PENDING")
    if (!pending?.id) process.exit(1)
    console.log(pending.id)
  ' "$json"
}

print_section() {
  echo
  echo "== $1 =="
}

request() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"

  if [[ -n "$token" && -n "$body" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$body"
    return
  fi

  if [[ -n "$token" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token"
    return
  fi

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body"
    return
  fi

  curl -sS -X "$method" "$BASE_URL$path"
}

require_cmd curl
require_cmd node

print_section "Health"
request GET /health
echo

print_section "Login BUSINESS"
BUSINESS_LOGIN="$(request POST /auth/login "" '{"email":"bar.centro@escalalivre.dev","password":"123456"}')"
echo "$BUSINESS_LOGIN"
BUSINESS_TOKEN="$(extract_json_field "$BUSINESS_LOGIN" token)"

print_section "Login WORKER"
WORKER_LOGIN="$(request POST /auth/login "" '{"email":"maria@escalalivre.dev","password":"123456"}')"
echo "$WORKER_LOGIN"
WORKER_TOKEN="$(extract_json_field "$WORKER_LOGIN" token)"

print_section "Listar vagas abertas"
JOBS_RESPONSE="$(request GET /jobs)"
echo "$JOBS_RESPONSE"
echo

if [[ -z "$OPEN_JOB_ID" ]]; then
  OPEN_JOB_ID="$(extract_job_id "$JOBS_RESPONSE")"
fi

print_section "Detalhe da vaga seed"
request GET "/jobs/$OPEN_JOB_ID"
echo

print_section "Perfil BUSINESS autenticado"
request GET /auth/me "$BUSINESS_TOKEN"
echo

print_section "Vagas do BUSINESS"
request GET /jobs/mine "$BUSINESS_TOKEN"
echo

print_section "Candidaturas do WORKER"
WORKER_APPLICATIONS="$(request GET /applications/mine "$WORKER_TOKEN")"
echo "$WORKER_APPLICATIONS"
echo

if [[ -z "$PENDING_APPLICATION_ID" ]]; then
  PENDING_APPLICATION_ID="$(extract_pending_application_id "$WORKER_APPLICATIONS")"
fi

print_section "Candidaturas da vaga"
request GET "/jobs/$OPEN_JOB_ID/applications" "$BUSINESS_TOKEN"
echo

print_section "Aprovar candidatura pendente"
request PATCH "/applications/$PENDING_APPLICATION_ID/status" "$BUSINESS_TOKEN" '{"status":"APPROVED"}'
echo

print_section "Candidaturas da vaga apos aprovacao"
request GET "/jobs/$OPEN_JOB_ID/applications" "$BUSINESS_TOKEN"
echo

print_section "Fluxo concluido"
echo "Se os IDs do seed mudarem, rode com:"
echo "OPEN_JOB_ID=<job_id> PENDING_APPLICATION_ID=<application_id> ./scripts/test-flow.sh"
echo "IDs usados nesta execucao:"
echo "OPEN_JOB_ID=$OPEN_JOB_ID"
echo "PENDING_APPLICATION_ID=$PENDING_APPLICATION_ID"
