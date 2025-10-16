# Base image: Debian bookworm slim (configure mirrors in daemon.json if needed)
FROM debian:bookworm-slim

# Common environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    STEAMCMD_DIR=/opt/steamcmd \
    STEAMAPP_DIR=/opt/steam \
    STEAM_USER=steam \
    DEFAULT_STARTUP="-console -game garrysmod +map gm_construct +maxplayers 24 -ip 0.0.0.0 -port 27015"

# Configure Aliyun apt mirrors and install minimal dependencies for SteamCMD/GMod
RUN rm -rf /etc/apt/sources.list.d/* && \
    printf '%s\n' \
      'deb http://mirrors.aliyun.com/debian/ bookworm main contrib non-free non-free-firmware' \
      'deb http://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free non-free-firmware' \
      'deb http://mirrors.aliyun.com/debian/ bookworm-backports main contrib non-free non-free-firmware' \
      'deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware' \
    > /etc/apt/sources.list && \
    dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends --no-install-suggests \
      ca-certificates curl wget tar xz-utils gosu iproute2 locales \
      lib32gcc-s1 lib32stdc++6 libc6:i386 libcurl4:i386 libncurses5:i386 \
      libtinfo5:i386 libnss3:i386 && \
    rm -rf /var/lib/apt/lists/*

# Create steam user and prepare directories
RUN useradd -m -s /bin/bash "${STEAM_USER}" && \
    mkdir -p "${STEAMCMD_DIR}" "${STEAMAPP_DIR}" && \
    chown -R "${STEAM_USER}:${STEAM_USER}" /opt

# Copy startup script
COPY scripts/start-server.sh /usr/local/bin/start-server.sh
RUN chmod +x /usr/local/bin/start-server.sh

# Switch to steam user
USER ${STEAM_USER}
WORKDIR ${STEAMAPP_DIR}

# Download SteamCMD and prefetch Garry's Mod (AppID 4020)
RUN cd "${STEAMCMD_DIR}" && \
    wget -q https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz && \
    tar -xzf steamcmd_linux.tar.gz && \
    rm steamcmd_linux.tar.gz && \
    "${STEAMCMD_DIR}/steamcmd.sh" +force_install_dir "${STEAMAPP_DIR}" +login anonymous +app_update 4020 validate +quit

# Ports used by GMod
EXPOSE 27015/tcp 27015/udp 27005/udp

# Launch server via helper script
ENTRYPOINT ["/usr/local/bin/start-server.sh"]
