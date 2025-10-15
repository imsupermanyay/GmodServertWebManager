# 基础镜像：官方 bookworm-slim（建议在宿主机的 daemon.json 里配置好国内镜像源）
FROM debian:bookworm-slim

# 常用环境变量
ENV DEBIAN_FRONTEND=noninteractive \
  STEAMCMD_DIR=/opt/steamcmd \
  STEAMAPP_DIR=/opt/steam \
  STEAM_USER=steam \
  DEFAULT_STARTUP="-console -game garrysmod +map gm_construct +maxplayers 24 -ip 0.0.0.0 -port 27015"

# 配置阿里云 apt 源并安装 GMod/SteamCMD 运行所需的最小依赖
RUN rm -rf /etc/apt/sources.list.d/* && \
  printf 'deb http://mirrors.aliyun.com/debian/ bookworm main contrib non-free non-free-firmware\n' \
  'deb http://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free non-free-firmware\n' \
  'deb http://mirrors.aliyun.com/debian/ bookworm-backports main contrib non-free non-free-firmware\n' \
  'deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware\n' \
  > /etc/apt/sources.list && \
  dpkg --add-architecture i386 && \
  apt-get update && \
  apt-get install -y --no-install-recommends --no-install-suggests \
  ca-certificates curl wget tar xz-utils gosu iproute2 locales \
  lib32gcc-s1 lib32stdc++6 libc6:i386 libcurl4:i386 libncurses5:i386 \
  libtinfo5:i386 libnss3:i386 && \
  rm -rf /var/lib/apt/lists/*

# 创建 steam 用户并准备目录
RUN useradd -m -s /bin/bash "${STEAM_USER}" && \
  mkdir -p "${STEAMCMD_DIR}" "${STEAMAPP_DIR}" && \
  chown -R "${STEAM_USER}:${STEAM_USER}" /opt

# 切换到 steam 用户
USER ${STEAM_USER}
WORKDIR ${STEAMAPP_DIR}

# 下载并安装 SteamCMD，首次构建时就预下载 GMOD (AppID 4020)
RUN cd "${STEAMCMD_DIR}" && \
  wget -q https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz && \
  tar -xzf steamcmd_linux.tar.gz && \
  rm steamcmd_linux.tar.gz && \
  "${STEAMCMD_DIR}/steamcmd.sh" +force_install_dir "${STEAMAPP_DIR}" +login anonymous +app_update 4020 validate +quit

# 复制启动脚本


# 暴露 GMOD 常用端口
EXPOSE 27015/tcp 27015/udp 27005/udp

# 默认工作目录与启动脚本
WORKDIR ${STEAMAPP_DIR}
