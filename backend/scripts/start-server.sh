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

  # 使用 screen 在后台运行服务器
  SESSION_NAME="gmod-server"

  # 确保 screen 已安装
  if ! command -v screen &> /dev/null; then
    printf '[start-server] 正在安装 screen...\n'
    apt-get update && apt-get install -y screen
  fi

  # 启动服务器在 screen 会话中
  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" bash -lc "cd \"${STEAMAPP_DIR}\" && screen -dmS ${SESSION_NAME} ./srcds_run ${START_VALUE}"
  else
    bash -lc "cd \"${STEAMAPP_DIR}\" && screen -dmS ${SESSION_NAME} ./srcds_run ${START_VALUE}"
  fi

  printf '[start-server] 服务器已在 screen 会话中启动: %s\n' "${SESSION_NAME}"

  # 设置 screen 的日志文件
  LOG_FILE="${STEAMAPP_DIR}/screen.log"

  # 启用 screen 的日志记录
  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" screen -S ${SESSION_NAME} -X logfile "${LOG_FILE}"
    gosu "${STEAM_USER}" screen -S ${SESSION_NAME} -X log on
  else
    screen -S ${SESSION_NAME} -X logfile "${LOG_FILE}"
    screen -S ${SESSION_NAME} -X log on
  fi

  # 持续输出日志文件内容
  touch "${LOG_FILE}"
  exec tail -f "${LOG_FILE}"
fi

printf '[start-server] 服务已完成启动\n'
exec tail -f /dev/null
