#!/usr/bin/env bash
set -euo pipefail

# Keep paths configurable by env while providing sane defaults for the image.
STEAMCMD_DIR="${STEAMCMD_DIR:-/opt/steamcmd}"
STEAMAPP_DIR="${STEAMAPP_DIR:-/opt/steam}"
STEAM_APP_ID="${STEAM_APP_ID:-4020}"

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
  "${update_cmd[@]}"
fi

cd "${STEAMAPP_DIR}"

if [[ ! -x "${STEAMAPP_DIR}/srcds_run" ]]; then
  echo "srcds_run is missing or not executable under ${STEAMAPP_DIR}" >&2
  exit 1
fi

STARTUP="${SRCDS_STARTUP:-${DEFAULT_STARTUP:-}}"
if [[ -z "${STARTUP}" ]]; then
  echo "No startup arguments provided (SRCDS_STARTUP/DEFAULT_STARTUP are empty)" >&2
  exit 1
fi

# shellcheck disable=SC2086 # intentional splitting to pass multiple args to srcds_run
exec "${STEAMAPP_DIR}/srcds_run" ${STARTUP}
