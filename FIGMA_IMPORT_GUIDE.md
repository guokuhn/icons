# 从 Figma 导入图标完整指南

## 📋 目录

1. [前提条件](#前提条件)
2. [配置 Figma](#配置-figma)
3. [准备 Figma 文件](#准备-figma-文件)
4. [导入图标](#导入图标)
5. [验证导入](#验证导入)
6. [在 React 中使用](#在-react-中使用)
7. [常见问题](#常见问题)

## 前提条件

✅ 已完成的配置：
- Figma Personal Access Token
- Figma File ID
- API 服务可以运行

## 配置 Figma

### 1. 获取 Figma Personal Access Token

1. 登录 [Figma](https://www.figma.com/)
2. 点击右上角头像 → Settings
3. 滚动到 "Personal access tokens" 部分
4. 点击 "Generate new token"
5. 给 token 起个名字（如 "Iconify Private Library"）
6. 复制生成的 token（格式类似：`figd_xxxxx...`）

### 2. 获取 Figma File ID

1. 在浏览器中打开你的 Figma 文件
2. 查看 URL，格式为：
   ```
   https://www.figma.com/file/FILE_ID/File-Name
   或
   https://www.figma.com/design/FILE_ID/File-Name?node-id=...
   ```
3. 复制 `FILE_ID` 部分（通常是一串字母和数字，如：`gLk7YPgS2NZHrLNqEh229P`）

### 3. 配置环境变量

编辑 `packages/api/.env` 文件：

```env
# Figma Integration
FIGMA_API_TOKEN=figd_你的token
FIGMA_FILE_ID=你的文件ID
```

**重要**: 只填写文件 ID，不要填写完整的 URL！

✅ 正确示例：
```env
FIGMA_FILE_ID=gLk7YPgS2NZHrLNqEh229P
```

❌ 错误示例：
```env
FIGMA_FILE_ID=https://www.figma.com/design/gLk7YPgS2NZHrLNqEh229P/...
```

## 准备 Figma 文件

### 图标要求

为了让系统正确识别和导入图标，你的 Figma 文件需要满足以下条件：

#### 1. 创建组件（Components）

图标必须是 Figma 组件，而不是普通的图层或组：

1. 选择你的图标图层
2. 右键 → "Create component" 或按 `Ctrl/Cmd + Alt + K`
3. 组件会显示紫色的菱形图标 ◆

#### 2. 命名规范

组件名称将成为图标的名称，建议使用：

- ✅ 小写字母
- ✅ 数字
- ✅ 连字符 `-`
- ✅ 下划线 `_`

**好的命名示例**：
- `home`
- `user-profile`
- `arrow_left`
- `icon-24`
- `menu-hamburger`

**避免的命名**：
- ❌ `Home Icon`（有空格）
- ❌ `用户图标`（非英文）
- ❌ `icon@2x`（特殊字符）

#### 3. 图标设计建议

- **尺寸**: 建议使用 24x24 或 32x32 的画板
- **颜色**: 使用单色或可以轻松改变颜色的设计
- **路径**: 确保图标是矢量路径，避免使用位图
- **简洁**: 避免过于复杂的图标，保持简洁

### 推荐的 Figma 文件结构

```
📄 你的 Figma 文件
  📁 Icons 页面
    ◆ home (Component)
    ◆ menu (Component)
    ◆ search (Component)
    ◆ user (Component)
    ◆ settings (Component)
    ◆ notification (Component)
```

### 可选：标记为图标

虽然不是必需的，但建议将组件标记为图标：

1. 右键点击组件
2. 选择 "Set as icon"
3. 或在组件描述中添加 "icon" 关键字

## 导入图标

### 方法 1: 使用快速同步脚本（最简单）

```bash
cd packages/api
./quick-sync.sh
```

这个脚本会：
1. 重启 API 服务（加载最新配置）
2. 自动从 Figma 同步所有图标
3. 显示同步结果

### 方法 2: 手动步骤

#### 步骤 1: 启动 API 服务

```bash
cd packages/api
npm run dev
```

#### 步骤 2: 运行同步脚本

在新的终端窗口中：

```bash
cd packages/api
./sync-figma.sh full gd
```

### 方法 3: 使用 curl 命令

```bash
curl -X POST \
  -H "Authorization: Bearer dev-api-key-12345" \
  "http://localhost:3000/api/sync/figma?mode=full&namespace=gd"
```

### 同步模式说明

- **full**: 完全同步，导入所有图标（首次使用推荐）
- **incremental**: 增量同步，只更新有变化的图标（日常更新推荐）

## 验证导入

### 1. 检查同步结果

同步完成后，你会看到类似的输出：

```
✓ 同步成功！

同步结果:
  成功: 5 个图标
  失败: 0 个图标
  总计: 5 个图标

没有错误 ✓
```

### 2. 检查文件系统

```bash
# 查看导入的图标文件
ls -la packages/api/icons/gd/icons/

# 应该看到类似这样的文件：
# home.json
# menu.json
# search.json
# user.json
# settings.json
```

### 3. 通过 API 验证

```bash
# 获取图标集信息
curl http://localhost:3000/collections | jq

# 获取所有图标
curl http://localhost:3000/collection?prefix=gd | jq

# 获取特定图标
curl http://localhost:3000/icons?icons=gd:home | jq
```

### 4. 查看图标内容

```bash
# 查看某个图标的 JSON 内容
cat packages/api/icons/gd/icons/home.json | jq
```

应该看到类似这样的结构：

```json
{
  "body": "<path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/>",
  "width": 24,
  "height": 24
}
```

## 在 React 中使用

### 1. 确保 React 应用配置正确

检查 `packages/client/src/iconify-config.ts`:

```typescript
import { addAPIProvider } from '@iconify/react';

export function configureIconify() {
  addAPIProvider('custom', {
    resources: ['http://localhost:3000'],
  });
}
```

### 2. 在组件中使用图标

```tsx
import { Icon } from '@iconify/react';
import { configureIconify } from './iconify-config';

// 在应用初始化时配置
configureIconify();

function App() {
  return (
    <div>
      <h1>我的图标</h1>
      
      {/* 使用格式: gd:图标名称 */}
      <Icon icon="gd:home" width="24" height="24" />
      <Icon icon="gd:menu" width="24" height="24" />
      <Icon icon="gd:search" width="24" height="24" />
      <Icon icon="gd:user" width="32" height="32" />
      
      {/* 可以自定义颜色 */}
      <Icon icon="gd:settings" width="24" color="blue" />
      
      {/* 可以添加类名 */}
      <Icon icon="gd:notification" className="my-icon" />
    </div>
  );
}
```

### 3. 启动 React 应用

```bash
cd packages/client
npm run dev
```

访问 `http://localhost:5173` 查看你的图标！

## 常见问题

### Q1: 同步成功但没有导入任何图标（0 个成功）

**可能原因**：
1. Figma 文件中没有组件
2. 图层不是组件（Component）
3. 组件没有被系统识别为图标

**解决方法**：
1. 确保图标是 Figma 组件（有紫色菱形标记 ◆）
2. 检查组件命名是否符合规范
3. 尝试在组件描述中添加 "icon" 关键字
4. 查看 API 日志了解详情：
   ```bash
   tail -f packages/api/logs/combined.log
   ```

### Q2: 同步失败，提示 "Figma integration is not configured"

**解决方法**：
1. 检查 `.env` 文件中的配置
2. 确保 `FIGMA_API_TOKEN` 和 `FIGMA_FILE_ID` 都已设置
3. 重启 API 服务：
   ```bash
   pkill -f 'tsx.*index.ts'
   cd packages/api
   npm run dev
   ```

### Q3: 同步失败，提示 "Figma file not found"

**解决方法**：
1. 检查 `FIGMA_FILE_ID` 是否正确
2. 确保只填写文件 ID，不是完整 URL
3. 运行诊断脚本：
   ```bash
   cd packages/api
   ./diagnose-figma.sh
   ```

### Q4: 同步失败，提示 "Invalid Figma API token"

**解决方法**：
1. 检查 token 是否正确复制（没有多余空格）
2. 在 Figma 中重新生成 token
3. 确保 token 有访问该文件的权限

### Q5: 同步失败，提示 "Rate limit exceeded"

**解决方法**：
1. 等待几分钟后再试
2. Figma API 有速率限制，避免频繁调用
3. 使用增量同步而不是完全同步：
   ```bash
   ./sync-figma.sh incremental gd
   ```

### Q6: React 应用中看不到图标

**解决方法**：
1. 确保 API 服务正在运行
2. 检查浏览器控制台是否有错误
3. 清除浏览器缓存
4. 重启 React 开发服务器
5. 检查图标名称格式是否正确（`gd:icon-name`）

### Q7: 图标显示为空白或方框

**可能原因**：
1. SVG 路径数据无效
2. 图标在 Figma 中包含不支持的元素

**解决方法**：
1. 在 Figma 中简化图标设计
2. 确保图标只包含矢量路径
3. 避免使用文本、图片或复杂效果
4. 查看图标的 JSON 文件检查 `body` 字段

### Q8: 如何更新已导入的图标？

**方法 1**: 使用增量同步（推荐）
```bash
./sync-figma.sh incremental gd
```

**方法 2**: 使用完全同步（会覆盖所有图标）
```bash
./sync-figma.sh full gd
```

系统会自动保存历史版本，所以不用担心数据丢失。

### Q9: 如何查看图标的历史版本？

```bash
# 查看某个图标的所有版本
ls -la packages/api/icons/gd/versions/home/

# 查看特定版本的内容
cat packages/api/icons/gd/versions/home/v1234567890.json | jq
```

### Q10: 如何删除不需要的图标？

```bash
curl -X DELETE \
  -H "Authorization: Bearer dev-api-key-12345" \
  "http://localhost:3000/api/icons/gd/icon-name"
```

## 最佳实践

1. **首次导入**: 使用完全同步模式
2. **日常更新**: 使用增量同步模式
3. **命名规范**: 在 Figma 中保持一致的命名
4. **定期同步**: 设置定时任务自动同步
5. **版本控制**: 将 `icons/` 目录提交到 Git
6. **测试验证**: 同步后在 React 应用中测试
7. **监控日志**: 定期检查同步日志

## 自动化同步

### 使用 cron 定时同步

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每小时增量同步一次）
0 * * * * cd /path/to/project/packages/api && ./sync-figma.sh incremental gd >> /var/log/figma-sync.log 2>&1
```

## 获取帮助

如果遇到问题：

1. **运行诊断脚本**:
   ```bash
   cd packages/api
   ./diagnose-figma.sh
   ```

2. **查看 API 日志**:
   ```bash
   tail -f packages/api/logs/combined.log
   ```

3. **检查健康状态**:
   ```bash
   curl http://localhost:3000/health | jq
   ```

4. **查看详细文档**:
   - `packages/api/FIGMA_SYNC_GUIDE.md` - 同步指南
   - `packages/api/FIGMA_INTEGRATION.md` - 集成文档
   - `packages/api/FIGMA_ERROR_HANDLING.md` - 错误处理

## 下一步

现在你已经成功从 Figma 导入图标了！接下来你可以：

1. 在 React 应用中使用这些图标
2. 设置自动化同步
3. 自定义图标样式
4. 添加更多图标到 Figma

祝你使用愉快！🎉
