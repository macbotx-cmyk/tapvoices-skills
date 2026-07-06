#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
tap() { node "$ROOT/bin/tap.js" "$@"; }
MARKER="INST_MARKER_$(date +%s)"
TEST_DEVICE="${TAP_TEST_DEVICE_ID:-}"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "==> AC-INST-0: doctor without bind (optional)"
if tap doctor --json | grep -q '"bound": true'; then
  echo "    (already bound — continuing)"
else
  tap doctor --json | grep -q '"bound": false' || fail "doctor should report unbound or bound"
  pass "doctor runs"
fi

if [[ -z "$TEST_DEVICE" ]]; then
  echo "SKIP: TAP_TEST_DEVICE_ID not set — skipping bind/write (set for full run)"
  echo "Example: TAP_TEST_DEVICE_ID='your-uuid' $0"
  exit 0
fi

echo "==> AC-INST-1: bind device"
tap bind --device-id "$TEST_DEVICE" || fail "bind"
pass "bind"

echo "==> AC-INST-2: doctor bound"
tap doctor --json | grep -q '"bound": true' || fail "not bound"
pass "doctor bound"

echo "==> AC-INST-3: write marker"
OUT=$(tap write --text "Install test $MARKER" --source-app cursor)
echo "$OUT" | grep -q '"ok":true' || fail "write ok"
pass "write"

echo "==> AC-INST-4: empty --text fails"
set +e
tap write --text "" 2>/dev/null
EC=$?
set -e
[[ "$EC" -eq 2 ]] || fail "empty write should exit 2"
pass "empty write rejected"

echo ""
echo "============================================"
echo "Install acceptance PASSED (bind + write)."
echo "Run: npx tapvoices install  (skills — manual in CI optional)"
echo "============================================"
