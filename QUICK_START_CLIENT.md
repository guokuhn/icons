# 客户端快速启动指南

## 🚀 快速开始

### 第一步：启动 API 服务器

```bash
cd packages/api
npm run dev
```

等待看到：
```
✅ Iconify API server running on port 3000
```

### 第二步：启动客户端

打开新的终端窗口：

```bash
cd packages/client
npm run dev
```

等待看到：
```
  ➜  Local:   http://localhost:5173/
```

### 第三步：打开浏览器

访问 `http://localhost:5173`

你将看到：
- ✅ API 连接状态（绿色）
- 📊 图标总数
- 🎨 图标网格展示
- ➕ 上传图标按钮

## 📤 上传你的第一个图标

### 1. 准备 SVG 文件

确保你有一个 SVG 文件，例如 `my-icon.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
</svg>
```

### 2. 点击上传按钮

点击右上角的 **"上传图标"** 按钮。

### 3. 填写信息

- **图标名称**：输入 `my-first-icon`
- **选择文件**：选择你的 SVG 文件
- **API Key**：保持默认值 `dev-api-key-12345`

### 4. 上传

点击 **"上传图标"** 按钮。

### 5. 查看结果

- ✅ 看到成功消息
- 🎨 新图标出现在网格中
- 📝 图标名称显示为 `my-first-icon`

## 🎨 使用图标

### 在代码中使用

```tsx
import { Icon } from '@iconify/react';

function MyComponent() {
  return (
    <Icon icon="gd:my-first-icon" width="48" height="48" />
  );
}
```

### 不同尺寸

```tsx
<Icon icon="gd:my-first-icon" width="16" height="16" />
<Icon icon="gd:my-first-icon" width="24" height="24" />
<Icon icon="gd:my-first-icon" width="48" height="48" />
```

### 不同颜色

```tsx
<Icon icon="gd:my-first-icon" style={{ color: '#1976d2' }} />
<Icon icon="gd:my-first-icon" style={{ color: '#388e3c' }} />
<Icon icon="gd:my-first-icon" style={{ color: '#d32f2f' }} />
```

### 在按钮中

```tsx
<button>
  <Icon icon="gd:my-first-icon" width="20" height="20" />
  <span>点击我</span>
</button>
```

## 🔄 刷新图标列表

如果上传后没有看到新图标：

1. 点击图标列表右上角的 **"🔄 刷新"** 按钮
2. 或者刷新浏览器页面（F5）

## ❓ 常见问题

### Q: 看到 "❌ 连接失败" 错误

**解决方法**：
1. 确保 API 服务器正在运行
2. 检查端口 3000 是否被占用
3. 查看 API 服务器终端是否有错误

### Q: 上传失败，提示 "401 Unauthorized"

**解决方法**：
1. 检查 API Key 是否正确
2. 默认开发环境 Key：`dev-api-key-12345`
3. 确保 API 服务器的 `.env` 文件配置正确

### Q: 上传失败，提示 "Invalid icon name format"

**解决方法**：
图标名称只能包含：
- 字母（a-z, A-Z）
- 数字（0-9）
- 连字符（-）
- 下划线（_）

**正确示例**：
- ✅ `my-icon`
- ✅ `user_profile`
- ✅ `icon123`
- ✅ `HOME-ICON`

**错误示例**：
- ❌ `my icon` (包含空格)
- ❌ `icon@123` (包含特殊字符)
- ❌ `icon.svg` (包含点号)

### Q: 上传的文件太大

**解决方法**：
- 最大文件大小：1MB
- 优化你的 SVG 文件
- 移除不必要的元数据和注释

## 📚 更多资源

- **功能文档**：`packages/client/FEATURES.md`
- **使用指南**：`packages/client/USAGE.md`
- **API 文档**：`packages/api/UPLOAD_API.md`
- **安全文档**：`packages/api/SECURITY.md`

## 🎯 下一步

1. ✅ 上传更多自定义图标
2. 🎨 在你的项目中使用图标
3. 📖 阅读完整文档了解更多功能
4. 🚀 部署到生产环境

## 💡 提示

- 图标会立即可用，无需重启服务器
- 所有图标使用 `gd` 命名空间
- 图标支持任意颜色和尺寸
- 可以在任何 React 组件中使用

## 🎉 完成！

你现在已经成功：
- ✅ 启动了 Iconify 私有图标库
- ✅ 上传了第一个自定义图标
- ✅ 学会了如何使用图标

享受你的私有图标库吧！🎨
