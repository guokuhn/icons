# Iconify Private Library - React Client

React 客户端应用，用于展示和使用私有 Iconify 图标库。

## 功能特性

- ✅ 使用 @iconify/react 加载自定义图标
- ✅ 配置自定义 API provider 指向本地 API 服务
- ✅ 仅使用 "gd" 命名空间，不加载任何开源图标库
- ✅ 图标按需加载，自动缓存
- ✅ 错误处理和降级显示

## 技术栈

- React 18
- TypeScript
- Vite
- @iconify/react

## 快速开始

### 前置条件

确保 API 服务器正在运行：

```bash
cd packages/api
npm run dev
```

### 启动客户端

```bash
cd packages/client
npm install
npm run dev
```

访问 http://localhost:5173 查看应用。

## 使用图标

### 基础使用

```tsx
import { Icon } from '@iconify/react';

function MyComponent() {
  return (
    <div>
      <Icon icon="gd:logo" width="24" height="24" />
      <Icon icon="gd:menu" />
      <Icon icon="gd:home" style={{ color: '#1976d2' }} />
    </div>
  );
}
```

### 在按钮中使用

```tsx
<button>
  <Icon icon="gd:search" width="20" height="20" />
  <span>搜索</span>
</button>
```

### 不同尺寸

```tsx
<Icon icon="gd:logo" width="16" height="16" />
<Icon icon="gd:logo" width="24" height="24" />
<Icon icon="gd:logo" width="48" height="48" />
```

### 自定义颜色

```tsx
<Icon icon="gd:home" style={{ color: '#1976d2' }} />
<Icon icon="gd:home" style={{ color: '#388e3c' }} />
```

## 配置说明

### Iconify 配置

配置文件位于 `src/iconify-config.ts`，主要功能：

1. **配置自定义 API provider**：指向本地 API 服务器 (http://localhost:3000)
2. **禁用默认 API**：确保不从 Iconify 公共 API 加载图标
3. **开发模式禁用缓存**：确保始终获取最新图标数据

```typescript
import { addAPIProvider, disableCache } from '@iconify/react';

export function configureIconify() {
  addAPIProvider('', {
    resources: ['http://localhost:3000'],
    index: 0,
  });
  
  if (import.meta.env.DEV) {
    disableCache('all');
  }
}
```

### 环境变量

如需修改 API 服务器地址，可以在 `.env` 文件中配置：

```env
VITE_API_URL=http://localhost:3000
```

然后更新 `iconify-config.ts`：

```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
addAPIProvider('', {
  resources: [apiUrl],
  index: 0,
});
```

## 图标加载流程

1. React 组件渲染 `<Icon icon="gd:logo" />`
2. Iconify 检查本地缓存
3. 如果缓存未命中，向 API 服务器发送请求：
   - `GET /icons?icons=gd:logo`
4. API 服务器返回图标数据（Iconify 格式）
5. Iconify 缓存图标数据并渲染 SVG
6. 后续使用相同图标时直接从缓存读取

## 错误处理

### API 服务器连接失败

应用会在启动时检查 API 服务器健康状态，如果连接失败会显示错误提示。

### 图标加载失败

如果特定图标加载失败，Iconify 会：
- 不渲染任何内容（不会显示破损图标）
- 在控制台输出警告信息
- 不会导致应用崩溃

这符合需求 6.3：图标加载失败时应用不崩溃。

## 可用图标

当前 "gd" 命名空间包含以下图标：

- `gd:logo` - Logo 图标
- `gd:menu` - 菜单图标
- `gd:home` - 首页图标
- `gd:search` - 搜索图标

## 开发指南

### 添加新图标

1. 将 SVG 文件添加到 API 服务器的图标目录
2. 重启 API 服务器（或使用热重载）
3. 在 React 应用中直接使用新图标

### 测试

```bash
npm run test
```

### 构建

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 性能优化

### 图标缓存

- **浏览器缓存**：API 服务器设置了适当的缓存头（Cache-Control, ETag）
- **Iconify 内存缓存**：已加载的图标保存在内存中
- **按需加载**：只加载实际使用的图标

### 最佳实践

1. **预加载关键图标**：在应用启动时预加载常用图标
2. **使用相同尺寸**：尽量使用标准尺寸（16, 24, 32, 48）
3. **避免动态图标名称**：使用静态字符串以便 Iconify 优化

## 故障排除

### 图标不显示

1. 检查 API 服务器是否运行：访问 http://localhost:3000/health
2. 检查浏览器控制台是否有错误信息
3. 检查网络请求：查看是否成功请求图标数据
4. 确认图标名称正确：必须使用 `gd:` 前缀

### CORS 错误

如果遇到 CORS 错误，检查 API 服务器的 CORS 配置：

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));
```

### 缓存问题

开发模式下缓存已禁用。如果生产环境遇到缓存问题：

1. 清除浏览器缓存
2. 检查 API 服务器的 ETag 是否正确更新
3. 使用浏览器开发工具的 "Disable cache" 选项

## 相关文档

- [Iconify React 文档](https://docs.iconify.design/icon-components/react/)
- [Iconify API 规范](https://docs.iconify.design/api/)
- [项目主 README](../../README.md)
- [API 服务器文档](../api/README.md)

## 需求实现

本客户端实现了以下需求：

- **需求 1.2**: React 客户端请求 "gd" 命名空间的图标
- **需求 1.4**: 仅从自建 API 服务获取图标数据
- **需求 6.1**: 配置 Iconify 仅使用自建 API 服务端点
- **需求 6.2**: 支持 "gd:icon-name" 格式的图标引用
- **需求 6.3**: 图标加载失败时不崩溃
- **需求 6.4**: 多个组件使用相同图标时复用数据
- **需求 6.5**: 不包含任何开源图标库的代码或数据
