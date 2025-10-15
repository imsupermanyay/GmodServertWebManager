# BASE IMAGE
FROM registry.mycompany.local/base/debian-bookworm:latest


# 环境变量
ENV STEAMCMD_DIR=/app/steam/steamcmd
ENV GMOD_DIR=/app/steam

# 使用阿里云镜像并安装依赖
RUN rm -rf /etc/apt/sources.list.d/* && \
  printf 'deb http://mirrors.aliyun.com/debian/ bookworm main contrib non-free non-free-firmware\n' \
  'deb http://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free non-free-firmware\n' \
  'deb http://mirrors.aliyun.com/debian/ bookworm-backports main contrib non-free non-free-firmware\n' \
  'deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware\n' \
  > /etc/apt/sources.list && \
  dpkg --add-architecture i386 && \
  apt-get update && \
  apt-get install -y --no-install-recommends --no-install-suggests \
  lib32gcc-s1 \
  lib32stdc++6 \
  lib32z1 \
  libncurses5:i386 \
  libbz2-1.0:i386 \
  libtinfo5:i386 \
  libcurl4-gnutls-dev:i386 \
  libcurl3-gnutls:i386 \
  wget \
  curl \
  ca-certificates \
  tar \
  gcc \
  g++ \
  lib32gcc1 \
  libgcc1 \
  libcurl4:i386 \
  libtinfo5 \
  gdb \
  libsdl1.2debian \
  libfontconfig \
  net-tools && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# 创建 steam 用户并准备目录
RUN useradd -m -s /bin/bash steam && \
  mkdir -p /app/steam && \
  chown -R steam:steam /app/steam

# 切换到 steam 用户
USER steam
WORKDIR /app/steam

# 下载并安装 SteamCMD
RUN mkdir -p ${STEAMCMD_DIR} && \
  cd ${STEAMCMD_DIR} && \
  wget https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz && \
  tar -xvzf steamcmd_linux.tar.gz && \
  rm steamcmd_linux.tar.gz

# 首次构建时预下载 GMOD（AppID 4020）
RUN set -eux; \
  cd ${STEAMCMD_DIR}; \
  if [ ! -d "${GMOD_DIR}/garrysmod" ]; then \
  echo "[INIT] GarrysMod directory not found, downloading (AppID 4020)..."; \
  ./steamcmd.sh +force_install_dir ${GMOD_DIR} +login anonymous +app_update 4020 validate +quit; \
  else \
  echo "[INIT] GarrysMod directory already exists, skipping download."; \
  fi


# 暴露 GMOD 端口
EXPOSE 27015/tcp
EXPOSE 27015/udp
EXPOSE 27005/udp
