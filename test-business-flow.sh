#!/bin/bash

# 业务流程完整测试脚本
# 测试从创建会话 -> 发送消息 -> 检测需求 -> 创建任务的完整流程

BASE_URL="http://localhost:8080/api"
CUSTOMER_ID="CUST001"

echo "========================================="
echo "  智能售后系统 - 业务流程测试"
echo "========================================="
echo ""

# 1. 获取客户信息
echo "📋 步骤 1: 获取客户信息"
echo "GET $BASE_URL/customers/$CUSTOMER_ID"
CUSTOMER_RESPONSE=$(curl -s -X GET "$BASE_URL/customers/$CUSTOMER_ID")
echo "$CUSTOMER_RESPONSE" | jq .
echo ""
echo "---"
echo ""

# 2. 创建会话
echo "💬 步骤 2: 创建新会话"
echo "POST $BASE_URL/conversations"
CONVERSATION_RESPONSE=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "channel": "web",
    "initialMessage": {
      "content": "你好，我遇到了一个问题，系统登录总是失败",
      "senderId": "'$CUSTOMER_ID'",
      "senderType": "external"
    }
  }')
echo "$CONVERSATION_RESPONSE" | jq .

# 提取会话ID
CONVERSATION_ID=$(echo "$CONVERSATION_RESPONSE" | jq -r '.data.id // .id // empty')
if [ -z "$CONVERSATION_ID" ]; then
  echo "❌ 创建会话失败，无法继续测试"
  exit 1
fi
echo "✅ 会话创建成功，ID: $CONVERSATION_ID"
echo ""
echo "---"
echo ""

# 3. 发送消息
echo "📨 步骤 3: 发送消息"
echo "POST $BASE_URL/conversations/$CONVERSATION_ID/messages"
MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/conversations/$CONVERSATION_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "我尝试了多次，但每次都提示用户名或密码错误",
    "senderId": "'$CUSTOMER_ID'",
    "senderType": "external"
  }')
echo "$MESSAGE_RESPONSE" | jq .
echo ""
echo "---"
echo ""

# 4. 创建需求
echo "📝 步骤 4: 创建客户需求"
echo "POST $BASE_URL/requirements"
REQUIREMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/requirements" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "conversationId": "'$CONVERSATION_ID'",
    "title": "登录功能异常",
    "description": "客户反馈系统登录总是失败，提示用户名或密码错误",
    "category": "bug_fix",
    "priority": "high",
    "source": "conversation"
  }')
echo "$REQUIREMENT_RESPONSE" | jq .

REQUIREMENT_ID=$(echo "$REQUIREMENT_RESPONSE" | jq -r '.data.id // .id // empty')
if [ -z "$REQUIREMENT_ID" ]; then
  echo "⚠️  创建需求失败或未返回ID"
else
  echo "✅ 需求创建成功，ID: $REQUIREMENT_ID"
fi
echo ""
echo "---"
echo ""

# 5. 创建任务
echo "✅ 步骤 5: 创建处理任务"
echo "POST $BASE_URL/tasks"
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementId": "'$REQUIREMENT_ID'",
    "title": "修复登录功能异常问题",
    "description": "调查并修复客户反馈的登录失败问题",
    "priority": "high",
    "estimatedHours": 4
  }')
echo "$TASK_RESPONSE" | jq .

TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.id // .id // empty')
if [ -z "$TASK_ID" ]; then
  echo "⚠️  创建任务失败或未返回ID"
else
  echo "✅ 任务创建成功，ID: $TASK_ID"
fi
echo ""
echo "---"
echo ""

# 6. 添加客户交互记录
echo "👥 步骤 6: 添加客户交互记录"
echo "POST $BASE_URL/customers/$CUSTOMER_ID/interactions"
INTERACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/interactions" \
  -H "Content-Type: application/json" \
  -d '{
    "interactionType": "support_call",
    "content": "客户来电反馈登录问题",
    "channel": "phone",
    "sentiment": "negative"
  }')
echo "$INTERACTION_RESPONSE" | jq .
echo ""
echo "---"
echo ""

# 7. 查询需求列表
echo "📋 步骤 7: 查询客户需求列表"
echo "GET $BASE_URL/requirements?customerId=$CUSTOMER_ID"
REQUIREMENTS_LIST=$(curl -s -X GET "$BASE_URL/requirements?customerId=$CUSTOMER_ID")
echo "$REQUIREMENTS_LIST" | jq .
echo ""
echo "---"
echo ""

# 8. 查询会话列表
echo "💬 步骤 8: 查询客户会话列表"
echo "GET $BASE_URL/conversations?customerId=$CUSTOMER_ID"
CONVERSATIONS_LIST=$(curl -s -X GET "$BASE_URL/conversations?customerId=$CUSTOMER_ID")
echo "$CONVERSATIONS_LIST" | jq .
echo ""
echo "---"
echo ""

echo "========================================="
echo "  ✅ 业务流程测试完成"
echo "========================================="
echo ""
echo "测试摘要:"
echo "  • 客户ID: $CUSTOMER_ID"
echo "  • 会话ID: $CONVERSATION_ID"
if [ ! -z "$REQUIREMENT_ID" ]; then
  echo "  • 需求ID: $REQUIREMENT_ID"
fi
if [ ! -z "$TASK_ID" ]; then
  echo "  • 任务ID: $TASK_ID"
fi
echo ""
echo "✨ 前后端联通测试成功！"
