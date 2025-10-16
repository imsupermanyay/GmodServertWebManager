#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[start-server] %s\n' "$*" >&2
}

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
    log "Ensuring ownership of ${STEAMAPP_DIR} for ${STEAM_USER}"
    mkdir -p "${STEAMAPP_DIR}"
    chown -R "${STEAM_USER}:${STEAM_USER}" "${STEAMAPP_DIR}"
  fi
}

ensure_permissions 

if ! run_as_steam bash -c "cd \"${STEAMAPP_DIR}\" && test -x ./srcds_run"; then
  log "srcds_run is missing or not executable under ${STEAMAPP_DIR}"
  exit 1
fi

STARTUP="${SRCDS_STARTUP:-${DEFAULT_STARTUP:-}}"
if [[ -z "${STARTUP}" ]]; then
  log "No startup arguments provided (SRCDS_STARTUP/DEFAULT_STARTUP are empty)"
  exit 1
fi

log "Launching srcds_run with args: ${STARTUP}"

# shellcheck disable=SC2086
if [[ "$(id -u)" -eq 0 ]]; then
  exec gosu "${STEAM_USER}" "${STEAMAPP_DIR}/srcds_run" ${STARTUP}
else
  exec "${STEAMAPP_DIR}/srcds_run" ${STARTUP}
fi
