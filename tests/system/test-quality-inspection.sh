#!/bin/bash

# ===================================================================
# 质检集成测试脚本
# ===================================================================
# 功能：测试对话关闭后自动触发质检的完整流程
# 依赖：Backend服务 + AgentScope服务 + PostgreSQL + Redis
# 使用：./tests/system/test-quality-inspection.sh
# ===================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

# 配置
BACKEND_URL="${BACKEND_URL:-http://localhost:8080/api/v1}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:8080}"
AGENTSCOPE_URL="${AGENTSCOPE_URL:-http://localhost:5000}"
AUTH_EMAIL="${AUTH_EMAIL:-demo@aftersales.io}"
AUTH_PASSWORD="${AUTH_PASSWORD:-Demo@1234}"
BACKEND_TOKEN="${BACKEND_TOKEN:-}"
PYTHON_BIN="${PYTHON_BIN:-}"

if [ -z "$PYTHON_BIN" ]; then
    if command -v python3 > /dev/null 2>&1; then
        PYTHON_BIN=python3
    elif command -v python > /dev/null 2>&1; then
        PYTHON_BIN=python
    else
        echo -e "${RED}错误: 需要 python3 或 python 用于计时${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}质检集成测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ===================================================================
# 函数定义
# ===================================================================

# 检查服务健康状态
check_service() {
    local service_name=$1
    local url=$2

    echo -n "检查${service_name}服务..."
    if curl -f -s "${url}/health" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        return 0
    else
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}错误: ${service_name}服务不可用${NC}"
        return 1
    fi
}

# 登录获取 Token
login_backend() {
    if [ -n "$BACKEND_TOKEN" ]; then
        AUTH_HEADER="Authorization: Bearer ${BACKEND_TOKEN}"
        return 0
    fi

    echo -n "登录Backend获取Token..."
    LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"identifier\": \"${AUTH_EMAIL}\",
            \"password\": \"${AUTH_PASSWORD}\"
        }")

    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}错误: 登录失败，请设置 BACKEND_TOKEN 或检查账号密码${NC}"
        echo "$LOGIN_RESPONSE"
        exit 1
    fi

    AUTH_HEADER="Authorization: Bearer ${TOKEN}"

    PROFILE_RESPONSE=$(curl -s -H "${AUTH_HEADER}" "${BACKEND_URL}/api/auth/me")
    AGENT_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.data.id')
    if [ "$AGENT_ID" = "null" ] || [ -z "$AGENT_ID" ]; then
        AGENT_ID="agent-001"
    fi

    echo -e " ${GREEN}✓${NC}"
}

# 创建对话
create_conversation() {
    echo -n "创建测试对话..."

    CONV_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/conversations" \
        -H "Content-Type: application/json" \
        -H "${AUTH_HEADER}" \
        -d '{
            "customerId": "test-customer-001",
            "agentId": "'"${AGENT_ID:-agent-001}"'",
            "channel": "web",
            "title": "质检测试对话"
        }')

    CONV_ID=$(echo $CONV_RESPONSE | jq -r '.data.id')

    if [ "$CONV_ID" = "null" ] || [ -z "$CONV_ID" ]; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}错误: 创建对话失败${NC}"
        echo "$CONV_RESPONSE"
        exit 1
    fi

    echo -e " ${GREEN}✓${NC} (ID: ${CONV_ID})"
}

# 发送消息
send_message() {
    local role=$1
    local content=$2

    echo -n "发送消息 (${role})..."

    local sender_type="external"
    local sender_id="test-customer-001"
    if [ "${role}" = "assistant" ]; then
        sender_type="internal"
        sender_id="${AGENT_ID:-agent-001}"
    fi

    MSG_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/conversations/${CONV_ID}/messages" \
        -H "Content-Type: application/json" \
        -H "${AUTH_HEADER}" \
        -d "{
            \"senderId\": \"${sender_id}\",
            \"senderType\": \"${sender_type}\",
            \"content\": \"${content}\"
        }")

    if echo "$MSG_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
    else
        echo -e " ${YELLOW}⚠${NC}"
    fi
}

# 关闭对话
close_conversation() {
    echo -n "关闭对话..."

    START_TIME=$($PYTHON_BIN - <<'PY'
import time
print(int(time.time() * 1000))
PY
)

    CLOSE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/conversations/${CONV_ID}/close" \
        -H "Content-Type: application/json" \
        -H "${AUTH_HEADER}" \
        -d '{"closedBy": "user"}')

    END_TIME=$($PYTHON_BIN - <<'PY'
import time
print(int(time.time() * 1000))
PY
)
    CLOSE_DURATION=$((END_TIME - START_TIME))

    if echo "$CLOSE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC} (耗时: ${CLOSE_DURATION}ms)"

        if [ $CLOSE_DURATION -lt 500 ]; then
            echo -e "${GREEN}✓ 对话关闭延迟 < 500ms 测试通过${NC}"
        else
            echo -e "${YELLOW}⚠ 对话关闭延迟 > 500ms (${CLOSE_DURATION}ms)${NC}"
        fi
    else
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}错误: 关闭对话失败${NC}"
        echo "$CLOSE_RESPONSE"
        exit 1
    fi
}

# 等待质检完成
wait_for_inspection() {
    echo -n "等待质检完成 (最多30秒)..."

    for i in {1..30}; do
        sleep 1
        echo -n "."

        # 查询质检报告
        REPORT_RESPONSE=$(curl -s -H "${AUTH_HEADER}" "${BACKEND_URL}/quality/${CONV_ID}/reports")

        if echo "$REPORT_RESPONSE" | jq -e '.data.reports[0]' > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            QUALITY_SCORE=$(echo "$REPORT_RESPONSE" | jq -r '.data.reports[0].qualityScore')
            echo -e "${GREEN}✓ 质检已完成，质量分: ${QUALITY_SCORE}${NC}"
            return 0
        fi
    done

    echo -e " ${RED}✗${NC}"
    echo -e "${RED}错误: 质检超时${NC}"
    return 1
}

# 验证质检报告
verify_report() {
    echo -n "验证质检报告..."

    REPORT_RESPONSE=$(curl -s -H "${AUTH_HEADER}" "${BACKEND_URL}/quality/${CONV_ID}/reports")

    # 验证报告结构
    if ! echo "$REPORT_RESPONSE" | jq -e '.data.reports[0].qualityScore' > /dev/null 2>&1; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}错误: 质检报告缺少quality_score字段${NC}"
        return 1
    fi

    if ! echo "$REPORT_RESPONSE" | jq -e '.data.reports[0].report' > /dev/null 2>&1; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}错误: 质检报告缺少dimensions字段${NC}"
        return 1
    fi

    echo -e " ${GREEN}✓${NC}"

    # 输出报告详情
    echo ""
    echo "质检报告详情:"
    echo "----------------------------------------"
    echo "$REPORT_RESPONSE" | jq '.data.reports[0]' | while IFS= read -r line; do
        echo "  $line"
    done
    echo "----------------------------------------"
}

# ===================================================================
# 主流程
# ===================================================================

main() {
    echo "Step 1: 检查服务状态"
    echo "----------------------------------------"
    check_service "Backend" "$BACKEND_HEALTH_URL" || exit 1
    check_service "AgentScope" "$AGENTSCOPE_URL" || exit 1
    echo ""

    echo "Step 2: 创建测试对话"
    echo "----------------------------------------"
    login_backend
    create_conversation
    echo ""

    echo "Step 3: 模拟对话"
    echo "----------------------------------------"
    send_message "user" "系统报错了，怎么办？"
    send_message "user" "错误码为 500。"
    send_message "user" "影响登录功能。"
    send_message "user" "希望尽快恢复。"
    echo ""

    echo "Step 4: 关闭对话（触发质检）"
    echo "----------------------------------------"
    close_conversation
    echo ""

    echo "Step 5: 等待质检完成"
    echo "----------------------------------------"
    wait_for_inspection || exit 1
    echo ""

    echo "Step 6: 验证质检报告"
    echo "----------------------------------------"
    verify_report || exit 1
    echo ""

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ 质检集成测试全部通过${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# 执行主流程
main

# 清理（可选）
# echo ""
# echo "清理测试数据..."
# curl -s -X DELETE "${BACKEND_URL}/api/conversations/${CONV_ID}" > /dev/null
# echo "完成"
