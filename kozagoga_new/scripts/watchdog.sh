#!/bin/bash
# watchdog.sh — следит за Vite и API, перезапускает при падении
# Запуск: nohup bash scripts/watchdog.sh &

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VITE_PORT=5173
API_PORT=3001

log() { echo "[$(date '+%H:%M:%S')] $*"; }

cd "$PROJECT_DIR"

while true; do
  # Vite
  if ! curl -sf http://localhost:$VITE_PORT > /dev/null 2>&1; then
    log "Vite упал, перезапускаю..."
    nohup ./node_modules/.bin/vite --host 0.0.0.0 --port $VITE_PORT > /tmp/vite.log 2>&1 &
    sleep 3
    log "Vite: $(curl -so /dev/null -w '%{http_code}' http://localhost:$VITE_PORT)"
  fi

  # API
  if ! curl -sf http://localhost:$API_PORT/api/health > /dev/null 2>&1; then
    log "API упал, перезапускаю..."
    nohup node server.js > /tmp/api.log 2>&1 &
    sleep 2
    log "API: $(curl -so /dev/null -w '%{http_code}' http://localhost:$API_PORT/api/health)"
  fi

  sleep 10
done
