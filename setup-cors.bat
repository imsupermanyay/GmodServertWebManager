@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ======================================
echo GMOD 服务器管理系统 - 跨域配置助手
echo ======================================
echo.

echo 请选择您的部署场景：
echo 1^) 本地开发（前后端都在本地）
echo 2^) 前端本地，后端在服务器
echo 3^) 使用 Docker Compose 部署
echo 4^) 手动配置
set /p scenario="请输入选项 (1-4): "

if "%scenario%"=="1" (
    echo.
    echo 场景1: 本地开发
    echo 正在配置...

    REM 配置后端
    (
        echo PORT=3001
        echo NODE_ENV=development
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USERNAME=root
        echo DB_PASSWORD=password
        echo DB_DATABASE=gmod_manager
        echo JWT_SECRET=gmod-server-manager-secret-key-2024
        echo JWT_EXPIRATION=24h
        echo DOCKER_SOCKET_PATH=/var/run/docker.sock
        echo SUPER_ADMIN_USERNAME=admin
        echo SUPER_ADMIN_PASSWORD=admin123
        echo FRONTEND_PORT=80
        echo ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
    ) > .env

    REM 配置前端
    (
        echo VITE_API_BASE_URL=http://localhost:3001
    ) > frontend\.env

    echo ✅ 配置完成！
    echo.
    echo 启动方式：
    echo   后端: cd backend ^&^& npm run start:dev
    echo   前端: cd frontend ^&^& npm run dev

) else if "%scenario%"=="2" (
    echo.
    echo 场景2: 前端本地，后端在服务器
    set /p backend_host="请输入后端服务器IP地址或域名: "
    set /p local_ip="请输入您本机的IP地址（用于CORS白名单）: "

    REM 配置后端
    (
        echo PORT=3001
        echo NODE_ENV=production
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USERNAME=root
        echo DB_PASSWORD=password
        echo DB_DATABASE=gmod_manager
        echo JWT_SECRET=gmod-server-manager-secret-key-2024
        echo JWT_EXPIRATION=24h
        echo DOCKER_SOCKET_PATH=/var/run/docker.sock
        echo SUPER_ADMIN_USERNAME=admin
        echo SUPER_ADMIN_PASSWORD=admin123
        echo FRONTEND_PORT=80
        echo ALLOWED_ORIGINS=http://localhost:5173,http://!local_ip!:5173,http://127.0.0.1:5173
    ) > .env

    REM 配置前端
    (
        echo VITE_API_BASE_URL=http://!backend_host!:3001
    ) > frontend\.env

    echo ✅ 配置完成！
    echo.
    echo 后端配置文件已更新，请上传到服务器并重启后端
    echo 前端启动方式: cd frontend ^&^& npm run dev
    echo.
    echo ⚠️ 别忘了在服务器上开放防火墙端口 3001

) else if "%scenario%"=="3" (
    echo.
    echo 场景3: Docker Compose 部署
    set /p db_password="请输入数据库密码: "
    set /p jwt_secret="请输入JWT密钥（建议使用随机字符串）: "
    set /p admin_password="请输入超级管理员密码: "

    (
        echo PORT=3001
        echo NODE_ENV=production
        echo DB_HOST=mysql
        echo DB_PORT=3306
        echo DB_USERNAME=root
        echo DB_PASSWORD=!db_password!
        echo DB_DATABASE=gmod_manager
        echo JWT_SECRET=!jwt_secret!
        echo JWT_EXPIRATION=24h
        echo DOCKER_SOCKET_PATH=/var/run/docker.sock
        echo SUPER_ADMIN_USERNAME=admin
        echo SUPER_ADMIN_PASSWORD=!admin_password!
        echo FRONTEND_PORT=80
        echo ALLOWED_ORIGINS=http://localhost
    ) > .env

    echo ✅ 配置完成！
    echo.
    echo 启动方式: docker-compose up -d --build
    echo 查看日志: docker-compose logs -f

) else if "%scenario%"=="4" (
    echo.
    echo 场景4: 手动配置
    set /p origins="请输入允许的前端地址（多个地址用逗号分隔）: "
    set /p api_url="请输入前端 API 基础地址: "

    REM 读取现有 .env 并更新 ALLOWED_ORIGINS
    if exist .env (
        findstr /v "ALLOWED_ORIGINS=" .env > .env.tmp
        move /y .env.tmp .env >nul
    )
    echo ALLOWED_ORIGINS=!origins! >> .env

    REM 配置前端
    (
        echo VITE_API_BASE_URL=!api_url!
    ) > frontend\.env

    echo ✅ 配置完成！
    echo.
    echo 已更新 CORS 配置

) else (
    echo 无效的选项
    exit /b 1
)

echo.
echo ======================================
echo 配置文件位置：
echo   后端: .env
echo   前端: frontend\.env
echo ======================================
echo.
pause
