# Figma 同步问题诊断和解决方案

## 🔍 问题诊断结果

### 真正的问题

**不是速率限制问题！** 真正的问题是：

**你的 Figma 组件名称不符合系统的图标识别规则**

### 你的组件

- 组件名称: `残缺线性/通知/铃声关闭`
- 问题: 不包含 "icon" 关键字，被系统过滤掉了

### 系统的过滤规则

系统会自动过滤组件，只同步符合以下条件之一的组件：

1. ✅ 组件名称以 `icon-` 或 `icon_` 开头（不区分大小写）
   - 例如: `icon-home`, `Icon-Menu`, `icon_search`

2. ✅ 组件名称包含 `icon` 关键字
   - 例如: `home-icon`, `menu-icon`, `search-icon`

3. ✅ 组件描述中包含 `icon` 或 `#icon` 标签
   - 在 Figma 组件的描述字段中添加

### 为什么之前"同步成功"但 0 个图标？

因为：
1. API 连接成功 ✅
2. 找到了 1 个组件 ✅
3. 但组件被过滤掉了 ❌（不符合命名规则）
4. 结果：0 个图标被同步

## ✅ 解决方案

### 方案 1: 重命名 Figma 组件（推荐）

在 Figma 中重命名你的组件：

**当前名称**: `残缺线性/通知/铃声关闭`

**建议的新名称**（选一个）:
- `icon-bell-off` ⭐ 推荐
- `bell-off-icon`
- `notification-bell-off-icon`
- `icon-notification-bell-off`

**如何重命名**:
1. 在 Figma 中选择组件
2. 双击组件名称或按 `Ctrl/Cmd + R`
3. 输入新名称
4. 保存

### 方案 2: 添加描述标签

如果不想改名称，可以在组件描述中添加标签：

1. 在 Figma 中选择组件
2. 在右侧面板找到 "Description" 字段
3. 添加文本: `icon` 或 `#icon`
4. 保存

### 方案 3: 修改系统过滤规则（不推荐）

如果你想让系统接受所有组件，可以修改代码。但这不推荐，因为：
- 会导入非图标组件
- 可能产生命名冲突
- 不符合最佳实践

## 🎯 推荐的 Figma 组件命名规范

### 好的命名示例

```
✅ icon-home
✅ icon-menu
✅ icon-search
✅ icon-user-profile
✅ icon-arrow-left
✅ icon-bell-notification
✅ home-icon
✅ menu-icon
✅ search-icon
```

### 避免的命名

```
❌ 残缺线性/通知/铃声关闭  （中文，无 icon 关键字）
❌ Home Icon               （有空格）
❌ home                    （无 icon 关键字）
❌ menu                    （无 icon 关键字）
❌ icon@2x                 （特殊字符）
❌ 用户图标                 （中文）
```

### 命名最佳实践

1. **使用英文**: 便于代码中引用
2. **包含 icon**: 明确标识为图标
3. **使用连字符**: `icon-name` 而不是 `icon_name` 或 `iconName`
4. **描述性**: `icon-user-profile` 比 `icon-1` 更好
5. **小写**: 虽然系统不区分大小写，但小写更规范

## 📝 完整的操作步骤

### 步骤 1: 在 Figma 中准备图标

1. 打开你的 Figma 文件
2. 选择要作为图标的图层
3. 创建组件: 右键 → "Create component" 或 `Ctrl/Cmd + Alt + K`
4. 重命名组件为符合规范的名称（例如: `icon-bell-off`）
5. 重复以上步骤创建更多图标

**示例组件列表**:
```
◆ icon-home
◆ icon-menu
◆ icon-search
◆ icon-user
◆ icon-settings
◆ icon-bell-off
```

### 步骤 2: 等待速率限制解除

由于之前的测试，Figma API 仍有速率限制。

**选项 A**: 等待（推荐）
- 等待 30-60 分钟
- 速率限制会自动重置

**选项 B**: 使用新的 Token
- 在 Figma 中生成新的 Personal Access Token
- 更新 `.env` 文件
- 重启服务

### 步骤 3: 同步图标

等待速率限制解除后：

```bash
cd packages/api

# 确保服务正在运行
npm run dev

# 在新终端运行同步
./sync-figma.sh full gd
```

### 步骤 4: 验证结果

```bash
# 查看同步的图标
ls packages/api/icons/gd/icons/

# 通过 API 查看
curl http://localhost:3000/collection?prefix=gd | jq

# 查看图标数量
curl http://localhost:3000/collections | jq '.gd.total'
```

### 步骤 5: 在 React 中使用

```tsx
import { Icon } from '@iconify/react';

<Icon icon="gd:icon-bell-off" width="24" height="24" />
<Icon icon="gd:icon-home" width="24" height="24" />
```

## 🧪 测试过滤规则

运行测试脚本查看哪些名称会被接受：

```bash
cd packages/api
./test-figma-filter.sh
```

## ⏰ 关于速率限制

### 当前状态

由于之前的测试，Figma API 仍有速率限制。这是正常的。

### 如何检查

```bash
# 直接测试 Figma API
curl -s -H "X-Figma-Token: 你的token" \
  "https://api.figma.com/v1/files/你的文件ID" | jq '{status, err}'
```

如果看到:
```json
{
  "status": 429,
  "err": "Rate limit exceeded"
}
```

说明仍需等待。

### 解决速率限制

1. **等待**: 30-60 分钟后自动重置
2. **新 Token**: 生成新的 Figma token
3. **减少调用**: 避免频繁测试

## 📊 总结

### 问题根源

1. ❌ **不是** 速率限制问题（虽然现在确实有限制）
2. ✅ **是** 组件命名不符合规则的问题

### 解决步骤

1. ✅ 在 Figma 中重命名组件（添加 "icon" 关键字）
2. ⏰ 等待速率限制解除（30-60 分钟）
3. 🔄 重新运行同步
4. ✅ 验证图标已导入
5. 🎨 在 React 中使用图标

### 预期结果

重命名后，同步应该显示：

```
✓ 同步成功！

同步结果:
  成功: 1 个图标  ← 不再是 0！
  失败: 0 个图标
  总计: 1 个图标

没有错误 ✓
```

## 🎓 学到的经验

1. **命名很重要**: 组件命名要符合系统规范
2. **测试要谨慎**: 避免频繁调用 API 触发限制
3. **诊断要全面**: 不要只看表面错误，要深入分析

## 下一步

1. **现在**: 在 Figma 中重命名组件
2. **30 分钟后**: 运行 `./sync-figma.sh full gd`
3. **成功后**: 添加更多图标并使用增量同步

需要帮助吗？查看其他文档：
- `FIGMA_IMPORT_GUIDE.md` - 完整导入指南
- `packages/api/FIGMA_SYNC_GUIDE.md` - 同步详细文档
- `packages/api/diagnose-figma.sh` - 诊断脚本
