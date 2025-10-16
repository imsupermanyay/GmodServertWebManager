#!/usr/bin/env bash
set -euo pipefail

# Keep paths configurable by env while providing sane defaults for the image.
STEAMCMD_DIR="${STEAMCMD_DIR:-/opt/steamcmd}"
STEAMAPP_DIR="${STEAMAPP_DIR:-/opt/steam}"
STEAM_USER="${STEAM_USER:-steam}"
STEAM_APP_ID="${STEAM_APP_ID:-4020}"

run_as_steam() {
  if [[ "$(id -u)" -eq 0 ]]; then
    gosu "${STEAM_USER}" "$@"
  else
    "$@"
  fi
}

ensure_permissions() {
  if [[ "$(id -u)" -eq 0 ]]; then
    mkdir -p "${STEAMCMD_DIR}" "${STEAMAPP_DIR}"
    chown -R "${STEAM_USER}:${STEAM_USER}" "${STEAMCMD_DIR}" "${STEAMAPP_DIR}"
  fi
}

ensure_permissions

# Allow opting out of the update step (useful for rapid restarts when assets already up-to-date).
if [[ "${SKIP_STEAM_UPDATE:-0}" != "1" ]]; then
  update_cmd=(
    "${STEAMCMD_DIR}/steamcmd.sh"
    +force_install_dir "${STEAMAPP_DIR}"
    +login anonymous
    +app_update "${STEAM_APP_ID}"
  )

  # Enforce validation when explicitly requested.
  if [[ "${STEAM_VALIDATE:-0}" == "1" ]]; then
    update_cmd+=("validate")
  fi

  update_cmd+=(+quit)
  run_as_steam "${update_cmd[@]}"
fi

run_as_steam bash -c "cd \"${STEAMAPP_DIR}\" && test -x ./srcds_run"
if [[ $? -ne 0 ]]; then
  echo "srcds_run is missing or not executable under ${STEAMAPP_DIR}" >&2
  exit 1
fi

STARTUP="${SRCDS_STARTUP:-${DEFAULT_STARTUP:-}}"
if [[ -z "${STARTUP}" ]]; then
  echo "No startup arguments provided (SRCDS_STARTUP/DEFAULT_STARTUP are empty)" >&2
  exit 1
fi

# shellcheck disable=SC2086
exec run_as_steam "${STEAMAPP_DIR}/srcds_run" ${STARTUP}
