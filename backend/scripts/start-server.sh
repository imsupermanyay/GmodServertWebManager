#!/usr/bin/env bash
set -euo pipefail

STEAMAPP_DIR="${STEAMAPP_DIR:-/opt/steam}"
STEAM_USER="${STEAM_USER:-steam}"

ensure_permissions() {
  if [[ "$(id -u)" -eq 0 ]]; then
    mkdir -p "${STEAMAPP_DIR}"
    chown -R "${STEAM_USER}:${STEAM_USER}" "${STEAMAPP_DIR}"
  fi
}

ensure_permissions

START_VALUE="${StartValue:-}"

if [[ -n "${START_VALUE}" ]]; then
  if [[ ! -x "${STEAMAPP_DIR}/srcds_run" ]]; then
    printf '[start-server] srcds_run 不存在或不可执行: %s\n' "${STEAMAPP_DIR}/srcds_run" >&2
    exit 1
  fi

  printf '[start-server] 检测到 StartValue，准备启动服务器\n'
  if [[ "$(id -u)" -eq 0 ]]; then
    exec gosu "${STEAM_USER}" bash -lc "cd \"${STEAMAPP_DIR}\" && exec ./srcds_run ${START_VALUE}"
  else
    exec bash -lc "cd \"${STEAMAPP_DIR}\" && exec ./srcds_run ${START_VALUE}"
  fi
fi

printf '[start-server] 服务已完成启动\n'
exec tail -f /dev/null
