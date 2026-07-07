#!/usr/bin/env bash
# Handoff P0 API acceptance (AC-0, AC-NO-SCOPE, AC-FAIL partial, AC-SELF smoke).
# Usage:
#   ./scripts/acceptance-api.sh
#   TAPVOICES_API_BASE=https://www.tapvoices.com ./scripts/acceptance-api.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/bin/tapvoices.js"
API_BASE="${TAPVOICES_API_BASE:-https://www.tapvoices.com}"
API_BASE="${API_BASE%/}"
DEVICE_ID="${TAPVOICES_DEVICE_ID:-acceptance-handoff-$(date +%s)}"
MARKER="MARKER_PUSH_$(date +%s)"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "API base: $API_BASE"
echo "Device:   $DEVICE_ID"
echo "Marker:   $MARKER"
echo

echo "==> AC-0 setup: register"
REG=$(curl -sf -X POST "$API_BASE/api/app/register" \
  -H 'Content-Type: application/json' \
  -d "{\"deviceId\":\"$DEVICE_ID\"}") || fail "register HTTP"
CODE=$(echo "$REG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);process.exit(j.code===0?0:1)})") \
  || fail "register code != 0"
TOKEN=$(echo "$REG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.parse(d).data.token))")
test -n "$TOKEN" || fail "empty token"
pass "register + JWT"

echo "==> AC-NO-SCOPE: write without content must fail"
set +e
OUT=$(node "$CLI" write 2>&1)
EC=$?
set -e
if [[ $EC -eq 0 ]]; then fail "write without content succeeded"; fi
echo "$OUT" | grep -qiE 'empty|No content|stdin|AC-NO-SCOPE|Not authenticated' || fail "unexpected no-scope message: $OUT"
pass "CLI refuses unauthenticated/empty write (exit $EC)"

export TAPVOICES_API_BASE="$API_BASE"
export TAPVOICES_TOKEN="$TOKEN"
set +e
OUT2=$(node "$CLI" write 2>&1)
EC2=$?
set -e
if [[ $EC2 -eq 0 ]]; then fail "authenticated write without content succeeded"; fi
pass "CLI refuses empty write when authenticated (exit $EC2)"

echo "==> AC-0: push marker via API"
set +e
PUSH=$(curl -sf -X POST "$API_BASE/api/app/handoff/push" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"$MARKER ONLY_PUSH_X body\",\"label\":\"acceptance\",\"sourceApp\":\"cursor\",\"summary\":{\"headline\":\"acceptance push\",\"bullets\":[\"smoke\"]}}")
PUSH_EC=$?
set -e
if [[ $PUSH_EC -ne 0 ]]; then
  CODE=$(curl -s -o /tmp/tv-push.json -w "%{http_code}" -X POST "$API_BASE/api/app/handoff/push" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"probe\"}")
  if [[ "$CODE" == "404" ]]; then
    fail "handoff/push 404 — deploy Handoff P0 on the server first (see TapVoices server deploy docs)."
  fi
  fail "push HTTP"
fi
echo "$PUSH" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(j.code!==0)process.exit(1)})" \
  || fail "push code != 0"
PUSH_ID=$(echo "$PUSH" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(String(JSON.parse(d).data.id)))")
echo "$PUSH" | grep -q '"kind":"inbox"' || fail "push response missing kind=inbox"
pass "push queued id=$PUSH_ID (kind=inbox)"

echo "==> AC-0: pending contains marker"
PENDING=$(curl -sf "$API_BASE/api/app/handoff/push/pending" \
  -H "Authorization: Bearer $TOKEN") || fail "pending HTTP"
echo "$PENDING" | grep -q "$MARKER" || fail "marker not in pending"
pass "pending has marker"

echo "==> AC-0: consume ack"
CONSUME=$(curl -sf -X POST "$API_BASE/api/app/handoff/push/consume" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"ids\":[$PUSH_ID]}") || fail "consume HTTP"
echo "$CONSUME" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if((j.data.consumed||0)<1)process.exit(1)})" \
  || fail "consume count"
pass "consume ack"

echo "==> AC-0: pending empty after consume"
PENDING2=$(curl -sf "$API_BASE/api/app/handoff/push/pending" \
  -H "Authorization: Bearer $TOKEN") || fail "pending2 HTTP"
echo "$PENDING2" | grep -q "$MARKER" && fail "marker still pending after consume" || true
pass "pending cleared"

echo "==> Agent Mail: inbox latest after consume"
INBOX=$(curl -sf "$API_BASE/api/app/mail/inbox/latest" \
  -H "Authorization: Bearer $TOKEN") || fail "inbox latest HTTP (deploy Agent Mail P1 on server?)"
echo "$INBOX" | grep -q "$MARKER" || fail "inbox missing marker"
echo "$INBOX" | grep -q '"kind":"inbox"' || fail "inbox missing kind"
pass "inbox latest has marker"

echo "==> Agent Mail: sent create + latest"
SENT=$(curl -sf -X POST "$API_BASE/api/app/mail/sent" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"summary\":{\"headline\":\"acceptance\",\"bullets\":[\"ok\"]},\"notes\":[\"hold note\"],\"refInboxIds\":[\"in_${PUSH_ID}\"]}") \
  || fail "sent create HTTP"
echo "$SENT" | grep -q '"kind":"sent"' || fail "sent missing kind"
SENT_L=$(curl -sf "$API_BASE/api/app/mail/sent/latest" \
  -H "Authorization: Bearer $TOKEN") || fail "sent latest HTTP"
echo "$SENT_L" | grep -q 'hold note' || fail "sent latest missing note"
pass "sent latest ok"

echo "==> CLI read inbox/sent"
set +e
READ_IN=$(node "$CLI" read inbox --latest --json 2>&1)
READ_EC=$?
set -e
if [[ $READ_EC -ne 0 ]]; then fail "cli read inbox (exit $READ_EC): $READ_IN"; fi
echo "$READ_IN" | grep -qE '"kind"[[:space:]]*:[[:space:]]*"inbox"' || fail "cli read inbox missing kind: $READ_IN"
set +e
READ_SE=$(node "$CLI" read sent --latest --json 2>&1)
READ_EC2=$?
set -e
if [[ $READ_EC2 -ne 0 ]]; then fail "cli read sent (exit $READ_EC2): $READ_SE"; fi
echo "$READ_SE" | grep -qE '"kind"[[:space:]]*:[[:space:]]*"sent"' || fail "cli read sent missing kind: $READ_SE"
pass "cli read inbox/sent"

echo "==> AC-FAIL: bad token rejected"
set +e
BAD=$(curl -s -o /tmp/tv-bad.json -w "%{http_code}" -X POST "$API_BASE/api/app/handoff/push" \
  -H "Authorization: Bearer bad-token" \
  -H 'Content-Type: application/json' \
  -d '{"text":"x"}')
set -e
if [[ "$BAD" == "200" ]]; then
  CODE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/tv-bad.json','utf8')).code)")
  test "$CODE" != "0" || fail "bad token returned code 0"
fi
pass "bad token not accepted (HTTP $BAD)"

echo "==> CLI write path"
export TAPVOICES_API_BASE="$API_BASE"
export TAPVOICES_TOKEN="$TOKEN"
CLI_OUT=$(node "$CLI" write --text "$MARKER cli-path" --source-app codex)
echo "$CLI_OUT" | grep -q '"ok":true' || fail "cli write failed: $CLI_OUT"
pass "CLI write ok"

echo
echo "============================================"
echo "API acceptance PASSED."
echo "Next (AC-AHA on device):"
echo "  1. Open TapVoices on iPhone (same account / fresh install uses deviceId above only for API test)."
echo "  2. Ensure App logged in to $API_BASE"
echo "  3. Run: node $CLI write --text \"ONLY_PUSH_X $MARKER\" --source-app cursor"
echo "     (after: npx tapvoices auth --token <phone-jwt>)"
echo "  4. Foreground App → swipe query: ONLY_PUSH_X"
echo "============================================"
