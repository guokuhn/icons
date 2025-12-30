#!/bin/bash

# 测试 Figma images API

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 测试 Figma Images API ==="
echo ""
echo "File ID: $FIGMA_FILE_ID"
echo "Component ID: 1:5"
echo ""

# 测试导出 SVG
echo "1. 尝试导出组件为 SVG..."
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/images/$FIGMA_FILE_ID?ids=1:5&format=svg")

echo "响应:"
echo "$response" | jq '.'

echo ""
echo "2. 检查是否有 SVG URL..."
svg_url=$(echo "$response" | jq -r '.images["1:5"] // empty')

if [ -n "$svg_url" ] && [ "$svg_url" != "null" ]; then
  echo "✓ 找到 SVG URL: $svg_url"
  echo ""
  echo "3. 下载 SVG 内容..."
  curl -s "$svg_url" | head -20
else
  echo "✗ 没有找到 SVG URL"
  echo ""
  echo "可能的原因:"
  echo "1. 组件没有发布 (Publish)"
  echo "2. 组件 ID 不正确"
  echo "3. 没有导出权限"
  echo ""
  echo "解决方法:"
  echo "1. 在 Figma 中右键点击组件，选择 'Publish changes'"
  echo "2. 或点击右上角的 'Publish' 按钮发布组件"
fi

echo ""
echo "=== 测试完成 ==="
