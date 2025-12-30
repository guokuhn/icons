# 故障排除指南

## 图标不显示的常见原因和解决方法

### 问题 1: 图标显示为空白或问号

#### 可能原因：
1. API 服务器没有运行
2. API 服务器缓存了旧数据
3. 浏览器缓存问题
4. Iconify 客户端缓存问题

#### 解决方法：

**步骤 1: 检查 API 服务器**
```bash
# 确保 API 服务器正在运行
cd packages/api
npm run dev
```

**步骤 2: 重启 API 服务器**
```bash
# 停止服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

**步骤 3: 清除浏览器缓存**
- Chrome/Edge: `Ctrl+Shift+Delete` 或 `Cmd+Shift+Delete`
- 选择"缓存的图片和文件"
- 点击"清除数据"

**步骤 4: 硬刷新页面**
- Windows: `Ctrl+Shift+R` 或 `Ctrl+F5`
- Mac: `Cmd+Shift+R`

**步骤 5: 禁用 Iconify 缓存（开发模式）**

检查 `packages/client/src/iconify-config.ts` 是否包含：
```typescript
if (import.meta.env.DEV) {
  disableCache('all');
}
```

### 问题 2: 上传成功但图标不显示

#### 解决方法：

**方法 1: 点击刷新按钮**
- 在图标列表右上角点击 "🔄 刷新" 按钮

**方法 2: 重启 API 服务器**
```bash
# 在 packages/api 目录
# 停止服务器 (Ctrl+C)
npm run dev
```

**方法 3: 检查图标文件**
```bash
# 查看图标文件是否存在
ls packages/api/icons/gd/icons/

# 查看图标文件内容
cat packages/api/icons/gd/icons/your-icon-name.json
```

图标文件应该包含：
```json
{
  "body": "<path d=\"...\"/>",
  "width": 24,
  "height": 24
}
```

### 问题 3: API 连接失败

#### 症状：
- 显示 "❌ 连接失败" 错误
- 图标列表为空

#### 解决方法：

**检查 API 服务器状态：**
```bash
# 测试 API 是否响应
curl http://localhost:3000/health

# 应该返回：
# {"status":"healthy","timestamp":...}
```

**检查端口占用：**
```bash
# Mac/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**更改端口（如果 3000 被占用）：**

在 `packages/api/.env` 中：
```env
PORT=3001
```

然后更新客户端 API 地址。

### 问题 4: 图标显示但样式不对

#### 可能原因：
- SVG 路径数据不完整
- viewBox 设置不正确
- 颜色被硬编码在 SVG 中

#### 解决方法：

**检查 SVG 文件：**
```svg
<!-- 好的 SVG（使用 currentColor） -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2L2 7v10..." fill="currentColor"/>
</svg>

<!-- 不好的 SVG（硬编码颜色） -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2L2 7v10..." fill="#000000"/>
</svg>
```

**优化 SVG：**
1. 移除硬编码的颜色
2. 使用 `currentColor` 或不设置 fill
3. 确保有正确的 viewBox

### 问题 5: 控制台错误

#### 常见错误和解决方法：

**错误: "Failed to fetch"**
```
解决方法：
1. 确保 API 服务器运行在 http://localhost:3000
2. 检查 CORS 配置
3. 检查防火墙设置
```

**错误: "401 Unauthorized"**
```
解决方法：
1. 检查 API Key 是否正确
2. 默认 Key: dev-api-key-12345
3. 检查 .env 文件中的 API_KEY 配置
```

**错误: "Icon not found"**
```
解决方法：
1. 检查图标名称拼写
2. 确保使用正确的命名空间 (gd:icon-name)
3. 刷新图标列表
```

## 调试步骤

### 1. 使用浏览器开发者工具

**打开控制台：**
- Windows: `F12` 或 `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

**检查网络请求：**
1. 切换到 "Network" 标签
2. 刷新页面
3. 查找 `gd.json` 请求
4. 检查响应内容

**检查控制台日志：**
- 查看是否有错误消息
- 查看 "Loaded icon data" 日志
- 查看 "Icon list" 日志

### 2. 测试 API 端点

**在浏览器中直接访问：**
```
http://localhost:3000/health
http://localhost:3000/gd.json
http://localhost:3000/collections
```

**使用 curl 测试：**
```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试图标列表
curl http://localhost:3000/gd.json

# 测试特定图标
curl "http://localhost:3000/icons?icons=gd:touxiang"
```

### 3. 检查文件系统

**查看图标文件：**
```bash
# 列出所有图标
ls -la packages/api/icons/gd/icons/

# 查看图标内容
cat packages/api/icons/gd/icons/touxiang.json
```

**检查文件权限：**
```bash
# 确保文件可读
chmod 644 packages/api/icons/gd/icons/*.json
```

### 4. 使用调试信息

在客户端页面底部，展开 "🔍 调试信息" 部分：

- 查看 API 状态
- 查看图标数量
- 点击测试链接
- 查看图标列表

## 完整重置流程

如果以上方法都不行，尝试完全重置：

```bash
# 1. 停止所有服务
# Ctrl+C 停止 API 和客户端

# 2. 清除 node_modules 和重新安装
cd packages/api
rm -rf node_modules package-lock.json
npm install

cd ../client
rm -rf node_modules package-lock.json
npm install

# 3. 清除构建缓存
cd packages/api
rm -rf dist

# 4. 重启服务
cd packages/api
npm run dev

# 新终端
cd packages/client
npm run dev

# 5. 清除浏览器缓存并硬刷新
```

## 获取帮助

如果问题仍然存在：

1. **检查浏览器控制台**的完整错误信息
2. **检查 API 服务器日志**（终端输出）
3. **查看 API 日志文件**：`packages/api/logs/error.log`
4. **使用调试信息**部分的测试链接
5. **提供以下信息**：
   - 浏览器类型和版本
   - 错误消息截图
   - 控制台日志
   - API 服务器日志

## 常见配置问题

### CORS 错误

如果在浏览器控制台看到 CORS（跨域资源共享）相关错误，这通常意味着 API 服务器没有允许你的客户端域名访问。

#### 常见 CORS 错误消息：

1. **"No 'Access-Control-Allow-Origin' header is present"**
   - API 服务器没有配置 CORS 或配置不正确

2. **"The CORS policy has blocked the request"**
   - 客户端域名不在允许列表中

3. **"Preflight request failed"**
   - OPTIONS 请求被阻止

#### 解决方法：

**开发环境配置：**

在 `packages/api/.env` 中设置：
```env
# 单个域名
CORS_ORIGIN=http://localhost:5173

# 多个域名（逗号分隔）
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

**生产环境配置：**

明确列出所有允许的域名：
```env
CORS_ORIGIN=https://app.example.com,https://admin.example.com,https://www.example.com
```

⚠️ **安全警告**：
- **不要在生产环境使用通配符 `*`** - 这会允许任何网站访问你的 API
- **必须包含完整协议** - `https://` 或 `http://`
- **端口必须匹配** - `:3000` 和 `:5173` 是不同的源
- **子域名需单独配置** - `app.example.com` 和 `admin.example.com` 是不同的源

#### 验证 CORS 配置：

**1. 检查服务器启动日志：**
```
✅ CORS: Allowing 2 origins: http://localhost:5173, http://localhost:3000
```

**2. 测试 CORS 请求：**
```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3000/collections -v
```

应该看到响应头：
```
Access-Control-Allow-Origin: http://localhost:5173
```

**3. 重启 API 服务器：**

修改 `.env` 文件后必须重启服务器：
```bash
# 停止服务器 (Ctrl+C)
npm run dev
```

#### 常见 CORS 配置错误：

❌ **错误**：域名末尾有斜杠
```env
CORS_ORIGIN=http://localhost:5173/
```

✅ **正确**：不要添加斜杠
```env
CORS_ORIGIN=http://localhost:5173
```

❌ **错误**：缺少协议
```env
CORS_ORIGIN=localhost:5173
```

✅ **正确**：包含完整协议
```env
CORS_ORIGIN=http://localhost:5173
```

❌ **错误**：端口不匹配
```env
# 客户端运行在 :5173，但配置了 :3000
CORS_ORIGIN=http://localhost:3000
```

✅ **正确**：端口必须匹配
```env
CORS_ORIGIN=http://localhost:5173
```

📖 **详细文档**：查看 [README.md 的 CORS 配置章节](./README.md#cors-configuration) 了解：
- 完整配置格式说明
- 环境特定推荐配置
- 安全最佳实践
- 详细故障排除指南
- 配置验证方法

### 端口冲突

如果端口被占用，更改端口：

**API 服务器** (`packages/api/.env`):
```env
PORT=3001
```

**客户端** (更新所有 API 调用):
```typescript
// 从 http://localhost:3000 改为 http://localhost:3001
```

### API Key 问题

确保 `packages/api/.env` 中有：
```env
API_KEY=dev-api-key-12345
```

## 预防措施

1. **定期重启 API 服务器**以清除缓存
2. **使用硬刷新**而不是普通刷新
3. **开发时禁用浏览器缓存**
4. **检查文件权限**
5. **保持依赖更新**

## 性能优化

如果图标加载慢：

1. **优化 SVG 文件大小**
2. **启用 HTTP 缓存**
3. **使用 CDN**（生产环境）
4. **压缩响应**（gzip/brotli）
5. **实现懒加载**
