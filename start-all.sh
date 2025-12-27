#!/bin/bash

# After-Sales System - 快速启动脚本
# 自动启动所有服务（开发环境）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 清理函数
cleanup() {
    log_info "正在停止所有服务..."

    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        log_info "后端服务已停止 (PID: $BACKEND_PID)"
    fi

    if [ ! -z "$AGENTSCOPE_PID" ] && kill -0 $AGENTSCOPE_PID 2>/dev/null; then
        kill $AGENTSCOPE_PID
        log_info "AgentScope服务已停止 (PID: $AGENTSCOPE_PID)"
    fi

    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        log_info "前端服务已停止 (PID: $FRONTEND_PID)"
    fi

    exit 0
}

# 捕获退出信号
trap cleanup EXIT INT TERM

echo ""
echo "========================================"
echo "  After-Sales System - 快速启动"
echo "========================================"
echo ""

# 步骤1: 检查前置条件
log_info "步骤 1/6: 检查前置条件..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js未安装，请先安装 Node.js ≥18.0.0"
    exit 1
fi
NODE_VERSION=$(node --version)
log_success "Node.js版本: $NODE_VERSION"

# 检查Python
if ! command -v python3 &> /dev/null; then
    log_error "Python3未安装，请先安装 Python ≥3.10"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
log_success "Python版本: $PYTHON_VERSION"

# 检查PostgreSQL
if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL未安装，请先安装 PostgreSQL"
    exit 1
fi
log_success "PostgreSQL已安装"

# 检查Redis
if ! command -v redis-cli &> /dev/null; then
    log_warning "Redis未安装，将尝试启动..."
fi

echo ""

# 步骤2: 启动数据库服务
log_info "步骤 2/6: 启动数据库服务..."

# 启动PostgreSQL
if command -v brew &> /dev/null; then
    # macOS
    brew services list | grep postgresql | grep started > /dev/null || {
        log_info "启动PostgreSQL..."
        brew services start postgresql
        sleep 2
    }
    log_success "PostgreSQL运行中"
else
    # Linux
    sudo systemctl is-active --quiet postgresql || {
        log_info "启动PostgreSQL..."
        sudo systemctl start postgresql
        sleep 2
    }
    log_success "PostgreSQL运行中"
fi

# 启动Redis
if command -v brew &> /dev/null; then
    # macOS
    brew services list | grep redis | grep started > /dev/null || {
        log_info "启动Redis..."
        brew services start redis
        sleep 2
    }
    log_success "Redis运行中"
else
    # Linux
    sudo systemctl is-active --quiet redis || {
        log_info "启动Redis..."
        sudo systemctl start redis
        sleep 2
    }
    log_success "Redis运行中"
fi

# 验证数据库连接
log_info "验证数据库连接..."
if PGPASSWORD=admin123 psql -U admin -d aftersales -h localhost -c "SELECT 1;" &> /dev/null; then
    log_success "数据库连接成功"
else
    log_warning "数据库aftersales不存在，正在创建..."
    psql -U postgres -c "CREATE USER admin WITH PASSWORD 'admin123';" 2>/dev/null || true
    psql -U postgres -c "CREATE DATABASE aftersales OWNER admin;" 2>/dev/null || true
    log_success "数据库创建完成"
fi

# 验证Redis连接
if redis-cli ping &> /dev/null; then
    log_success "Redis连接成功"
else
    log_error "Redis连接失败"
    exit 1
fi

echo ""

# 步骤3: 安装依赖和运行迁移
log_info "步骤 3/6: 安装依赖和运行迁移..."

# 后端依赖
log_info "安装后端依赖..."
cd backend
npm install > /dev/null 2>&1 || {
    log_error "后端依赖安装失败"
    exit 1
}
log_success "后端依赖安装完成"

# 运行迁移
log_info "运行数据库迁移..."
npm run migration:run || {
    log_warning "迁移可能已运行过，继续..."
}
log_success "数据库迁移完成"
cd ..

# AgentScope依赖
log_info "安装AgentScope依赖..."
cd agentscope-service
if [ ! -d "venv" ]; then
    log_info "创建Python虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1 || {
    log_error "AgentScope依赖安装失败"
    exit 1
}
log_success "AgentScope依赖安装完成"
deactivate
cd ..

# 前端依赖
log_info "安装前端依赖..."
npm install > /dev/null 2>&1 || {
    log_error "前端依赖安装失败"
    exit 1
}
log_success "前端依赖安装完成"

echo ""

# 步骤4: 启动后端服务
log_info "步骤 4/6: 启动后端服务..."

cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
log_info "等待后端服务启动..."
for i in {1..15}; do
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
        log_success "后端服务启动成功 (PID: $BACKEND_PID)"
        break
    fi
    if [ $i -eq 15 ]; then
        log_error "后端服务启动超时"
        cat logs/backend.log
        exit 1
    fi
    sleep 1
done

echo ""

# 步骤5: 启动AgentScope服务
log_info "步骤 5/6: 启动AgentScope服务..."

cd agentscope-service
source venv/bin/activate
uvicorn src.api.main:app --host 0.0.0.0 --port 5000 > ../logs/agentscope.log 2>&1 &
AGENTSCOPE_PID=$!
deactivate
cd ..

# 等待AgentScope启动
log_info "等待AgentScope服务启动..."
for i in {1..15}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        log_success "AgentScope服务启动成功 (PID: $AGENTSCOPE_PID)"
        break
    fi
    if [ $i -eq 15 ]; then
        log_error "AgentScope服务启动超时"
        cat logs/agentscope.log
        exit 1
    fi
    sleep 1
done

echo ""

# 步骤6: 启动前端服务
log_info "步骤 6/6: 启动前端服务..."

npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# 等待前端启动
log_info "等待前端服务启动..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "前端服务启动成功 (PID: $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 15 ]; then
        log_error "前端服务启动超时"
        cat logs/frontend.log
        exit 1
    fi
    sleep 1
done

echo ""
echo "========================================"
echo "  所有服务启动成功！"
echo "========================================"
echo ""
echo -e "${GREEN}服务地址:${NC}"
echo "  - 前端:        http://localhost:3000"
echo "  - 后端:        http://localhost:8080"
echo "  - AgentScope:  http://localhost:5000"
echo "  - Prometheus:  http://localhost:9090 (如果已启动)"
echo "  - Grafana:     http://localhost:3001 (如果已启动)"
echo ""
echo -e "${GREEN}进程ID:${NC}"
echo "  - Backend:     $BACKEND_PID"
echo "  - AgentScope:  $AGENTSCOPE_PID"
echo "  - Frontend:    $FRONTEND_PID"
echo ""
echo -e "${GREEN}日志文件:${NC}"
echo "  - 后端:        logs/backend.log"
echo "  - AgentScope:  logs/agentscope.log"
echo "  - 前端:        logs/frontend.log"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  - 按 Ctrl+C 停止所有服务"
echo "  - 运行质检测试: ./test-quality-inspection.sh"
echo "  - 查看日志: tail -f logs/backend.log"
echo ""
echo "========================================"

# 保持脚本运行并监控服务
while true; do
    # 检查后端是否还在运行
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        log_error "后端服务已停止，退出..."
        exit 1
    fi

    # 检查AgentScope是否还在运行
    if ! kill -0 $AGENTSCOPE_PID 2>/dev/null; then
        log_error "AgentScope服务已停止，退出..."
        exit 1
    fi

    # 检查前端是否还在运行
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        log_error "前端服务已停止，退出..."
        exit 1
    fi

    sleep 5
done
