#!/bin/bash

# 等待并同步脚本 - 处理 Figma API 速率限制

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MODE=${1:-full}
NAMESPACE=${2:-gd}
API_KEY=${API_KEY:-dev-api-key-12345}
API_URL=${API_URL:-http://localhost:3000}

echo -e "${BLUE}=== Figma 图标同步（智能重试）===${NC}"
echo ""

# 检查服务是否运行
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo -e "${RED}✗ API 服务未运行${NC}"
  echo "请先启动服务: npm run dev"
  exit 1
fi

echo -e "${GREEN}✓ API 服务正在运行${NC}"
echo ""

# 最多重试次数
MAX_RETRIES=5
RETRY_COUNT=0
WAIT_TIME=60  # 初始等待时间（秒）

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo -e "${YELLOW}🔄 尝试同步 (第 $((RETRY_COUNT + 1)) 次)...${NC}"
  
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
    
    # 显示结果
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
    
    echo ""
    echo -e "${GREEN}✓ 完成！${NC}"
    exit 0
    
  elif [ "$http_code" -eq 500 ]; then
    # 检查是否是速率限制错误
    error_msg=$(echo "$body" | jq -r '.error.message // ""')
    
    if echo "$error_msg" | grep -qi "rate limit\|429"; then
      echo -e "${YELLOW}⚠ Figma API 速率限制${NC}"
      
      if [ $RETRY_COUNT -lt $((MAX_RETRIES - 1)) ]; then
        echo "等待 $WAIT_TIME 秒后重试..."
        echo ""
        
        # 显示倒计时
        for i in $(seq $WAIT_TIME -1 1); do
          printf "\r剩余时间: %02d 秒" $i
          sleep 1
        done
        printf "\r                    \r"
        
        # 增加等待时间（指数退避）
        WAIT_TIME=$((WAIT_TIME * 2))
        if [ $WAIT_TIME -gt 300 ]; then
          WAIT_TIME=300  # 最多等待 5 分钟
        fi
      else
        echo -e "${RED}✗ 已达到最大重试次数${NC}"
        echo ""
        echo "Figma API 速率限制仍然生效。"
        echo "请稍后再试，或者："
        echo "  1. 等待 5-10 分钟"
        echo "  2. 使用增量同步: ./wait-and-sync.sh incremental gd"
        exit 1
      fi
    else
      echo -e "${RED}✗ 同步失败${NC}"
      echo ""
      echo "错误信息:"
      echo "$body" | jq -r '.error.message // .'
      exit 1
    fi
  else
    echo -e "${RED}✗ 同步失败 (HTTP $http_code)${NC}"
    echo ""
    echo "错误详情:"
    echo "$body" | jq -r '.error.message // .'
    exit 1
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo -e "${RED}✗ 同步失败：已达到最大重试次数${NC}"
exit 1
