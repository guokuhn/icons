#!/bin/bash

# Figma 配置诊断脚本

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Figma 配置诊断 ===${NC}"
echo ""

# 读取 .env 文件
if [ -f .env ]; then
  source .env
  echo -e "${GREEN}✓ 找到 .env 文件${NC}"
else
  echo -e "${RED}✗ 未找到 .env 文件${NC}"
  exit 1
fi

# 检查 FIGMA_API_TOKEN
echo ""
echo "1. 检查 FIGMA_API_TOKEN..."
if [ -z "$FIGMA_API_TOKEN" ]; then
  echo -e "${RED}✗ FIGMA_API_TOKEN 未设置${NC}"
  exit 1
else
  echo -e "${GREEN}✓ FIGMA_API_TOKEN 已设置${NC}"
  echo "   Token: ${FIGMA_API_TOKEN:0:20}..."
fi

# 检查 FIGMA_FILE_ID
echo ""
echo "2. 检查 FIGMA_FILE_ID..."
if [ -z "$FIGMA_FILE_ID" ]; then
  echo -e "${RED}✗ FIGMA_FILE_ID 未设置${NC}"
  exit 1
else
  echo -e "${GREEN}✓ FIGMA_FILE_ID 已设置${NC}"
  echo "   File ID: $FIGMA_FILE_ID"
fi

# 测试 Figma API 连接
echo ""
echo "3. 测试 Figma API 连接..."
response=$(curl -s -w "\n%{http_code}" \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✓ 成功连接到 Figma API${NC}"
  
  # 显示文件信息
  file_name=$(echo "$body" | jq -r '.name // "未知"')
  last_modified=$(echo "$body" | jq -r '.lastModified // "未知"')
  echo "   文件名: $file_name"
  echo "   最后修改: $last_modified"
  
  # 查找组件
  echo ""
  echo "4. 查找图标组件..."
  components=$(echo "$body" | jq -r '.components // {} | length')
  echo "   找到 $components 个组件"
  
  if [ "$components" -gt 0 ]; then
    echo ""
    echo "   组件列表:"
    echo "$body" | jq -r '.components | to_entries[] | "   - \(.value.name) (ID: \(.key))"' | head -10
    
    if [ "$components" -gt 10 ]; then
      echo "   ... 还有 $((components - 10)) 个组件"
    fi
  else
    echo -e "${YELLOW}   ⚠ 未找到任何组件${NC}"
    echo "   提示: 确保 Figma 文件中有组件（Components）"
  fi
  
  echo ""
  echo -e "${GREEN}✓ 诊断完成！配置正确。${NC}"
  echo ""
  echo "你可以运行以下命令开始同步:"
  echo -e "${BLUE}  ./sync-figma.sh full gd${NC}"
  
elif [ "$http_code" -eq 403 ]; then
  echo -e "${RED}✗ 权限被拒绝 (403)${NC}"
  echo "   可能的原因:"
  echo "   1. FIGMA_API_TOKEN 无效或已过期"
  echo "   2. 没有访问此文件的权限"
  echo ""
  echo "   解决方法:"
  echo "   1. 在 Figma 中生成新的 Personal Access Token"
  echo "   2. 确保你有访问该文件的权限"
  
elif [ "$http_code" -eq 404 ]; then
  echo -e "${RED}✗ 文件未找到 (404)${NC}"
  echo "   FIGMA_FILE_ID 可能不正确"
  echo ""
  echo "   当前 File ID: $FIGMA_FILE_ID"
  echo ""
  echo "   如何获取正确的 File ID:"
  echo "   1. 在浏览器中打开你的 Figma 文件"
  echo "   2. 查看 URL，格式为:"
  echo "      https://www.figma.com/file/FILE_ID/File-Name"
  echo "   3. 复制 FILE_ID 部分（通常是一串字母和数字）"
  echo "   4. 更新 .env 文件中的 FIGMA_FILE_ID"
  
else
  echo -e "${RED}✗ 连接失败 (HTTP $http_code)${NC}"
  echo ""
  echo "响应内容:"
  echo "$body" | jq -r '.err // .message // .' 2>/dev/null || echo "$body"
fi
