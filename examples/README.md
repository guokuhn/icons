# GD 图标库使用示例

本目录包含了如何使用 GD 私有图标库的各种示例。

## 文件说明

### `load-icons.ts`
演示如何使用 `IconSetManager` 加载和管理图标集。

运行示例：
```bash
cd packages/api
npm run build
cd ../..
npx tsx examples/load-icons.ts
```

### `react-usage.tsx`
展示在 React 应用中使用 GD 图标的各种方式，包括：
- 基础图标使用
- 自定义颜色和样式
- 图标旋转和翻转
- 在按钮中使用图标
- 响应式图标大小

## 当前可用图标

| 图标名称 | 用途 | 使用方式 |
|---------|------|---------|
| `logo` | Logo/品牌标识 | `<Icon icon="gd:logo" />` |
| `menu` | 菜单/汉堡按钮 | `<Icon icon="gd:menu" />` |
| `home` | 首页/主页 | `<Icon icon="gd:home" />` |
| `search` | 搜索功能 | `<Icon icon="gd:search" />` |

## React 集成步骤

### 1. 配置 Iconify

在应用入口文件中配置自定义 API：

```typescript
// src/iconify-config.ts
import { addAPIProvider } from '@iconify/react';

export function configureIconify() {
  addAPIProvider('custom', {
    resources: ['http://localhost:3000'],
  });
}
```

### 2. 初始化配置

```typescript
// src/main.tsx
import { configureIconify } from './iconify-config';

configureIconify();
```

### 3. 使用图标

```tsx
import { Icon } from '@iconify/react';

function App() {
  return (
    <div>
      <Icon icon="gd:logo" width="24" height="24" />
    </div>
  );
}
```

## 图标属性

### 基础属性

- `icon`: 图标名称（格式：`gd:icon-name`）
- `width`: 宽度（数字或字符串）
- `height`: 高度（数字或字符串）
- `color`: 颜色（CSS 颜色值）

### 变换属性

- `rotate`: 旋转（0-3，每个单位 90 度）
- `hFlip`: 水平翻转（boolean）
- `vFlip`: 垂直翻转（boolean）

### 样式属性

- `style`: 内联样式对象
- `className`: CSS 类名

## 示例场景

### 导航栏

```tsx
<nav>
  <Icon icon="gd:logo" width="32" />
  <Icon icon="gd:home" width="20" />
  <Icon icon="gd:search" width="20" />
  <Icon icon="gd:menu" width="24" />
</nav>
```

### 按钮

```tsx
<button>
  <Icon icon="gd:search" width="16" />
  <span>搜索</span>
</button>
```

### 列表项

```tsx
<ul>
  <li>
    <Icon icon="gd:home" width="18" />
    <span>首页</span>
  </li>
</ul>
```

## 性能优化

### 1. 图标预加载

```typescript
import { loadIcons } from '@iconify/react';

// 预加载常用图标
loadIcons(['gd:logo', 'gd:menu', 'gd:home', 'gd:search']);
```

### 2. 缓存策略

API 服务器已配置 24 小时缓存，浏览器会自动缓存图标数据。

### 3. 按需加载

Iconify 会自动按需加载图标，只有使用的图标才会被请求。

## 故障排除

### 图标不显示

1. 检查 API 服务是否运行：`http://localhost:3000/collections`
2. 检查浏览器控制台是否有错误
3. 确认图标名称正确（区分大小写）

### 图标加载慢

1. 检查网络连接
2. 使用预加载功能
3. 检查 API 服务器性能

### 样式问题

1. 确保设置了 `width` 和 `height`
2. 检查 CSS 是否覆盖了图标样式
3. 使用 `style` 属性而不是 CSS 类来设置颜色

## 更多资源

- [Iconify React 文档](https://iconify.design/docs/icon-components/react/)
- [Iconify API 规范](https://iconify.design/docs/api/)
- [项目设计文档](../.kiro/specs/iconify-private-library/design.md)
