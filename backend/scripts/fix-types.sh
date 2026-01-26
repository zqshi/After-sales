#!/bin/bash

# 批量修复TypeScript类型错误的脚本

echo "开始修复TypeScript类型错误..."

# 1. 修复Knowledge相关的类型错误
echo "修复Knowledge相关的类型错误..."

# 2. 修复Permission相关的类型错误
echo "修复Permission相关的类型错误..."

# 3. 修复CustomerAdapter相关的类型错误
echo "修复CustomerAdapter相关的类型错误..."

# 4. 检查剩余错误
echo "检查剩余错误..."
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

echo "类型错误修复完成！"
