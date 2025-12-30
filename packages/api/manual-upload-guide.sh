#!/bin/bash

# 手动上传图标指南脚本

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 手动上传图标指南 ===${NC}"
echo ""
echo "由于 Figma API 速率限制，我们可以手动上传图标来测试系统。"
echo ""

# 检查服务是否运行
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo -e "${RED}✗ API 服务未运行${NC}"
  echo "请先启动服务: npm run dev"
  exit 1
fi

echo -e "${GREEN}✓ API 服务正在运行${NC}"
echo ""

echo -e "${YELLOW}步骤 1: 从 Figma 导出 SVG${NC}"
echo "----------------------------------------"
echo "1. 在 Figma 中选择你的图标组件"
echo "2. 右键 → Export → SVG"
echo "3. 保存文件（例如: bell-off.svg）"
echo ""

echo -e "${YELLOW}步骤 2: 上传 SVG 到系统${NC}"
echo "----------------------------------------"
echo "使用以下命令上传（替换文件路径和图标名称）:"
echo ""
echo -e "${BLUE}curl -X POST \\"
echo "  -H \"Authorization: Bearer dev-api-key-12345\" \\"
echo "  -F \"name=icon-bell-off\" \\"
echo "  -F \"icon=@/path/to/bell-off.svg\" \\"
echo "  http://localhost:3000/api/upload${NC}"
echo ""

echo -e "${YELLOW}步骤 3: 验证上传${NC}"
echo "----------------------------------------"
echo "查看已上传的图标:"
echo ""
echo -e "${BLUE}curl http://localhost:3000/collection?prefix=gd | jq${NC}"
echo ""

echo -e "${YELLOW}步骤 4: 在 React 中使用${NC}"
echo "----------------------------------------"
echo "在你的 React 组件中:"
echo ""
echo -e "${BLUE}<Icon icon=\"gd:icon-bell-off\" width=\"24\" height=\"24\" />${NC}"
echo ""

echo "=========================================="
echo ""
echo "💡 提示: 你也可以创建一个简单的 SVG 文件来测试:"
echo ""
echo "cat > test-icon.svg << 'EOF'"
echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">'
echo '  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>'
echo '</svg>'
echo 'EOF'
echo ""
echo "然后上传:"
echo "curl -X POST -H \"Authorization: Bearer dev-api-key-12345\" \\"
echo "  -F \"name=icon-test\" -F \"icon=@test-icon.svg\" \\"
echo "  http://localhost:3000/api/upload"
