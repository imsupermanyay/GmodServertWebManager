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
START_VALUE_FILE="${START_VALUE_FILE:-/opt/steam/startup.args}"

if [[ -z "${START_VALUE}" && -f "${START_VALUE_FILE}" ]]; then
  START_VALUE="$(<"${START_VALUE_FILE}")"
  rm -f "${START_VALUE_FILE}"
fi

if [[ -n "${START_VALUE}" ]]; then
  if [[ ! -x "${STEAMAPP_DIR}/srcds_run" ]]; then
    printf '[start-server] srcds_run 不存在或不可执行: %s\n' "${STEAMAPP_DIR}/srcds_run" >&2
    exit 1
  fi

  printf '[start-server] 检测到 StartValue，准备启动服务器\n'

  # 创建命名管道用于接收命令
  FIFO_PATH="${STEAMAPP_DIR}/garrysmod/servercmd.fifo"
  mkdir -p "$(dirname "${FIFO_PATH}")"

  if [[ ! -p "${FIFO_PATH}" ]]; then
    mkfifo "${FIFO_PATH}"
    printf '[start-server] 创建命令管道: %s\n' "${FIFO_PATH}"
  fi

  # 启动服务器并将 FIFO 重定向到标准输入
  if [[ "$(id -u)" -eq 0 ]]; then
    exec gosu "${STEAM_USER}" bash -lc "cd \"${STEAMAPP_DIR}\" && tail -f \"${FIFO_PATH}\" | ./srcds_run ${START_VALUE}"
  else
    exec bash -lc "cd \"${STEAMAPP_DIR}\" && tail -f \"${FIFO_PATH}\" | ./srcds_run ${START_VALUE}"
  fi
fi

printf '[start-server] 服务已完成启动\n'
exec tail -f /dev/null
