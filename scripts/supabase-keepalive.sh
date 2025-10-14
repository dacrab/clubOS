#!/usr/bin/env bash
# Supabase Keepalive Script
# Pings Supabase instance to prevent pausing of free-tier projects

set -euo pipefail

BASE_URL="${PUBLIC_SUPABASE_URL:-}"
ANON="${PUBLIC_SUPABASE_ANON_KEY:-}"

if [ -z "$BASE_URL" ]; then
  echo "Missing PUBLIC_SUPABASE_URL environment variable" >&2
  exit 1
fi

# Common curl options
CURL_OPTS=(--retry 3 --retry-connrefused --max-time 20 -fsS -o /dev/null)

# 1) Public health endpoint (no auth required)
if curl "${CURL_OPTS[@]}" "$BASE_URL/health"; then
  echo "Supabase /health OK"
  exit 0
fi

# 2) Auth health with anon key (some regions require apikey)
if [ -n "$ANON" ] && curl "${CURL_OPTS[@]}" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$BASE_URL/auth/v1/health"; then
  echo "Supabase auth health OK"
  exit 0
fi

# 3) REST root with anon key (returns 200 when reachable)
if [ -n "$ANON" ] && curl "${CURL_OPTS[@]}" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$BASE_URL/rest/v1/"; then
  echo "Supabase REST ping OK"
  exit 0
fi

# 4) Storage health (authenticated)
if [ -n "$ANON" ] && curl "${CURL_OPTS[@]}" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$BASE_URL/storage/v1/health"; then
  echo "Supabase storage health OK"
  exit 0
fi

# 5) Final attempt: auth health without auth
if curl "${CURL_OPTS[@]}" "$BASE_URL/auth/v1/health"; then
  echo "Supabase auth health OK (anon)"
  exit 0
fi

echo "All keepalive probes failed (check PUBLIC_SUPABASE_ANON_KEY and project URL)" >&2
exit 1
