# React 客户端设置指南

本指南说明如何设置和运行 Iconify 私有图标库的 React 客户端。

## 前置条件

1. Node.js 18+ 已安装
2. npm 或 yarn 包管理器
3. API 服务器已配置并可运行

## 快速开始

### 1. 安装依赖

在项目根目录运行：

```bash
npm install
```

这将安装所有工作区（API 和客户端）的依赖。

### 2. 启动 API 服务器

在一个终端窗口中：

```bash
npm run dev:api
```

API 服务器将在 http://localhost:3000 启动。

### 3. 启动 React 客户端

在另一个终端窗口中：

```bash
npm run dev:client
```

客户端应用将在 http://localhost:5173 启动（Vite 默认端口）。

### 4. 访问应用

在浏览器中打开 http://localhost:5173，你应该能看到：

- ✅ API 连接状态指示器（绿色表示已连接）
- 🎨 图标展示网格
- 📦 不同尺寸和颜色的图标示例
- 🔘 按钮中的图标使用示例

## 配置说明

### Iconify 配置

客户端配置位于 `packages/client/src/iconify-config.ts`：

```typescript
import { addAPIProvider, disableCache } from '@iconify/react';

export function configureIconify() {
  // 配置自定义 API provider
  addAPIProvider('', {
    resources: ['http://localhost:3000'],
    index: 0,
  });
  
  // 开发模式禁用缓存
  if (import.meta.env.DEV) {
    disableCache('all');
  }
}
```

**关键点：**

1. **空字符串 provider 名称**：使其成为默认 provider
2. **resources 数组**：指向本地 API 服务器
3. **index: 0**：最高优先级
4. **禁用缓存**：开发模式下确保获取最新数据

### 修改 API 服务器地址

如果 API 服务器运行在不同的地址或端口：

1. 创建 `packages/client/.env` 文件：

```env
VITE_API_URL=http://localhost:3000
```

2. 更新 `iconify-config.ts`：

```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

addAPIProvider('', {
  resources: [apiUrl],
  index: 0,
});
```

## 使用图标

### 基础用法

```tsx
import { Icon } from '@iconify/react';

function MyComponent() {
  return <Icon icon="gd:logo" width="24" height="24" />;
}
```

### 可用图标

当前 "gd" 命名空间包含：

- `gd:logo` - Logo 图标
- `gd:menu` - 菜单图标
- `gd:home` - 首页图标
- `gd:search` - 搜索图标

### 更多示例

查看 `examples/react-usage.tsx` 获取完整的使用示例，包括：

- 不同尺寸和颜色
- 按钮和导航中的图标
- 图标变换（旋转、翻转）
- 可访问性最佳实践
- 自定义图标组件

## 工作原理

### 图标加载流程

1. **组件渲染**：`<Icon icon="gd:logo" />` 被渲染
2. **检查缓存**：Iconify 首先检查本地缓存
3. **API 请求**：如果缓存未命中，向 API 服务器发送请求
   ```
   GET http://localhost:3000/icons?icons=gd:logo
   ```
4. **接收数据**：API 返回 Iconify 格式的图标数据
   ```json
   {
     "gd": {
       "prefix": "gd",
       "icons": {
         "logo": {
           "body": "<path d=\"...\"/>",
           "width": 24,
           "height": 24
         }
       }
     }
   }
   ```
5. **渲染 SVG**：Iconify 将数据转换为 SVG 并渲染
6. **缓存**：图标数据被缓存以供后续使用

### 缓存策略

**客户端缓存（Iconify）：**
- 已加载的图标保存在内存中
- 相同图标的多次使用只需一次网络请求
- 开发模式下可禁用以便测试

**HTTP 缓存：**
- API 服务器设置 Cache-Control 头
- 浏览器缓存图标数据
- 支持 ETag 进行条件请求

## 开发工作流

### 添加新图标

1. 在 API 服务器添加新的 SVG 图标
2. 重启 API 服务器（或等待热重载）
3. 在 React 应用中直接使用：
   ```tsx
   <Icon icon="gd:new-icon" />
   ```

### 调试

**检查 API 连接：**

```bash
curl http://localhost:3000/health
```

**检查图标数据：**

```bash
curl http://localhost:3000/icons?icons=gd:logo
```

**浏览器开发工具：**

1. 打开 Network 标签
2. 筛选 XHR/Fetch 请求
3. 查找对 `/icons` 的请求
4. 检查响应数据和缓存头

### 常见问题

**问题：图标不显示**

解决方案：
1. 检查 API 服务器是否运行：访问 http://localhost:3000/health
2. 检查浏览器控制台错误
3. 确认图标名称正确（必须有 `gd:` 前缀）
4. 检查网络请求是否成功

**问题：CORS 错误**

解决方案：
1. 确保 API 服务器的 CORS 配置正确
2. 检查 `packages/api/.env` 中的 `CORS_ORIGIN` 设置
3. 开发环境可以设置为 `*`

**问题：图标不更新**

解决方案：
1. 清除浏览器缓存
2. 在开发模式下，缓存应该已禁用
3. 检查 API 服务器是否返回新数据
4. 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）

## 测试

### 运行测试

```bash
cd packages/client
npm run test
```

### 手动测试清单

- [ ] API 连接状态正确显示
- [ ] 所有图标正确加载和显示
- [ ] 不同尺寸的图标正确渲染
- [ ] 自定义颜色正确应用
- [ ] 按钮中的图标正确对齐
- [ ] 鼠标悬停效果正常工作
- [ ] 控制台无错误信息
- [ ] 网络请求成功（检查 Network 标签）

## 构建生产版本

### 构建

```bash
npm run build:client
```

构建产物位于 `packages/client/dist/`。

### 预览

```bash
cd packages/client
npm run preview
```

### 部署

构建后的静态文件可以部署到任何静态托管服务：

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- 等等

**重要：** 确保生产环境的 API 服务器地址正确配置。

## 性能优化

### 预加载关键图标

在应用启动时预加载常用图标：

```typescript
import { loadIcons } from '@iconify/react';

// 在 App 组件或 main.tsx 中
loadIcons(['gd:logo', 'gd:menu', 'gd:home', 'gd:search']);
```

### 减少包大小

- ✅ 不包含任何开源图标库
- ✅ 只加载实际使用的图标
- ✅ Iconify React 包很小（~10KB gzipped）

### 优化加载性能

1. **使用 HTTP/2**：支持多路复用
2. **启用压缩**：gzip 或 brotli
3. **设置适当的缓存头**：API 服务器已配置
4. **CDN**：考虑使用 CDN 加速 API 请求

## 需求验证

本客户端实现满足以下需求：

- ✅ **需求 1.2**：React 客户端请求 "gd" 命名空间的图标
- ✅ **需求 1.4**：仅从自建 API 服务获取图标数据
- ✅ **需求 6.1**：配置 Iconify 仅使用自建 API 服务端点
- ✅ **需求 6.2**：支持 "gd:icon-name" 格式的图标引用
- ✅ **需求 6.3**：图标加载失败时应用不崩溃
- ✅ **需求 6.4**：多个组件使用相同图标时复用数据
- ✅ **需求 6.5**：不包含任何开源图标库的代码或数据

## 下一步

1. **添加更多图标**：通过 API 上传接口（任务 10）
2. **Figma 集成**：自动从 Figma 同步图标（任务 17-22）
3. **图标管理界面**：创建管理界面上传和管理图标
4. **图标搜索**：实现图标搜索和浏览功能

## 相关文档

- [项目主 README](./README.md)
- [API 服务器文档](./packages/api/README.md)
- [客户端 README](./packages/client/README.md)
- [React 使用示例](./examples/react-usage.tsx)
- [Iconify React 官方文档](https://docs.iconify.design/icon-components/react/)

## 支持

如有问题或需要帮助，请查看：

1. 浏览器控制台错误信息
2. API 服务器日志
3. 本文档的故障排除部分
4. Iconify 官方文档
