#!/usr/bin/env bash
# Launch, check and tear down an isolated Outline instance for verification.
#
# Usage:
#   verify-outline.sh up [run-id]       snapshot the checkout, build, migrate, start
#   verify-outline.sh doctor <run-id>   read-only health check of that instance
#   verify-outline.sh info <run-id>     print URL, ports and paths for that instance
#   verify-outline.sh logs <run-id> [n] tail the server log
#   verify-outline.sh psql <run-id> <sql>  run read-only SQL against the instance DB
#   verify-outline.sh down <run-id>     stop and remove what `up` created, keep evidence
#   verify-outline.sh list              list runs and their containers
#
# Each run gets its own source snapshot, Postgres + Redis containers, free
# port and file storage. It never touches the developer's dev server, the
# docker-compose databases, or the repo's .env files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${OUTLINE_REPO:-$(git rev-parse --show-toplevel 2>/dev/null || (cd "$SCRIPT_DIR/../../../.." && pwd))}"
ROOT="${OUTLINE_VERIFY_ROOT:-$HOME/.cache/outline-verify}"
PG_IMAGE="${OUTLINE_VERIFY_PG_IMAGE:-postgres:latest}"
REDIS_IMAGE="${OUTLINE_VERIFY_REDIS_IMAGE:-redis:latest}"

die() { echo "error: $*" >&2; exit 1; }
log() { echo "[verify-outline] $*" >&2; }

run_dir() { echo "$ROOT/runs/$1"; }
evidence_dir() { echo "$ROOT/evidence/$1"; }

load_state() {
  local id="${1:-}"
  [[ -n "$id" ]] || die "run-id required (see: $0 list)"
  local state
  state="$(run_dir "$id")/state.env"
  [[ -f "$state" ]] || die "no run '$id' at $state"
  # shellcheck disable=SC1090
  source "$state"
}

# Exec a command in the snapshot with only this instance's env. The repo's
# .env files are never read: they hold real S3 and OAuth credentials. The
# global rate limit is raised because every static asset of the production
# build counts against it; per-endpoint limits stay as in production. It
# replaces the current shell: call it as `(in_instance ...)` or with `&`.
in_instance() {
    cd "$SRC"
    exec env -i PATH="$PATH" HOME="$HOME" \
      NODE_ENV=production PORT="$PORT" URL="$URL" FORCE_HTTPS=false \
      DATABASE_URL="$DATABASE_URL" PGSSLMODE=disable REDIS_URL="$REDIS_URL" \
      SECRET_KEY="$SECRET_KEY" UTILS_SECRET="$UTILS_SECRET" \
      FILE_STORAGE=local FILE_STORAGE_LOCAL_ROOT_DIR="$RUN_DIR/storage" \
      WEB_CONCURRENCY=1 TELEMETRY=false LOG_LEVEL=info \
      RATE_LIMITER_REQUESTS=100000 \
      "$@"
}

free_port() {
  python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()'
}

cmd_up() {
  local id="${1:-v$(date +%Y%m%d-%H%M%S)}"
  [[ "$id" =~ ^[a-z0-9-]+$ ]] || die "run-id must match [a-z0-9-]+"
  local dir src ev
  dir="$(run_dir "$id")"
  src="$dir/src"
  ev="$(evidence_dir "$id")"
  [[ -e "$dir/state.env" ]] && die "run '$id' already exists; use doctor, or down it first"
  [[ -d "$REPO/node_modules" ]] || die "$REPO/node_modules missing; run yarn install there"
  docker info >/dev/null 2>&1 || die "docker is not running (colima start?)"
  mkdir -p "$dir/storage" "$ev"

  log "snapshot $REPO -> $src"
  rsync -a --delete \
    --exclude node_modules --exclude /build --exclude /.git --exclude /data \
    --exclude '/.env*' --exclude /.claude --exclude /.cursor --exclude /.conductor \
    --exclude /server/config/certs --exclude '.DS_Store' \
    "$REPO/" "$src/"
  ln -sfn "$REPO/node_modules" "$src/node_modules"
  {
    echo "repo: $REPO"
    git -C "$REPO" rev-parse HEAD
    git -C "$REPO" status --porcelain
  } >"$dir/source.txt" 2>/dev/null || true
  cp "$dir/source.txt" "$ev/source.txt"

  # A checkout whose package.json is ahead of or behind its node_modules builds
  # with confusing resolver errors; fail fast instead.
  local missing
  missing="$(cd "$src" && node -e '
    const p = require("./package.json");
    const deps = Object.keys({ ...p.dependencies, ...p.devDependencies });
    const fs = require("fs");
    console.log(deps.filter((d) => !fs.existsSync(`node_modules/${d}/package.json`)).join(" "));
  ')"
  [[ -z "$missing" ]] || { rm -rf "$dir"; die "node_modules in $REPO does not match its package.json (missing: $missing); run yarn install there or use a checkout that matches"; }

  # Write state before any container starts, so `down` can always clean up.
  local pg="outline-verify-$id-pg" redis="outline-verify-$id-redis" port
  port="$(free_port)"
  cat >"$dir/state.env" <<EOF
RUN_ID=$id
RUN_DIR=$dir
SRC=$src
EVIDENCE=$ev
PORT=$port
URL=http://localhost:$port
PG_CONTAINER=$pg
REDIS_CONTAINER=$redis
SECRET_KEY=$(openssl rand -hex 32)
UTILS_SECRET=$(openssl rand -hex 32)
SERVER_LOG=$dir/server.log
PID_FILE=$dir/server.pid
EOF

  docker run -d --name "$pg" --label outline-verify="$id" \
    -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=outline \
    -p 127.0.0.1::5432 "$PG_IMAGE" >/dev/null
  docker run -d --name "$redis" --label outline-verify="$id" \
    -p 127.0.0.1::6379 "$REDIS_IMAGE" >/dev/null
  log "started containers $pg, $redis"
  local pg_port redis_port
  pg_port="$(docker port "$pg" 5432/tcp | head -1 | sed 's/.*://')"
  redis_port="$(docker port "$redis" 6379/tcp | head -1 | sed 's/.*://')"
  cat >>"$dir/state.env" <<EOF
DATABASE_URL=postgres://user:pass@127.0.0.1:$pg_port/outline
REDIS_URL=redis://127.0.0.1:$redis_port
EOF
  load_state "$id"

  # The postgres image runs its init scripts on a socket-only server, so a
  # TCP query only succeeds once the real server is up.
  log "waiting for postgres and redis"
  local i
  for i in $(seq 1 60); do
    docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U user -d outline -tAc 'select 1' >/dev/null 2>&1 && break
    [[ $i == 60 ]] && die "postgres not ready after 60s"
    sleep 1
  done
  for i in $(seq 1 30); do
    docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q PONG && break
    [[ $i == 30 ]] && die "redis not ready after 30s"
    sleep 1
  done

  log "building server (swc)"
  (cd "$SRC" && node build.js) >"$RUN_DIR/build-server.log" 2>&1 ||
    die "server build failed, see $RUN_DIR/build-server.log"
  log "building frontend (vite)"
  (cd "$SRC" && NODE_ENV=production node_modules/.bin/vite build) \
    >"$RUN_DIR/build-app.log" 2>&1 || die "frontend build failed, see $RUN_DIR/build-app.log"

  log "migrating database"
  (in_instance node_modules/.bin/sequelize db:migrate --env production-ssl-disabled) \
    >"$RUN_DIR/migrate.log" 2>&1 || die "migration failed, see $RUN_DIR/migrate.log"

  log "starting server on $URL"
  in_instance nohup node build/server/index.js \
    --services=web,websockets,collaboration,worker,cron >"$SERVER_LOG" 2>&1 &
  echo $! >"$PID_FILE"

  for i in $(seq 1 90); do
    if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      tail -40 "$SERVER_LOG" >&2
      die "server exited during startup, see $SERVER_LOG"
    fi
    if [[ "$(curl -s -o /dev/null -w '%{http_code}' "$URL/_health")" == 200 ]] &&
      curl -s "$URL/" | grep -q '/static/assets/index\.'; then
      log "READY $URL (run-id: $id)"
      cmd_info "$id"
      return 0
    fi
    sleep 1
  done
  die "server not ready after 90s, see $SERVER_LOG"
}

cmd_doctor() {
  load_state "$1"
  local rc=0 pid tmp
  pid="$(cat "$PID_FILE" 2>/dev/null || echo none)"
  tmp="$(mktemp)"
  check() {
    if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; rc=1; fi
  }
  check "server pid $pid alive" "[[ $pid =~ ^[1-9][0-9]*$ ]] && kill -0 $pid"
  check "port $PORT listened on by our process tree" \
    "lsof -nP -iTCP:$PORT -sTCP:LISTEN -t | grep -qxF \"\$(tree $pid)\""
  check "server cwd is snapshot" "lsof -a -p $pid -d cwd -Fn | grep -qx 'n$SRC'"
  check "postgres container running" "[ \"\$(docker inspect -f '{{.State.Running}}' $PG_CONTAINER)\" = true ]"
  check "redis container running" "[ \"\$(docker inspect -f '{{.State.Running}}' $REDIS_CONTAINER)\" = true ]"
  check "GET /_health = 200 (db + redis)" "[ \"\$(curl -s -o /dev/null -w '%{http_code}' $URL/_health)\" = 200 ]"
  check "GET / serves the built SPA" "curl -s $URL/ | grep -q '/static/assets/index\.'"
  check "no pending migrations" \
    "(in_instance node_modules/.bin/sequelize db:migrate:status --env production-ssl-disabled) >$tmp && grep -q '^up ' $tmp && ! grep -q '^down ' $tmp"
  rm -f "$tmp"
  echo "info teams=$(cmd_psql "$1" 'select count(*) from teams' 2>/dev/null || echo '?') users=$(cmd_psql "$1" 'select count(*) from users' 2>/dev/null || echo '?') (teams=0: / shows workspace setup)"
  if [[ "$(wc -l <"$RUN_DIR/source.txt")" -ge 2 ]]; then
    echo "info snapshot: $(sed -n 2p "$RUN_DIR/source.txt") + $(($(wc -l <"$RUN_DIR/source.txt") - 2)) uncommitted paths from $(sed -n 1p "$RUN_DIR/source.txt" | cut -d' ' -f2)"
  else
    echo "info snapshot: $(sed -n 1p "$RUN_DIR/source.txt" | cut -d' ' -f2) (not a git checkout)"
  fi
  return $rc
}

cmd_info() {
  load_state "$1"
  cat <<EOF
RUN_ID=$RUN_ID
URL=$URL
EVIDENCE=$EVIDENCE
SERVER_LOG=$SERVER_LOG
STORAGE=$RUN_DIR/storage
DATABASE_URL=$DATABASE_URL
PG_CONTAINER=$PG_CONTAINER
EOF
}

cmd_logs() {
  load_state "$1"
  tail -n "${2:-100}" "$SERVER_LOG"
}

cmd_psql() {
  load_state "$1"
  [[ -n "${2:-}" ]] || die "sql required"
  docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U user -d outline -v ON_ERROR_STOP=1 \
    -c 'SET default_transaction_read_only = on' -tA -c "$2" | sed '/^SET$/d'
}

# Print a pid and all of its descendants.
tree() {
  local p
  echo "$1"
  for p in $(pgrep -P "$1" || true); do tree "$p"; done
}

cmd_down() {
  load_state "$1"
  local pid pids
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    # the cluster forks a worker; stop the tree we started, never by process name.
    pids="$(tree "$pid" | tr '\n' ' ')"
    kill $pids 2>/dev/null || true
    for _ in $(seq 1 10); do kill -0 $pids 2>/dev/null || break; sleep 1; done
    kill -9 $pids 2>/dev/null || true
    log "stopped server pids $pids"
  fi
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "WARNING: port $PORT still has a listener; inspect with lsof before killing anything"
  fi
  docker rm -f "$PG_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
  log "removed containers"
  mkdir -p "$EVIDENCE"
  cp "$SERVER_LOG" "$EVIDENCE/server.log" 2>/dev/null || true
  rm -rf "$RUN_DIR"
  log "removed $RUN_DIR; evidence kept at $EVIDENCE"
  ls -la "$EVIDENCE"
}

cmd_list() {
  echo "runs:"
  ls -1 "$ROOT/runs" 2>/dev/null | sed 's/^/  /' || true
  echo "containers:"
  docker ps -a --filter label=outline-verify --format '  {{.Names}}\t{{.Status}}'
}

case "${1:-}" in
  up) cmd_up "${2:-}" ;;
  doctor) cmd_doctor "${2:-}" ;;
  info) cmd_info "${2:-}" ;;
  logs) cmd_logs "${2:-}" "${3:-}" ;;
  psql) cmd_psql "${2:-}" "${3:-}" ;;
  down) cmd_down "${2:-}" ;;
  list) cmd_list ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
