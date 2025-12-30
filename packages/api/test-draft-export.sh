#!/bin/bash

# 测试获取草稿组件的不同方法

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 测试获取 Figma 草稿组件 ==="
echo ""
echo "File ID: $FIGMA_FILE_ID"
echo "Node ID: 1:5"
echo ""

# 方法 1: 使用 /files/:file_id/nodes 端点
echo "方法 1: 使用 /files/:file_id/nodes 端点"
echo "----------------------------------------"
response1=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID/nodes?ids=1:5")

echo "响应:"
echo "$response1" | jq '.'
echo ""

# 检查是否有节点数据
has_node=$(echo "$response1" | jq -r '.nodes["1:5"] // empty')
if [ -n "$has_node" ] && [ "$has_node" != "null" ]; then
  echo "✓ 找到节点数据"
  echo ""
  echo "节点信息:"
  echo "$response1" | jq '.nodes["1:5"].document | {name, type, absoluteBoundingBox}'
else
  echo "✗ 没有找到节点数据"
fi

echo ""
echo "----------------------------------------"
echo ""

# 方法 2: 使用 images API 但指定 node ID（而不是 component key）
echo "方法 2: 使用 images API 导出节点"
echo "----------------------------------------"
response2=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/images/$FIGMA_FILE_ID?ids=1:5&format=svg")

echo "响应:"
echo "$response2" | jq '.'
echo ""

svg_url=$(echo "$response2" | jq -r '.images["1:5"] // empty')
if [ -n "$svg_url" ] && [ "$svg_url" != "null" ]; then
  echo "✓ 找到 SVG URL: $svg_url"
  echo ""
  echo "SVG 内容预览:"
  curl -s "$svg_url" | head -20
else
  echo "✗ 没有找到 SVG URL"
  echo ""
  echo "这确认了组件需要发布才能通过 images API 导出"
fi

echo ""
echo "----------------------------------------"
echo ""

# 方法 3: 获取完整文件并查看节点的 fills/strokes
echo "方法 3: 检查节点的矢量数据"
echo "----------------------------------------"
response3=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID?geometry=paths")

echo "查找节点 1:5 的矢量路径数据..."
node_data=$(echo "$response3" | jq -r '
  def find_node(id):
    if type == "object" then
      if .id == id then
        .
      else
        (.children // [])[] | find_node(id)
      end
    else
      empty
    end;
  .document | find_node("1:5")
')

if [ -n "$node_data" ] && [ "$node_data" != "null" ]; then
  echo "✓ 找到节点矢量数据"
  echo ""
  echo "节点信息:"
  echo "$node_data" | jq '{name, type, fills, strokes, strokeWeight, absoluteBoundingBox}' | head -30
  echo ""
  echo "是否有矢量路径:"
  has_paths=$(echo "$node_data" | jq 'has("fillGeometry") or has("strokeGeometry")')
  echo "  fillGeometry: $(echo "$node_data" | jq 'has("fillGeometry")')"
  echo "  strokeGeometry: $(echo "$node_data" | jq 'has("strokeGeometry")')"
else
  echo "✗ 没有找到节点数据"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "总结:"
echo "- 如果方法 1 成功，说明可以访问节点信息"
echo "- 如果方法 2 失败，说明必须发布组件才能导出 SVG"
echo "- 如果方法 3 有矢量路径数据，理论上可以自己构建 SVG"
echo ""
echo "推荐方案:"
echo "1. 最简单：在 Figma 中发布组件"
echo "2. 复杂但可行：使用矢量路径数据自己构建 SVG（需要大量开发工作）"
