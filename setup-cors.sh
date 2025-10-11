#!/bin/bash

# GMOD 服务器管理系统 - 跨域配置助手
# 此脚本帮助您快速配置跨域设置

echo "======================================"
echo "GMOD 服务器管理系统 - 跨域配置助手"
echo "======================================"
echo ""

# 选择部署场景
echo "请选择您的部署场景："
echo "1) 本地开发（前后端都在本地）"
echo "2) 前端本地，后端在服务器"
echo "3) 使用 Docker Compose 部署"
echo "4) 手动配置"
read -p "请输入选项 (1-4): " scenario

case $scenario in
  1)
    echo ""
    echo "场景1: 本地开发"
    echo "正在配置..."

    # 配置后端
    cat > .env << EOF
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=gmod_manager
JWT_SECRET=gmod-server-manager-secret-key-2024
JWT_EXPIRATION=24h
DOCKER_SOCKET_PATH=/var/run/docker.sock
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin123
FRONTEND_PORT=80
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
EOF

    # 配置前端
    cat > frontend/.env << EOF
VITE_API_BASE_URL=http://localhost:3001
EOF

    echo "✅ 配置完成！"
    echo ""
    echo "启动方式："
    echo "  后端: cd backend && npm run start:dev"
    echo "  前端: cd frontend && npm run dev"
    ;;

  2)
    echo ""
    echo "场景2: 前端本地，后端在服务器"
    read -p "请输入后端服务器IP地址或域名: " backend_host
    read -p "请输入您本机的IP地址（用于CORS白名单）: " local_ip

    # 配置后端
    cat > .env << EOF
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=gmod_manager
JWT_SECRET=gmod-server-manager-secret-key-2024
JWT_EXPIRATION=24h
DOCKER_SOCKET_PATH=/var/run/docker.sock
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin123
FRONTEND_PORT=80
ALLOWED_ORIGINS=http://localhost:5173,http://${local_ip}:5173,http://127.0.0.1:5173
EOF

    # 配置前端
    cat > frontend/.env << EOF
VITE_API_BASE_URL=http://${backend_host}:3001
EOF

    echo "✅ 配置完成！"
    echo ""
    echo "后端配置文件已更新，请上传到服务器并重启后端"
    echo "前端启动方式: cd frontend && npm run dev"
    echo ""
    echo "⚠️ 别忘了在服务器上开放防火墙端口 3001"
    ;;

  3)
    echo ""
    echo "场景3: Docker Compose 部署"
    read -p "请输入数据库密码: " db_password
    read -p "请输入JWT密钥（建议使用随机字符串）: " jwt_secret
    read -p "请输入超级管理员密码: " admin_password

    cat > .env << EOF
PORT=3001
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=${db_password}
DB_DATABASE=gmod_manager
JWT_SECRET=${jwt_secret}
JWT_EXPIRATION=24h
DOCKER_SOCKET_PATH=/var/run/docker.sock
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=${admin_password}
FRONTEND_PORT=80
ALLOWED_ORIGINS=http://localhost
EOF

    # 前端不需要配置，使用 nginx 代理

    echo "✅ 配置完成！"
    echo ""
    echo "启动方式: docker-compose up -d --build"
    echo "查看日志: docker-compose logs -f"
    ;;

  4)
    echo ""
    echo "场景4: 手动配置"
    read -p "请输入允许的前端地址（多个地址用逗号分隔）: " origins
    read -p "请输入前端 API 基础地址: " api_url

    # 配置后端
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=${origins}|" .env 2>/dev/null || \
    echo "ALLOWED_ORIGINS=${origins}" >> .env

    # 配置前端
    cat > frontend/.env << EOF
VITE_API_BASE_URL=${api_url}
EOF

    echo "✅ 配置完成！"
    echo ""
    echo "已更新 CORS 配置"
    ;;

  *)
    echo "无效的选项"
    exit 1
    ;;
esac

echo ""
echo "======================================"
echo "配置文件位置："
echo "  后端: .env"
echo "  前端: frontend/.env"
echo "======================================"
