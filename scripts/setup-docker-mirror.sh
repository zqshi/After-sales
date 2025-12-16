#!/bin/bash
# Docker 镜像加速器配置脚本

echo "🔧 Docker 镜像加速器配置工具"
echo "================================"
echo ""

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 检测到 macOS 系统"
    echo ""
    echo "请手动配置 Docker Desktop："
    echo "1. 打开 Docker Desktop"
    echo "2. Settings -> Docker Engine"
    echo "3. 添加以下配置到 JSON 中："
    echo ""
    cat <<'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
    echo ""
    echo "4. 点击 Apply & Restart"
    echo ""
    echo "⏳ 配置完成后，按回车继续测试..."
    read -r

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 检测到 Linux 系统"
    echo ""
    echo "正在配置 Docker daemon..."

    # 备份原配置
    if [ -f /etc/docker/daemon.json ]; then
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup
        echo "✅ 已备份原配置到 /etc/docker/daemon.json.backup"
    fi

    # 创建新配置
    sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF

    echo "✅ 配置文件已更新"
    echo ""
    echo "正在重启 Docker 服务..."
    sudo systemctl restart docker
    echo "✅ Docker 服务已重启"
fi

echo ""
echo "🧪 测试镜像拉取..."
echo "================================"
echo ""

# 测试拉取小镜像
echo "📥 测试拉取 alpine 镜像..."
if docker pull alpine:latest; then
    echo "✅ 镜像拉取成功！"
    echo ""
    echo "现在可以尝试拉取项目所需的镜像："
    echo "  docker pull postgres:15-alpine"
    echo "  docker pull redis:7-alpine"
    echo "  docker pull prom/prometheus:latest"
    echo "  docker pull grafana/grafana:latest"
    echo "  docker pull nginx:alpine"
else
    echo "❌ 镜像拉取失败"
    echo ""
    echo "如果问题仍然存在，请尝试："
    echo "1. 检查网络连接"
    echo "2. 检查 Docker 是否正在运行"
    echo "3. 尝试使用 VPN"
    echo "4. 使用国内云服务商的容器镜像服务"
fi

echo ""
echo "完成！"
