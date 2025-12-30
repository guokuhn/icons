# 图标删除功能

## 功能概述

为客户端添加了删除图标的功能，用户可以直接在界面上删除不需要的图标。

## 功能特性

### 1. 删除按钮
- 每个图标卡片右上角有红色的删除按钮（×）
- 鼠标悬停到图标卡片时，删除按钮才会显示
- 鼠标悬停到删除按钮时会高亮显示并放大
- 删除过程中按钮显示 "..." 并禁用

### 2. 安全确认
- 点击删除按钮会弹出浏览器原生确认对话框
- 防止误删操作
- 明确显示要删除的图标名称

### 3. 实时更新
- 删除成功后自动刷新图标列表
- 不需要手动刷新页面
- 分组计数会自动更新

### 4. 错误处理
- 删除失败时显示具体错误信息
- 网络错误、权限错误等都有相应提示
- 使用浏览器原生 alert 显示错误

## 使用方法

1. **找到要删除的图标**
   - 在图标网格中找到目标图标

2. **显示删除按钮**
   - 鼠标悬停到图标卡片上
   - 右上角会出现红色的 × 按钮

3. **点击删除按钮**
   - 点击红色 × 按钮
   - 注意：点击删除按钮不会触发复制功能（事件冒泡已阻止）

4. **确认删除**
   - 在弹出的确认对话框中点击「确定」
   - 或点击「取消」放弃删除

5. **查看结果**
   - 删除成功：图标列表自动刷新，图标消失
   - 删除失败：显示错误提示

## 技术实现

### API 调用
```javascript
DELETE /api/icons/:namespace/:name
Headers: {
  'x-api-key': 'dev-api-key-12345'
}
```

### 状态管理
- 使用 React 的 `useState` 管理删除状态
- `deletingIcon`: 记录正在删除的图标名称
- 删除成功后调用 `loadIcons()` 重新加载图标列表

### 用户体验
- **事件冒泡控制**：删除按钮点击使用 `event.stopPropagation()` 防止触发复制功能
- **CSS 动画**：平滑的悬停效果和按钮变化
- **视觉反馈**：
  - 删除按钮只在悬停时显示（opacity: 0 → 0.8）
  - 悬停到删除按钮时完全显示并放大（opacity: 1, scale: 1.1）
  - 删除过程中按钮显示 "..." 并禁用
- **位置调整**：复制成功提示移到左上角，避免与删除按钮冲突

### 代码结构
```typescript
// 删除图标函数
const deleteIcon = async (iconName: string, event: React.MouseEvent) => {
  event.stopPropagation(); // 防止触发复制
  
  if (!window.confirm(`确定要删除图标 "${iconName}" 吗？此操作不可撤销。`)) {
    return;
  }
  
  setDeletingIcon(iconName);
  
  try {
    const response = await fetch(`http://localhost:3000/api/icons/gd/${iconName}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey },
    });
    
    if (response.ok) {
      await loadIcons(); // 刷新列表
    } else {
      // 错误处理
    }
  } finally {
    setDeletingIcon(null);
  }
};
```

## 测试

可以通过以下步骤测试删除功能：

1. 启动 API 服务器：`cd packages/api && npm run dev`
2. 启动客户端：`cd packages/client && npm run dev`
3. 在浏览器中打开客户端
4. 上传一个测试图标
5. 悬停到图标卡片，点击删除按钮
6. 确认删除
7. 验证图标已从列表中消失

## 注意事项

1. **权限要求**
   - 需要有效的 API 密钥（默认：dev-api-key-12345）
   - 删除操作不可撤销

2. **网络要求**
   - 需要连接到 API 服务器 (http://localhost:3000)
   - 删除失败时会显示具体错误信息

3. **浏览器兼容性**
   - 使用现代浏览器的 `window.confirm()` API
   - 支持 ES6+ 语法

## 相关需求

此功能实现了需求文档中的：
- **需求 2.5**: "WHEN 管理员请求删除图标 THEN Iconify API 服务 SHALL 从图标集中移除该图标并更新元数据"

## 未来改进

- [ ] 批量删除功能
- [ ] 删除历史记录
- [ ] 回收站功能（软删除）
- [ ] 删除权限控制
- [ ] 删除操作日志
- [ ] 更优雅的确认对话框（替代浏览器原生 confirm）
- [ ] 撤销删除功能
