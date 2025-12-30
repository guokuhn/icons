#!/bin/bash

# 详细的 Figma 诊断脚本

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 详细 Figma 诊断 ==="
echo ""
echo "File ID: $FIGMA_FILE_ID"
echo ""

# 获取文件信息
echo "1. 获取文件基本信息..."
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID")

echo "   文件名: $(echo "$response" | jq -r '.name')"
echo "   最后修改: $(echo "$response" | jq -r '.lastModified')"
echo "   版本: $(echo "$response" | jq -r '.version')"
echo ""

# 检查组件
echo "2. 检查组件 (Components)..."
components=$(echo "$response" | jq -r '.components // {} | length')
echo "   组件总数: $components"
echo ""

if [ "$components" -gt 0 ]; then
  echo "   组件列表:"
  echo "$response" | jq -r '.components | to_entries[] | "   ID: \(.key)\n   名称: \(.value.name)\n   描述: \(.value.description // "无")\n   ---"'
fi

# 检查 componentSets (组件集)
echo ""
echo "3. 检查组件集 (Component Sets)..."
componentSets=$(echo "$response" | jq -r '.componentSets // {} | length')
echo "   组件集总数: $componentSets"
echo ""

if [ "$componentSets" -gt 0 ]; then
  echo "   组件集列表:"
  echo "$response" | jq -r '.componentSets | to_entries[] | "   ID: \(.key)\n   名称: \(.value.name)\n   描述: \(.value.description // "无")\n   ---"'
fi

# 检查文档结构中的所有节点
echo ""
echo "4. 扫描文档树中的所有 COMPONENT 节点..."
echo "$response" | jq -r '
  def find_components:
    if type == "object" then
      if .type == "COMPONENT" then
        "   类型: COMPONENT\n   ID: \(.id)\n   名称: \(.name)\n   ---"
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
echo "5. 检查是否有包含 'icon' 的节点..."
echo "$response" | jq -r '
  def find_icon_nodes:
    if type == "object" then
      if (.name // "" | ascii_downcase | contains("icon")) then
        "   类型: \(.type)\n   ID: \(.id)\n   名称: \(.name)\n   ---"
      else
        empty
      end,
      (.children // [])[] | find_icon_nodes
    else
      empty
    end;
  .document | find_icon_nodes
'

echo ""
echo "=== 诊断完成 ==="
