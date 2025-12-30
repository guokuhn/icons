#!/bin/bash

# 查找文件中所有有内容的节点

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 查找文件中的所有节点 ==="
echo ""

# 获取完整文件
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID")

echo "1. 所有 COMPONENT 类型的节点:"
echo "$response" | jq -r '
  def find_components:
    if type == "object" then
      if .type == "COMPONENT" then
        "ID: \(.id) | 名称: \(.name) | 子节点: \(.children | length)"
      else
        empty
      end,
      (.children // [])[] | find_components
    else
      empty
    end;
  .document | find_components
'

echo ""
echo "2. 所有包含矢量路径的节点 (VECTOR, BOOLEAN_OPERATION, etc):"
echo "$response" | jq -r '
  def find_vectors:
    if type == "object" then
      if (.type == "VECTOR" or .type == "BOOLEAN_OPERATION" or .type == "STAR" or .type == "LINE" or .type == "ELLIPSE" or .type == "REGULAR_POLYGON" or .type == "RECTANGLE") then
        "ID: \(.id) | 类型: \(.type) | 名称: \(.name)"
      else
        empty
      end,
      (.children // [])[] | find_vectors
    else
      empty
    end;
  .document | find_vectors
' | head -20

echo ""
echo "3. 所有 FRAME 节点（可能包含图标）:"
echo "$response" | jq -r '
  def find_frames:
    if type == "object" then
      if .type == "FRAME" then
        "ID: \(.id) | 名称: \(.name) | 子节点: \(.children | length)"
      else
        empty
      end,
      (.children // [])[] | find_frames
    else
      empty
    end;
  .document | find_frames
' | head -20

echo ""
echo "4. 文档结构概览:"
echo "$response" | jq '.document | {name, type, children: [.children[]? | {id, name, type, childCount: (.children | length)}]}'

echo ""
echo "=== 查找完成 ==="
echo ""
echo "提示:"
echo "- 如果看到有内容的节点，记下它们的 ID"
echo "- 可以尝试导出这些节点而不是空组件"
