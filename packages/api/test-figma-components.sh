#!/bin/bash

# 测试脚本：直接从 Figma API 获取所有组件

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 测试 Figma API - 获取所有组件 ==="
echo ""
echo "File ID: $FIGMA_FILE_ID"
echo "Token: ${FIGMA_API_TOKEN:0:20}..."
echo ""

# 获取文件信息
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID")

# 显示所有组件
echo "所有组件:"
echo "$response" | jq -r '.components | to_entries[] | "\(.key): \(.value.name)"'

echo ""
echo "组件总数:"
echo "$response" | jq -r '.components | length'

echo ""
echo "组件详细信息:"
echo "$response" | jq '.components | to_entries[] | {id: .key, name: .value.name, description: .value.description}'
