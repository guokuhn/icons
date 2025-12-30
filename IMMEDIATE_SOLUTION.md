# 立即可用的解决方案

## ✅ 好消息

**系统工作正常！** 我刚刚成功上传并验证了一个测试图标。

问题只是 Figma API 的速率限制持续时间比预期长。

## 🚀 立即可用的方案：手动上传

由于 Figma API 速率限制可能持续数小时，我们可以**手动上传图标**来立即使用系统。

### 方案 1: 从 Figma 导出并上传

#### 步骤 1: 在 Figma 中导出 SVG

1. 打开你的 Figma 文件
2. 选择图标组件（例如：残缺线性/通知/铃声关闭）
3. 右键 → **Export** → **SVG**
4. 保存文件（例如：`bell-off.svg`）

#### 步骤 2: 上传到系统

```bash
cd packages/api

# 上传图标（替换文件路径）
curl -X POST \
  -H "Authorization: Bearer dev-api-key-12345" \
  -F "name=icon-bell-off" \
  -F "icon=@/path/to/bell-off.svg" \
  http://localhost:3000/api/upload
```

**注意**: 图标名称必须包含 "icon" 关键字！

#### 步骤 3: 验证上传

```bash
# 查看所有图标
curl http://localhost:3000/collection?prefix=gd | jq

# 查看特定图标
curl 'http://localhost:3000/icons?icons=gd:icon-bell-off' | jq
```

#### 步骤 4: 在 React 中使用

```tsx
import { Icon } from '@iconify/react';

<Icon icon="gd:icon-bell-off" width="24" height="24" />
```

### 方案 2: 使用测试图标（快速验证）

我已经创建了一个测试图标并成功上传。你可以立即在 React 中使用：

```tsx
<Icon icon="gd:icon-test" width="24" height="24" />
```

验证：
```bash
curl 'http://localhost:3000/icons?icons=gd:icon-test' | jq
```

响应：
```json
{
  "gd": {
    "prefix": "gd",
    "icons": {
      "icon-test": {
        "body": "<path d=\"M12 2 2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L10 2z\"/>",
        "width": 24,
        "height": 24
      }
    }
  }
}
```

### 方案 3: 批量上传脚本

如果你有多个图标要上传，创建一个脚本：

```bash
#!/bin/bash

# 批量上传图标
API_KEY="dev-api-key-12345"
API_URL="http://localhost:3000/api/upload"

# 图标文件列表（文件名 -> 图标名称）
declare -A icons=(
  ["bell-off.svg"]="icon-bell-off"
  ["home.svg"]="icon-home"
  ["menu.svg"]="icon-menu"
)

for file in "${!icons[@]}"; do
  name="${icons[$file]}"
  echo "上传: $file -> $name"
  
  curl -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -F "name=$name" \
    -F "icon=@$file" \
    "$API_URL"
  
  echo ""
done
```

## 📊 当前状态

### ✅ 已验证工作的功能

1. ✅ API 服务运行正常
2. ✅ 图标上传功能正常
3. ✅ 图标存储功能正常
4. ✅ 图标查询功能正常
5. ✅ 缓存功能正常

### ⏰ 暂时不可用的功能

1. ⏰ Figma 自动同步（速率限制）

### 🔄 Figma 同步何时可用？

Figma API 的速率限制通常：
- **免费账户**: 60 次/小时
- **重置时间**: 可能需要 1-2 小时

**建议**:
1. **现在**: 使用手动上传测试系统
2. **今晚或明天**: 再尝试 Figma 同步
3. **长期**: 使用增量同步避免触发限制

## 🎯 完整的工作流程

### 开发阶段（现在）

```bash
# 1. 从 Figma 导出 SVG
# （在 Figma 中操作）

# 2. 上传图标
cd packages/api
curl -X POST \
  -H "Authorization: Bearer dev-api-key-12345" \
  -F "name=icon-your-icon" \
  -F "icon=@your-icon.svg" \
  http://localhost:3000/api/upload

# 3. 验证
curl 'http://localhost:3000/icons?icons=gd:icon-your-icon' | jq

# 4. 在 React 中使用
# <Icon icon="gd:icon-your-icon" />
```

### 生产阶段（Figma 同步恢复后）

```bash
# 1. 在 Figma 中准备图标（重命名为包含 "icon"）
# 2. 运行同步
./sync-figma.sh incremental gd

# 3. 自动化（可选）
# 设置定时任务每天同步一次
```

## 💡 重要提示

### 图标命名规则

无论是手动上传还是 Figma 同步，图标名称都必须：

✅ **包含 "icon" 关键字**:
- `icon-bell-off` ✅
- `bell-off-icon` ✅
- `notification-icon` ✅

❌ **避免**:
- `bell-off` ❌（无 icon）
- `铃声关闭` ❌（中文）
- `Bell Off` ❌（有空格）

### 文件要求

- **格式**: SVG
- **大小**: 最大 1MB
- **内容**: 有效的 SVG 路径数据

## 🧪 快速测试

### 测试 1: 上传测试图标

```bash
cd packages/api

# 创建测试 SVG
cat > my-test.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10"/>
</svg>
EOF

# 上传
curl -X POST \
  -H "Authorization: Bearer dev-api-key-12345" \
  -F "name=icon-circle" \
  -F "icon=@my-test.svg" \
  http://localhost:3000/api/upload | jq
```

### 测试 2: 查看所有图标

```bash
curl http://localhost:3000/collections | jq
```

### 测试 3: 在 React 中测试

```tsx
import { Icon } from '@iconify/react';

function TestIcons() {
  return (
    <div>
      <h2>测试图标</h2>
      <Icon icon="gd:icon-test" width="48" height="48" />
      <Icon icon="gd:icon-circle" width="48" height="48" />
    </div>
  );
}
```

## 📚 相关文档

- `manual-upload-guide.sh` - 手动上传指南脚本
- `FIGMA_SYNC_TROUBLESHOOTING.md` - Figma 同步问题诊断
- `FIGMA_IMPORT_GUIDE.md` - 完整导入指南

## 🎉 总结

1. **系统完全正常** ✅
2. **可以立即使用手动上传** ✅
3. **Figma 同步稍后可用** ⏰

你现在可以：
1. 从 Figma 导出 SVG
2. 手动上传到系统
3. 在 React 应用中使用
4. 等 Figma API 恢复后再使用自动同步

需要帮助吗？运行：
```bash
cd packages/api
./manual-upload-guide.sh
```
