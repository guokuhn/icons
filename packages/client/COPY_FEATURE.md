# 图标复制功能

## 功能说明

在图标库界面中，你可以通过点击任意图标卡片来快速复制图标的完整名称（格式：`gd:icon-name`）到剪贴板。

## 使用方法

### 1. 点击图标卡片

只需点击任意图标卡片，图标名称会自动复制到剪贴板。

### 2. 查看复制成功提示

点击后，卡片右上角会显示 "✓ 已复制" 的绿色提示，2秒后自动消失。

### 3. 粘贴使用

复制后，你可以在代码中直接粘贴使用：

```tsx
import { Icon } from '@iconify/react';

// 粘贴复制的图标名称
<Icon icon="gd:icon-test" width="24" height="24" />
```

## 功能特点

### ✅ 自动格式化

- 自动添加命名空间前缀 `gd:`
- 复制的格式可以直接在代码中使用

### ✅ 视觉反馈

- 鼠标悬停时卡片高亮
- 点击后显示复制成功提示
- 提示自动消失，不干扰操作

### ✅ 兼容性

- 优先使用现代 Clipboard API
- 自动降级到传统复制方法
- 支持所有主流浏览器

### ✅ 用户体验

- 单击即可复制，无需额外操作
- 鼠标悬停显示提示文本
- 不影响查看 SVG 详情功能

## 技术实现

### 复制功能

```typescript
const copyIconName = async (iconName: string) => {
  const fullIconName = `gd:${iconName}`;
  try {
    // 使用现代 Clipboard API
    await navigator.clipboard.writeText(fullIconName);
    setCopiedIcon(iconName);
    setTimeout(() => setCopiedIcon(null), 2000);
  } catch (err) {
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea');
    textArea.value = fullIconName;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};
```

### 视觉反馈

- 使用 React state 管理复制状态
- CSS 动画实现流畅的提示效果
- 自动清除提示避免干扰

## 示例

### 复制单个图标

1. 点击 "icon-test" 卡片
2. 看到 "✓ 已复制" 提示
3. 在代码中粘贴：`gd:icon-test`

### 快速使用多个图标

1. 点击第一个图标 → 复制 `gd:icon-home`
2. 粘贴到代码中
3. 点击第二个图标 → 复制 `gd:icon-menu`
4. 粘贴到代码中

## 注意事项

### 浏览器权限

某些浏览器可能需要用户授权才能使用剪贴板功能。如果复制失败：

1. 检查浏览器控制台是否有权限错误
2. 确保网站有剪贴板访问权限
3. 系统会自动使用降级方案

### 点击区域

- 点击图标卡片的任意位置都会触发复制
- 点击 "查看 SVG" 详情不会触发复制（已阻止事件冒泡）

## 快捷键（未来功能）

计划添加的功能：

- `Ctrl/Cmd + C`: 复制选中的图标
- `Ctrl/Cmd + A`: 全选图标
- 批量复制多个图标名称

## 相关文档

- `USAGE.md` - 完整使用指南
- `FEATURES.md` - 所有功能列表
- `README.md` - 项目概述
