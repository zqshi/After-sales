#!/bin/bash

# 创建测试数据库的脚本

echo "创建测试数据库..."

# 从.env.test读取数据库配置
if [ -f .env.test ]; then
  export $(cat .env.test | grep -v '^#' | xargs)
fi

# 默认配置
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USER:-admin}
DB_PASSWORD=${DATABASE_PASSWORD:-admin123}
DB_NAME=${DATABASE_NAME:-aftersales_test}

echo "数据库配置:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"

# 检查PostgreSQL是否运行
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
  echo "错误: PostgreSQL未运行或无法连接"
  echo "请确保PostgreSQL服务已启动"
  exit 1
fi

# 创建测试数据库
echo "创建数据库 $DB_NAME..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ 数据库创建成功"
else
  echo "⚠️  数据库可能已存在，继续..."
fi

# 运行迁移
echo "运行数据库迁移..."
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npm run migration:run

echo "✅ 测试数据库设置完成！"
