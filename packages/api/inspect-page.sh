#!/bin/bash

# 深入检查 Page 1 的内容

# 读取 .env 文件
if [ -f .env ]; then
  source .env
else
  echo "错误: 未找到 .env 文件"
  exit 1
fi

echo "=== 检查 Page 1 的详细内容 ==="
echo ""

# 获取完整文件
response=$(curl -s \
  -H "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_ID")

echo "Page 1 的完整结构:"
echo "$response" | jq '.document.children[0]' > /tmp/page1.json
cat /tmp/page1.json | jq '.' | head -200

echo ""
echo "----------------------------------------"
echo ""
echo "Page 1 的子节点摘要:"
echo "$response" | jq '.document.children[0].children[]? | {id, name, type, visible, childCount: (.children | length)}'

echo ""
echo "----------------------------------------"
echo ""
echo "查找组件 1:5 在文档树中的位置:"
echo "$response" | jq -r '
  def find_path(target_id; path):
    if type == "object" then
      if .id == target_id then
        path + [.name]
      else
        (.children // [])[] | find_path(target_id; path + [.name])
      end
    else
      empty
    end;
  .document | find_path("1:5"; [])
' | jq -s 'if length > 0 then .[] else "未找到" end'
