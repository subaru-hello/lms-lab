#!/usr/bin/env bash
# 段5.3 の end-to-end 検証。
# 「買った人にだけ、期限つきで、動画を見せる」が実際に成立しているかを、
# アプリを起動して本物のリクエストで確かめる。
#
#   ./scripts/verify-access.sh
#
# 前提: docker compose の Postgres が起動していて、seed 済みであること。

set -uo pipefail
cd "$(dirname "$0")/.."

PORT=3100
BASE="http://localhost:${PORT}"
JAR_DIR=$(mktemp -d)
trap 'rm -rf "$JAR_DIR"; [ -n "${DEV_PID:-}" ] && kill "$DEV_PID" 2>/dev/null' EXIT

echo "dev サーバーを起動中..."
pnpm exec next dev -p "$PORT" >/tmp/lms-lab-dev.log 2>&1 &
DEV_PID=$!

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" && break
  sleep 1
done

# レッスンIDをDBから引く
PREVIEW_ID=$(docker exec lms-lab-db psql -U lms -d lms -tAc \
  "select id from lessons where is_preview order by position limit 1")
PAID_ID=$(docker exec lms-lab-db psql -U lms -d lms -tAc \
  "select id from lessons where not is_preview order by position limit 1")

login() { # $1=email  $2=cookie file
  curl -s -o /dev/null -c "$2" -X POST "$BASE/api/session" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"password\"}"
}

check() { # $1=名前 $2=期待status $3...=curl引数
  local name="$1" want="$2"; shift 2
  local got reason
  got=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  reason=$(curl -s -D - -o /dev/null "$@" | tr -d '\r' | awk -F': ' '/^x-deny-reason/{print $2}')
  if [ "$got" = "$want" ]; then
    printf 'PASS  %-42s %s %s\n' "$name" "$got" "${reason:+($reason)}"
  else
    printf 'FAIL  %-42s %s (期待 %s) %s\n' "$name" "$got" "$want" "${reason:+($reason)}"
    FAILED=1
  fi
}

FAILED=0
login alice@example.com "$JAR_DIR/alice"   # 有効なEnrollment
login bob@example.com   "$JAR_DIR/bob"     # 期限切れ

VIDEO="$BASE/api/lessons/${PAID_ID}/video"
PREVIEW="$BASE/api/lessons/${PREVIEW_ID}/video"

check "未ログインで有料回"            403 "$VIDEO"
check "期限切れ(bob)で有料回"         403 -b "$JAR_DIR/bob" "$VIDEO"
check "有効(alice)で有料回 -> 署名へ" 302 -b "$JAR_DIR/alice" "$VIDEO"
check "未ログインでプレビュー回"      302 "$PREVIEW"
check "有効(alice) 署名を辿って再生"  200 -L -b "$JAR_DIR/alice" "$VIDEO"
check "期限切れ(bob) 辿っても再生不可" 403 -L -b "$JAR_DIR/bob" "$VIDEO"

BYTES=$(curl -s -L -b "$JAR_DIR/alice" -o /dev/null -w '%{size_download}' "$VIDEO")
echo "      alice が実際に受け取ったバイト数: ${BYTES}"

[ "$FAILED" = 0 ] && echo "すべて期待どおり" || echo "期待と違う結果あり"
exit "$FAILED"
