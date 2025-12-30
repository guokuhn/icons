#!/bin/bash

# 快速同步脚本 - 启动服务并同步 Figma 图标

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Figma 图标快速同步 ===${NC}"
echo ""

# 检查服务是否运行
if pgrep -f "tsx.*index.ts" > /dev/null || pgrep -f "node.*index.js" > /dev/null; then
  echo -e "${YELLOW}⚠ API 服务正在运行${NC}"
  echo "正在重启服务以加载新配置..."
  pkill -f "tsx.*index.ts"
  pkill -f "node.*index.js"
  sleep 2
fi

# 启动服务
echo -e "${GREEN}▶ 启动 API 服务...${NC}"
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

# 等待服务启动
echo "等待服务启动..."
for i in {1..10}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 服务已启动${NC}"
    break
  fi
  if [ $i -eq 10 ]; then
    echo -e "${RED}✗ 服务启动超时${NC}"
    exit 1
  fi
  sleep 1
  echo -n "."
done

echo ""
echo -e "${GREEN}▶ 开始同步 Figma 图标...${NC}"
echo ""

# 执行同步
./sync-figma.sh full gd

echo ""
echo -e "${BLUE}提示: API 服务正在后台运行 (PID: $SERVER_PID)${NC}"
echo "你可以使用以下命令:"
echo "  - 查看日志: tail -f logs/combined.log"
echo "  - 停止服务: pkill -f 'tsx.*index.ts'"
echo "  - 查看健康状态: curl http://localhost:3000/health"
