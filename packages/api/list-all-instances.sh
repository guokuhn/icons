#!/bin/bash

# 列出 Figma 文件中的所有实例

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== Figma 文件中的所有实例 ==="
echo ""

# 获取完整文件
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID")

echo "所有 INSTANCE 节点:"
echo "$response" | jq -r '
  def find_instances:
    if type == "object" then
      if .type == "INSTANCE" then
        "ID: \(.id) | 名称: \(.name) | 组件ID: \(.componentId)"
      else
        empty
      end,
      (.children // [])[] | find_instances
    else
      empty
    end;
  .document | find_instances
'

echo ""
echo "所有 COMPONENT 节点:"
echo "$response" | jq -r '
  def find_components:
    if type == "object" then
      if .type == "COMPONENT" then
        "ID: \(.id) | 名称: \(.name)"
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
echo "顶层 components 对象:"
echo "$response" | jq '.components | to_entries[] | {id: .key, name: .value.name}'
