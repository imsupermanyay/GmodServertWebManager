#!/usr/bin/env bash
set -euo pipefail

STEAMAPP_DIR="${STEAMAPP_DIR:-/opt/steam}"
STEAM_USER="${STEAM_USER:-steam}"

run_as_steam() {
  if [[ "$(id -u)" -eq 0 ]]; then
    exec_cmd=(gosu "${STEAM_USER}")
    exec_cmd+=("$@")
    "${exec_cmd[@]}"
  else
    "$@"
  fi
}

ensure_permissions() {
  if [[ "$(id -u)" -eq 0 ]]; then
    mkdir -p "${STEAMAPP_DIR}"
    chown -R "${STEAM_USER}:${STEAM_USER}" "${STEAMAPP_DIR}"
  fi
}

ensure_permissions

printf '[Go] 服务已完成启动 ， 可以启动GMOD服务\n'

exec tail -f /dev/null
