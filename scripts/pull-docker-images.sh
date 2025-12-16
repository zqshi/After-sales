#!/bin/bash
# 批量拉取 Docker 镜像脚本（带重试机制）

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 After-Sales Docker 镜像拉取脚本${NC}"
echo "================================"
echo ""

# 定义需要的镜像列表
declare -a images=(
    "postgres:15-alpine"
    "redis:7-alpine"
    "prom/prometheus:latest"
    "grafana/grafana:latest"
    "nginx:alpine"
    "node:18-alpine"
)

# 重试配置
MAX_RETRIES=3
RETRY_DELAY=5

# 拉取单个镜像的函数
pull_image() {
    local image=$1
    local retry_count=0

    echo -e "${BLUE}📥 正在拉取: ${image}${NC}"

    while [ $retry_count -lt $MAX_RETRIES ]; do
        if docker pull "$image"; then
            echo -e "${GREEN}✅ 成功: ${image}${NC}"
            echo ""
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}⚠️  失败，${RETRY_DELAY}秒后重试 (${retry_count}/${MAX_RETRIES})...${NC}"
                sleep $RETRY_DELAY
            else
                echo -e "${RED}❌ 失败: ${image} (已重试 ${MAX_RETRIES} 次)${NC}"
                echo ""
                return 1
            fi
        fi
    done
}

# 统计
total_images=${#images[@]}
successful=0
failed=0
failed_images=()

echo -e "需要拉取 ${total_images} 个镜像"
echo ""

# 拉取所有镜像
for image in "${images[@]}"; do
    if pull_image "$image"; then
        successful=$((successful + 1))
    else
        failed=$((failed + 1))
        failed_images+=("$image")
    fi
done

# 输出结果
echo "================================"
echo -e "${BLUE}📊 拉取结果统计${NC}"
echo "================================"
echo -e "${GREEN}✅ 成功: ${successful}/${total_images}${NC}"

if [ $failed -gt 0 ]; then
    echo -e "${RED}❌ 失败: ${failed}/${total_images}${NC}"
    echo ""
    echo -e "${YELLOW}失败的镜像：${NC}"
    for image in "${failed_images[@]}"; do
        echo "  - $image"
    done
    echo ""
    echo -e "${YELLOW}💡 建议：${NC}"
    echo "1. 配置 Docker 镜像加速器（运行 ./scripts/setup-docker-mirror.sh）"
    echo "2. 检查网络连接"
    echo "3. 如果在中国大陆，考虑使用 VPN"
    echo "4. 使用云服务商提供的容器镜像服务"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 所有镜像拉取成功！${NC}"
    echo ""
    echo "现在可以运行："
    echo "  docker-compose up -d"
    echo ""
    exit 0
fi
