#!/bin/bash

# Figma 图标同步脚本
# 用法: ./sync-figma.sh [mode] [namespace]
# mode: full (完全同步) 或 incremental (增量同步)，默认为 full
# namespace: 目标命名空间，默认为 gd

# 设置默认值
MODE=${1:-full}
NAMESPACE=${2:-gd}
API_KEY=${API_KEY:-dev-api-key-12345}
API_URL=${API_URL:-http://localhost:3000}

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 开始从 Figma 同步图标...${NC}"
echo "同步模式: $MODE"
echo "目标命名空间: $NAMESPACE"
echo ""

# 发送同步请求
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  "$API_URL/api/sync/figma?mode=$MODE&namespace=$NAMESPACE")

# 分离响应体和状态码
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# 检查状态码
if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✓ 同步成功！${NC}"
  echo ""
  
  # 解析并显示结果
  echo "$body" | jq -r '
    "同步结果:",
    "  成功: \(.data.successCount) 个图标",
    "  失败: \(.data.failedCount) 个图标",
    "  总计: \(.data.totalProcessed) 个图标",
    "",
    (if .data.errors | length > 0 then
      "错误详情:",
      (.data.errors[] | "  - \(.componentId): \(.error)")
    else
      "没有错误 ✓"
    end)
  '
else
  echo -e "${RED}✗ 同步失败 (HTTP $http_code)${NC}"
  echo ""
  echo "错误详情:"
  echo "$body" | jq -r '.error.message // .'
  exit 1
fi

echo ""
echo -e "${GREEN}✓ 完成！${NC}"
echo "你现在可以在 React 应用中使用这些图标了。"
