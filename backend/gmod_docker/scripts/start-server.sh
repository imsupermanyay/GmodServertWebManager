#!/usr/bin/env bash
set -euo pipefail

STEAMAPP_DIR="${STEAMAPP_DIR:-/opt/steam}"
STEAM_USER="${STEAM_USER:-steam}"

ensure_permissions() {
  if [[ "$(id -u)" -eq 0 ]]; then
    mkdir -p "${STEAMAPP_DIR}"

    # 找出所有挂载点，chown 时跳过它们
    # 避免修改共享挂载目录的文件属性，防止触发其他容器的 Gmod 热重载
    local exclude_args=()
    while IFS= read -r mnt; do
      [[ -z "$mnt" ]] && continue
      # 只排除 STEAMAPP_DIR 下的挂载点
      if [[ "$mnt" == "${STEAMAPP_DIR}"/* ]]; then
        exclude_args+=(-path "$mnt" -prune -o)
      fi
    done < <(findmnt -rn -o TARGET | grep "^${STEAMAPP_DIR}/")

    if [[ ${#exclude_args[@]} -gt 0 ]]; then
      # 用 find 遍历目录，跳过挂载点，对其余文件执行 chown
      find "${STEAMAPP_DIR}" "${exclude_args[@]}" -print0 | xargs -0 chown "${STEAM_USER}:${STEAM_USER}"
    else
      chown -R "${STEAM_USER}:${STEAM_USER}" "${STEAMAPP_DIR}"
    fi
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

  SESSION_NAME="gmod-server"

  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" screen -wipe 2>/dev/null || true
  else
    screen -wipe 2>/dev/null || true
  fi

  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" screen -S ${SESSION_NAME} -X quit 2>/dev/null || true
  else
    screen -S ${SESSION_NAME} -X quit 2>/dev/null || true
  fi

  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" bash -lc "cd \"${STEAMAPP_DIR}\" && screen -dmS ${SESSION_NAME} ./srcds_run ${START_VALUE}"
  else
    bash -lc "cd \"${STEAMAPP_DIR}\" && screen -dmS ${SESSION_NAME} ./srcds_run ${START_VALUE}"
  fi

  printf '[start-server] 服务器已在 screen 会话中启动: %s\n' "${SESSION_NAME}"

  LOG_FILE="${STEAMAPP_DIR}/screen.log"

  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" screen -S ${SESSION_NAME} -X logfile "${LOG_FILE}"
    gosu "${STEAM_USER}" screen -S ${SESSION_NAME} -X log on
  else
    screen -S ${SESSION_NAME} -X logfile "${LOG_FILE}"
    screen -S ${SESSION_NAME} -X log on
  fi

  touch "${LOG_FILE}"
  exec tail -f "${LOG_FILE}"
fi

printf '[start-server] 服务已完成启动\n'
exec tail -f /dev/null
