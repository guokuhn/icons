# 快速开始指南

欢迎使用 Iconify 私有图标库！本指南将帮助你在 5 分钟内启动并运行整个系统。

## 🎯 项目概览

这是一个完全自建的 Iconify 图标库解决方案，包含：

- **API 服务器**：提供符合 Iconify API 规范的图标数据服务
- **React 客户端**：展示如何在 React 应用中使用自定义图标
- **命名空间**：使用 "gd" 作为自定义命名空间
- **无依赖**：不依赖任何开源图标库

## 🚀 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 API 服务器

在第一个终端窗口：

```bash
npm run dev:api
```

你应该看到：

```
✅ Iconify API server running on port 3000
```

### 3. 启动 React 客户端

在第二个终端窗口：

```bash
npm run dev:client
```

或使用便捷脚本：

```bash
./start-client.sh
```

### 4. 访问应用

打开浏览器访问 http://localhost:5173

你应该看到：
- ✅ API 连接状态（绿色表示已连接）
- 🎨 图标展示网格
- 📦 不同尺寸和颜色的图标示例

## 📦 可用图标

当前系统包含 4 个示例图标：

| 图标名称 | 用途 | 使用方式 |
|---------|------|---------|
| `gd:logo` | Logo 图标 | `<Icon icon="gd:logo" />` |
| `gd:menu` | 菜单图标 | `<Icon icon="gd:menu" />` |
| `gd:home` | 首页图标 | `<Icon icon="gd:home" />` |
| `gd:search` | 搜索图标 | `<Icon icon="gd:search" />` |

## 💻 在你的项目中使用

### 安装依赖

```bash
npm install @iconify/react
```

### 配置 Iconify

```typescript
// iconify-config.ts
import { addAPIProvider } from '@iconify/react';

export function configureIconify() {
  addAPIProvider('', {
    resources: ['http://localhost:3000'],
    index: 0,
  });
}

configureIconify();
```

### 使用图标

```tsx
import { Icon } from '@iconify/react';

function App() {
  return (
    <div>
      {/* 基础使用 */}
      <Icon icon="gd:logo" width="24" height="24" />
      
      {/* 自定义颜色 */}
      <Icon icon="gd:home" style={{ color: '#1976d2' }} />
      
      {/* 在按钮中 */}
      <button>
        <Icon icon="gd:search" width="20" height="20" />
        <span>搜索</span>
      </button>
    </div>
  );
}
```

## 🔍 验证安装

### 检查 API 服务器

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{
  "status": "healthy",
  "timestamp": 1234567890
}
```

### 获取图标列表

```bash
curl http://localhost:3000/collections
```

### 获取特定图标

```bash
curl http://localhost:3000/icons?icons=gd:logo
```

## 📁 项目结构

```
iconify-private-library/
├── packages/
│   ├── api/                    # API 服务器
│   │   ├── src/
│   │   │   ├── cache/         # 缓存管理
│   │   │   ├── managers/      # 图标集管理
│   │   │   ├── parsers/       # SVG 解析
│   │   │   ├── storage/       # 存储层
│   │   │   └── index.ts       # 主入口
│   │   └── icons/gd/          # 图标数据
│   │       ├── icons/         # JSON 格式图标
│   │       ├── source/        # 原始 SVG 文件
│   │       └── metadata.json  # 图标集元数据
│   │
│   └── client/                 # React 客户端
│       ├── src/
│       │   ├── App.tsx        # 主应用组件
│       │   ├── iconify-config.ts  # Iconify 配置
│       │   └── main.tsx       # 入口文件
│       └── package.json
│
├── examples/                   # 使用示例
│   ├── icon-preview.html      # 图标预览页面
│   ├── react-usage.tsx        # React 使用示例
│   └── README.md
│
├── README.md                   # 项目主文档
├── QUICKSTART.md              # 本文件
└── CLIENT_SETUP.md            # 客户端详细设置
```

## 🎨 使用示例

### 不同尺寸

```tsx
<Icon icon="gd:logo" width="16" height="16" />
<Icon icon="gd:logo" width="24" height="24" />
<Icon icon="gd:logo" width="48" height="48" />
```

### 不同颜色

```tsx
<Icon icon="gd:home" style={{ color: '#1976d2' }} />
<Icon icon="gd:home" style={{ color: '#388e3c' }} />
<Icon icon="gd:home" style={{ color: '#d32f2f' }} />
```

### 图标变换

```tsx
{/* 旋转 */}
<Icon icon="gd:logo" rotate={1} />  {/* 90度 */}
<Icon icon="gd:logo" rotate={2} />  {/* 180度 */}

{/* 翻转 */}
<Icon icon="gd:logo" hFlip={true} />  {/* 水平翻转 */}
<Icon icon="gd:logo" vFlip={true} />  {/* 垂直翻转 */}
```

### 在导航中使用

```tsx
function Navigation() {
  return (
    <nav>
      <a href="/">
        <Icon icon="gd:home" width="20" height="20" />
        <span>首页</span>
      </a>
      <a href="/search">
        <Icon icon="gd:search" width="20" height="20" />
        <span>搜索</span>
      </a>
    </nav>
  );
}
```

## 🔧 常见问题

### 图标不显示？

1. **检查 API 服务器**：确保 API 服务器正在运行
   ```bash
   curl http://localhost:3000/health
   ```

2. **检查浏览器控制台**：查看是否有错误信息

3. **检查图标名称**：必须使用 `gd:` 前缀

### CORS 错误？

如果遇到 CORS（跨域资源共享）错误，需要配置 API 服务器允许你的客户端域名访问。

**开发环境快速配置：**

在 `packages/api/.env` 中：

```env
CORS_ORIGIN=http://localhost:5173
```

**生产环境：**

明确列出所有允许的域名（逗号分隔）：

```env
CORS_ORIGIN=https://app.example.com,https://admin.example.com
```

⚠️ **重要**：生产环境不要使用通配符 `*`，这会带来安全风险。

📖 **详细配置说明**：查看 [README.md 的 CORS 配置章节](./README.md#cors-configuration) 了解：
- 多域名配置
- 环境特定推荐
- 安全最佳实践
- 故障排除指南

### 端口冲突？

如果端口 3000 或 5173 已被占用，可以修改：

**API 服务器** (`packages/api/.env`)：
```env
PORT=3001
```

**React 客户端** (`packages/client/vite.config.ts`)：
```typescript
export default defineConfig({
  server: {
    port: 5174,
  },
});
```

## 📚 下一步

### 添加新图标

1. 将 SVG 文件放到 `packages/api/icons/gd/source/`
2. 重启 API 服务器
3. 在 React 应用中使用新图标

### 上传图标（阶段 2）

即将支持通过 API 上传图标：

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@icon.svg" \
  -F "name=new-icon"
```

### Figma 集成（阶段 3）

即将支持从 Figma 自动同步图标。

## 📖 更多文档

- [客户端详细设置](./CLIENT_SETUP.md) - React 客户端配置和故障排除
- [使用示例](./examples/README.md) - 更多代码示例
- [图标预览](./examples/icon-preview.html) - 可视化图标展示
- [Iconify 官方文档](https://docs.iconify.design/) - Iconify 完整文档

## 🎯 核心特性

- ✅ **完全自主**：不依赖任何外部图标库
- ✅ **标准兼容**：遵循 Iconify API 规范
- ✅ **高性能**：多层缓存策略
- ✅ **易于使用**：与 @iconify/react 无缝集成
- ✅ **类型安全**：完整的 TypeScript 支持
- ✅ **可扩展**：支持多阶段功能扩展

## 💡 提示

1. **开发模式**：缓存已禁用，确保获取最新数据
2. **生产模式**：启用完整缓存以优化性能
3. **图标命名**：使用描述性名称，如 `user-profile`、`settings-gear`
4. **SVG 优化**：系统自动优化 SVG 文件
5. **错误处理**：图标加载失败不会导致应用崩溃

## 🚀 开始构建

现在你已经了解了基础知识，可以开始构建你的应用了！

如有问题，请查看：
- [CLIENT_SETUP.md](./CLIENT_SETUP.md) - 详细的故障排除指南
- [examples/](./examples/) - 更多使用示例
- 浏览器开发工具的 Console 和 Network 标签

祝你使用愉快！🎉
