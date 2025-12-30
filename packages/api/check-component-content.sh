#!/bin/bash

# 检查组件是否有实际内容

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 检查组件内容 ==="
echo ""

# 获取节点详细信息
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID/nodes?ids=1:5&depth=10")

echo "组件完整结构:"
echo "$response" | jq '.nodes["1:5"].document'

echo ""
echo "----------------------------------------"
echo ""
echo "检查点:"
echo "1. children 数组是否为空？"
children_count=$(echo "$response" | jq '.nodes["1:5"].document.children | length')
echo "   子节点数量: $children_count"

if [ "$children_count" -eq 0 ]; then
  echo ""
  echo "⚠️  警告: 组件是空的！"
  echo ""
  echo "可能的原因:"
  echo "1. 组件确实没有任何内容（空组件）"
  echo "2. 组件内容在另一个页面或 frame 中"
  echo "3. 需要使用不同的 API 参数"
  echo ""
  echo "请在 Figma 中检查:"
  echo "- 打开组件，确认它有可见的图形内容"
  echo "- 确保图形不是隐藏的"
  echo "- 确保组件不是空的 frame"
else
  echo ""
  echo "✓ 组件有 $children_count 个子节点"
  echo ""
  echo "子节点列表:"
  echo "$response" | jq '.nodes["1:5"].document.children[] | {name, type, id}'
fi

echo ""
echo "2. 组件的边界框大小"
bbox=$(echo "$response" | jq '.nodes["1:5"].document.absoluteBoundingBox')
echo "$bbox"

width=$(echo "$bbox" | jq '.width')
height=$(echo "$bbox" | jq '.height')

if [ "$width" == "0.0" ] || [ "$height" == "0.0" ]; then
  echo ""
  echo "⚠️  警告: 组件大小为 0！"
else
  echo ""
  echo "✓ 组件大小: ${width}x${height}"
fi
