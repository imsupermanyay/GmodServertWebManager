# BASE IMAGE
FROM debian:bookworm-slim

# 设置环境变量
ENV STEAMCMD_DIR=/app/steam/steamcmd
ENV GMOD_DIR=/app/steam

# 安装依赖项
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y \
    lib32gcc-s1 \
    lib32stdc++6 \
    wget \
    curl \
    ca-certificates \
    lib32z1 \
    libncurses5:i386 \
    libbz2-1.0:i386 \
    libtinfo5:i386 \
    libcurl4-gnutls-dev:i386 \
    libcurl3-gnutls:i386 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# INSTALL NECESSARY PACKAGES
RUN dpkg --add-architecture i386 && apt-get update && apt-get -y --no-install-recommends --no-install-suggests install \
    wget ca-certificates tar gcc g++ lib32gcc1 libgcc1 libcurl4-gnutls-dev:i386 libssl1.1 libcurl4:i386 libtinfo5 lib32z1 lib32stdc++6 libncurses5:i386 libcurl3-gnutls:i386 gdb libsdl1.2debian libfontconfig net-tools


# 创建steam用户并准备安装目录
RUN useradd -m -s /bin/bash steam && \
    mkdir -p /app/steam && \
    chown -R steam:steam /app/steam

# 切换到steam用户
USER steam
WORKDIR /app/steam

# 下载并安装SteamCMD
RUN mkdir -p ${STEAMCMD_DIR} && \
    cd ${STEAMCMD_DIR} && \
    wget https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz && \
    tar -xvzf steamcmd_linux.tar.gz && \
    rm steamcmd_linux.tar.gz
RUN set -eux; \
    cd ${STEAMCMD_DIR}; \
    if [ ! -d "${GMOD_DIR}/garrysmod" ]; then \
    echo "[INIT] GarrysMod directory not found, downloading (AppID 4020)..."; \
    ./steamcmd.sh +force_install_dir ${GMOD_DIR} +login anonymous +app_update 4020 validate +quit; \
    else \
    echo "[INIT] GarrysMod directory already exists, skipping download."; \
    fi



# 复制启动脚本
COPY --chown=steam:steam start_server.sh /app/steam/start_server.sh
RUN chmod +x /app/steam/start_server.sh

# 暴露GMOD服务器端口
# 27015: 游戏端口
# 27015/udp: 游戏UDP端口
EXPOSE 27015
EXPOSE 27015/tcp
EXPOSE 27015/udp
EXPOSE 27005/udp
