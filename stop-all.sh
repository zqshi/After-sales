#!/bin/bash

# After-Sales System - 停止所有服务脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo ""
echo "========================================"
echo "  After-Sales System - 停止所有服务"
echo "========================================"
echo ""

log_info "正在查找运行中的服务进程..."

# 停止Node后端
BACKEND_PIDS=$(lsof -ti :8080 2>/dev/null || true)
if [ ! -z "$BACKEND_PIDS" ]; then
    log_info "停止后端服务..."
    kill $BACKEND_PIDS 2>/dev/null || true
    log_success "后端服务已停止"
else
    log_info "后端服务未运行"
fi

# 停止AgentScope
AGENTSCOPE_PIDS=$(lsof -ti :5000 2>/dev/null || true)
if [ ! -z "$AGENTSCOPE_PIDS" ]; then
    log_info "停止AgentScope服务..."
    kill $AGENTSCOPE_PIDS 2>/dev/null || true
    log_success "AgentScope服务已停止"
else
    log_info "AgentScope服务未运行"
fi

# 停止前端
FRONTEND_PIDS=$(lsof -ti :3000 2>/dev/null || true)
if [ ! -z "$FRONTEND_PIDS" ]; then
    log_info "停止前端服务..."
    kill $FRONTEND_PIDS 2>/dev/null || true
    log_success "前端服务已停止"
else
    log_info "前端服务未运行"
fi

# 可选：停止数据库服务
read -p "是否停止数据库服务 (PostgreSQL/Redis)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v brew &> /dev/null; then
        # macOS
        brew services stop postgresql
        brew services stop redis
        log_success "数据库服务已停止"
    else
        # Linux
        sudo systemctl stop postgresql
        sudo systemctl stop redis
        log_success "数据库服务已停止"
    fi
fi

echo ""
echo "========================================"
echo "  所有服务已停止"
echo "========================================"
echo ""
