#!/bin/bash

# 测试导出实例而不是组件

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 测试导出实例 1:4 (icon-bell-off) ==="
echo ""

# 尝试导出实例
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/images/$FIGMA_FILE_ID?ids=1:4&format=svg")

echo "响应:"
echo "$response" | jq '.'

echo ""
svg_url=$(echo "$response" | jq -r '.images["1:4"] // empty')

if [ -n "$svg_url" ] && [ "$svg_url" != "null" ]; then
  echo "✓ 成功！找到 SVG URL"
  echo "URL: $svg_url"
  echo ""
  echo "下载 SVG 内容:"
  curl -s "$svg_url" | head -50
  echo ""
  echo "..."
  echo ""
  echo "✅ 解决方案：导出实例而不是组件定义！"
else
  echo "✗ 失败：无法导出实例"
  echo ""
  echo "这意味着即使是实例也需要发布才能导出"
fi
