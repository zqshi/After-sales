#!/bin/bash

# After-Sales System - Docker 启动脚本
# 使用 Docker Compose 启动全部服务

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

compose_cmd() {
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        echo "docker compose"
        return
    fi
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
        return
    fi
    echo ""
}

COMPOSE=$(compose_cmd)
if [ -z "$COMPOSE" ]; then
    log_error "未检测到 Docker Compose，请安装 Docker Desktop 或 docker-compose"
    exit 1
fi

echo ""
echo "========================================"
echo "  After-Sales System - Docker 启动"
echo "========================================"
echo ""

log_info "使用命令: $COMPOSE"
log_info "启动全部服务..."

$COMPOSE up -d --build

log_info "当前服务状态:"
$COMPOSE ps

echo ""
echo "========================================"
echo "  所有服务已启动"
echo "========================================"
echo ""
echo -e "${GREEN}服务地址:${NC}"
echo "  - 前端:        http://localhost:3000"
echo "  - 后端:        http://localhost:8080"
echo "  - AgentScope:  http://localhost:5000"
echo "  - Prometheus:  http://localhost:9090"
echo "  - Grafana:     http://localhost:3001"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  - 查看日志:   $COMPOSE logs -f"
echo "  - 停止服务:   ./stop-all.sh"
echo ""
