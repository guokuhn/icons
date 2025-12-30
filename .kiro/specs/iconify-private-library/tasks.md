# 实施计划

- [x] 1. 初始化项目结构和依赖
  - 创建 monorepo 结构，包含 API 服务和 React 客户端两个包
  - 配置 TypeScript、ESLint、Prettier
  - 安装核心依赖：Express、@iconify/tools、node-cache、@iconify/react
  - 设置环境变量配置（.env 文件和类型定义）
  - _需求: 1.1, 1.2_

- [x] 2. 实现 SVG 解析和转换核心功能
  - 编写 SVGParser 类，使用 @iconify/tools 解析 SVG
  - 实现 parseSVG 方法：提取 viewBox、width、height、path 数据
  - 实现 validateSVG 方法：验证 SVG 格式有效性
  - 实现 optimizeSVG 方法：清理和优化 SVG 代码
  - 实现 extractMetadata 方法：提取 SVG 元数据
  - _需求: 1.1, 1.3_

- [ ]* 2.1 编写 SVG 解析器的属性测试
  - **属性 1: SVG 到 Iconify 格式转换**
  - **验证需求: 1.1, 1.3, 3.3**
  - 创建有效 SVG 生成器
  - 测试解析后的数据包含必需字段

- [ ]* 2.2 编写 SVG 解析器的属性测试
  - **属性 3: 无效 SVG 拒绝**
  - **验证需求: 2.2**
  - 创建无效 SVG 生成器
  - 测试拒绝行为和错误信息

- [x] 3. 实现存储层
  - 编写 StorageLayer 类，管理文件系统操作
  - 实现 saveIcon 方法：保存图标 JSON 文件
  - 实现 readIcon 方法：读取图标数据
  - 实现 deleteIcon 方法：删除图标文件
  - 实现 listIcons 方法：列出命名空间下所有图标
  - 实现 saveIconSetMetadata 和 readIconSetMetadata 方法
  - 创建目录结构：icons/gd/icons/, icons/gd/versions/, icons/gd/source/
  - _需求: 1.1, 2.1_

- [ ]* 3.1 编写存储层单元测试
  - 测试文件读写操作
  - 测试目录创建
  - 测试错误处理（文件不存在、权限错误等）

- [x] 4. 实现图标集管理器
  - 编写 IconSetManager 类，管理图标集生命周期
  - 实现 loadIconSet 方法：从存储层加载完整图标集
  - 实现 addIcon 方法：添加新图标（调用 SVGParser 和 StorageLayer）
  - 实现 updateIcon 方法：更新现有图标
  - 实现 removeIcon 方法：删除图标
  - 实现 getIcon 方法：获取单个图标
  - 实现 getAllIcons 方法：获取所有图标
  - _需求: 1.1, 1.2, 2.1, 2.5_

- [ ]* 4.1 编写图标集管理器的属性测试
  - **属性 2: 图标请求响应完整性**
  - **验证需求: 1.2, 1.5, 5.3**
  - 生成随机图标名称和数据
  - 测试添加后能正确获取

- [ ]* 4.2 编写图标集管理器的属性测试
  - **属性 5: 图标删除完全移除**
  - **验证需求: 2.5**
  - 测试删除后图标不可访问

- [x] 5. 实现缓存管理器
  - 编写 CacheManager 类，实现多层缓存
  - 使用 node-cache 实现内存缓存
  - 实现 getCachedIconSet 和 cacheIconSet 方法
  - 实现 invalidateCache 方法：缓存失效逻辑
  - 实现 generateETag 方法：基于内容生成 ETag
  - 实现 getCacheHeaders 方法：生成 HTTP 缓存头（Cache-Control, ETag, Last-Modified）
  - 设置缓存 TTL 为 24 小时
  - _需求: 4.1, 4.2, 4.4_

- [ ]* 5.1 编写缓存管理器的属性测试
  - **属性 7: HTTP 缓存头完整性**
  - **验证需求: 4.1, 4.2, 4.4**
  - 测试缓存头包含所有必需字段
  - 验证 max-age >= 3600

- [ ]* 5.2 编写缓存管理器的属性测试
  - **属性 9: 缓存失效机制**
  - **验证需求: 4.5, 8.4**
  - 测试更新后 ETag 变化

- [x] 6. 实现 HTTP 服务器和基础路由
  - 创建 Express 应用
  - 配置 CORS、JSON 解析、错误处理中间件
  - 实现 GET /collections 端点：返回图标集列表
  - 实现 GET /collection?prefix=gd 端点：返回完整图标集
  - 实现 GET /icons?icons=gd:icon1,gd:icon2 端点：返回指定图标
  - 集成 CacheManager，为所有响应添加缓存头
  - 实现条件请求支持（If-None-Match，返回 304）
  - _需求: 1.2, 4.1, 4.3, 5.1, 5.2, 5.3_

- [ ]* 6.1 编写 API 端点的属性测试
  - **属性 8: 条件请求 304 响应**
  - **验证需求: 4.3**
  - 测试带 If-None-Match 的请求返回 304

- [ ]* 6.2 编写 API 端点的属性测试
  - **属性 11: 图标集列表格式符合规范**
  - **验证需求: 5.1**
  - 验证响应 JSON 结构

- [ ]* 6.3 编写 API 端点的属性测试
  - **属性 12: 图标集响应包含所有图标**
  - **验证需求: 5.2**
  - 测试图标集包含所有添加的图标

- [ ]* 6.4 编写 API 端点的属性测试
  - **属性 14: 不存在资源返回 404**
  - **验证需求: 5.5, 7.2**
  - 测试请求不存在的图标返回 404

- [x] 7. 实现错误处理和日志系统
  - 配置 Winston 日志库
  - 实现统一的错误响应格式（ErrorResponse 接口）
  - 实现全局错误处理中间件
  - 为 SVGParser、StorageLayer、IconSetManager 添加错误日志
  - 实现错误分类：客户端错误（4xx）和服务器错误（5xx）
  - _需求: 7.1, 7.2, 7.3_

- [ ]* 7.1 编写错误处理的属性测试
  - **属性 15: 错误日志记录完整性**
  - **验证需求: 7.1, 7.3, 7.4**
  - 触发各种错误，验证日志内容

- [ ]* 7.2 编写错误处理的属性测试
  - **属性 16: 错误隔离不影响服务**
  - **验证需求: 7.3, 3.5**
  - 模拟单个图标错误，验证其他请求正常

- [x] 8. 配置 React 客户端
  - 创建 React 应用（使用 Vite 或 Create React App）
  - 安装 @iconify/react
  - 编写 iconify-config.ts：配置自定义 API provider
  - 使用 addAPIProvider 指向本地 API 服务
  - 创建示例组件展示图标使用
  - 确保不加载任何开源图标库
  - _需求: 1.2, 1.4, 6.1, 6.2, 6.5_

- [ ]* 8.1 编写 React 客户端的属性测试
  - **属性 10: 客户端缓存复用**
  - **验证需求: 6.4**
  - 测试多个组件使用相同图标只发送一次请求

- [ ]* 8.2 编写 React 客户端的属性测试
  - **属性 17: React 应用错误容错**
  - **验证需求: 6.3**
  - 模拟加载失败，验证应用不崩溃

- [ ] 9. 阶段 1 检查点
  - 确保所有测试通过，如有问题请询问用户

- [x] 10. 实现图标上传 API（阶段 2）
  - 安装和配置 multer 中间件处理文件上传
  - 实现 POST /api/upload 端点
  - 验证上传的文件是有效的 SVG
  - 验证图标名称格式（字母、数字、连字符、下划线，1-50 字符）
  - 实现文件大小限制（最大 1MB）
  - 调用 IconSetManager.addIcon 保存图标
  - 返回成功响应或错误信息
  - _需求: 2.1, 2.2_

- [ ]* 10.1 编写上传 API 的属性测试
  - **属性 4: 图标上传立即可用**
  - **验证需求: 2.1, 2.4**
  - 上传随机图标，立即请求，验证可用性

- [x] 11. 实现图标名称冲突处理
  - 在 IconSetManager.addIcon 中添加冲突检测
  - 支持配置选项：覆盖（overwrite）或拒绝（reject）
  - 当配置为拒绝时，返回 409 Conflict 状态码
  - 当配置为覆盖时，更新现有图标并保存版本
  - _需求: 2.3_

- [ ]* 11.1 编写冲突处理的属性测试
  - **属性 6: 图标名称冲突处理**
  - **验证需求: 2.3**
  - 测试两种配置下的行为一致性

- [x] 12. 实现图标删除 API
  - 实现 DELETE /api/icons/:name 端点
  - 验证图标存在
  - 调用 IconSetManager.removeIcon 删除图标
  - 调用 CacheManager.invalidateCache 使缓存失效
  - 返回成功响应或 404 错误
  - _需求: 2.5_

- [x] 13. 实现版本管理系统
  - 在 IconSetManager 中实现 saveVersion 方法
  - 每次更新图标时自动保存版本到 icons/gd/versions/{name}/ 目录
  - 版本文件命名格式：v{timestamp}.json
  - 实现 getVersionHistory 方法：读取并返回所有版本
  - 实现 rollbackToVersion 方法：恢复到指定版本
  - _需求: 8.1, 8.2, 8.3_

- [ ] 14. 实现版本管理 API 端点
  - 实现 GET /api/icons/:name/versions 端点：返回版本历史
  - 实现 POST /api/icons/:name/rollback 端点：回滚到指定版本
  - 请求体包含 versionId
  - 回滚后使缓存失效
  - _需求: 8.2, 8.3_

- [ ]* 14.1 编写版本管理的属性测试
  - **属性 19: 版本历史完整性**
  - **验证需求: 8.1, 8.2**
  - 多次更新图标，验证版本历史完整

- [ ]* 14.2 编写版本管理的属性测试
  - **属性 20: 版本回滚恢复数据**
  - **验证需求: 8.3**
  - 创建版本，回滚，验证数据一致性

- [x] 15. 实现 API 认证和速率限制
  - 配置 express-rate-limit 中间件
  - 读取端点：1000 请求/分钟/IP
  - 写入端点：100 请求/分钟/IP
  - 实现 API 密钥认证中间件（从环境变量读取）
  - 保护写入端点（POST, DELETE）需要认证
  - 返回 401 Unauthorized 或 429 Too Many Requests
  - _需求: 2.1, 2.5_

- [x] 15.1 实现 CORS 配置管理器
  - 创建 CorsConfigManager 类
  - 实现 parseConfig 方法：解析环境变量 CORS_ORIGIN
  - 支持单个域名、多个域名（逗号分隔）、通配符 `*`、空值
  - 实现 validateConfig 方法：验证域名格式（协议、URL 有效性）
  - 实现 isOriginAllowed 方法：检查请求源是否在允许列表中
  - 实现 getCorsMiddlewareConfig 方法：生成 CORS 中间件配置
  - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 15.2 编写 CORS 配置管理器单元测试
  - 测试单个域名配置解析
  - 测试多个域名配置解析（逗号分隔）
  - 测试通配符 `*` 配置
  - 测试空配置或未设置的情况
  - 测试无效 URL 格式的处理
  - 测试配置验证逻辑（错误和警告）
  - 测试 isOriginAllowed 方法的各种场景

- [ ]* 15.3 编写 CORS 配置的属性测试
  - **属性 21: CORS 配置解析正确性**
  - **验证需求: 9.1**
  - 生成随机 CORS 配置字符串
  - 验证解析结果的正确性

- [ ]* 15.4 编写 CORS 配置的属性测试
  - **属性 22: 允许域名请求被接受**
  - **验证需求: 9.2**
  - 生成随机允许的域名
  - 验证请求被接受且响应头正确

- [ ]* 15.5 编写 CORS 配置的属性测试
  - **属性 23: 未授权域名请求被拒绝**
  - **验证需求: 9.3**
  - 生成随机未授权域名
  - 验证请求被拒绝

- [x] 15.6 集成 CORS 配置到 Express 应用
  - 在应用启动时初始化 CorsConfigManager
  - 解析 process.env.CORS_ORIGIN
  - 验证配置并记录错误/警告
  - 应用 CORS 中间件到 Express app
  - 记录配置信息到日志（允许的域名列表或通配符状态）
  - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 15.7 编写 CORS 集成测试
  - 测试从允许域名发起的跨域请求
  - 测试从未授权域名发起的跨域请求
  - 测试 CORS 预检请求（OPTIONS 方法）
  - 测试通配符配置下的请求
  - 测试空配置下的请求

- [x] 15.8 更新 .env 配置文件
  - 添加 CORS_ORIGIN 配置说明注释
  - 提供单个域名、多个域名、通配符的示例
  - 更新 .env.example 文件
  - _需求: 9.1_

- [x] 15.9 更新文档
  - 在 README.md 中添加 CORS 配置说明
  - 说明不同环境的推荐配置
  - 添加安全最佳实践（生产环境避免使用通配符）
  - 提供配置示例和故障排除指南
  - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 16. 阶段 2 检查点
  - 确保所有测试通过，如有问题请询问用户

- [x] 17. 实现 Figma API 客户端（阶段 3）
  - 安装 axios
  - 编写 FigmaIntegrator 类
  - 实现 connect 方法：验证 API 令牌和文件 ID
  - 实现 fetchIconComponents 方法：调用 Figma API 获取文件组件
  - 解析 Figma API 响应，提取组件列表
  - 实现错误处理和日志记录
  - _需求: 3.1_

- [x] 18. 实现 Figma 组件识别和导出
  - 实现 FigmaIntegrator.exportComponentAsSVG 方法
  - 调用 Figma API 导出组件为 SVG
  - 实现组件过滤逻辑：根据命名约定或标签识别图标
  - 处理 Figma API 的分页和限流
  - _需求: 3.2, 3.3_

- [ ]* 18.1 编写 Figma 集成的属性测试
  - **属性 21: Figma 组件识别**
  - **验证需求: 3.2**
  - 模拟 Figma API 响应，测试组件识别

- [x] 19. 实现 Figma 同步功能
  - 实现 FigmaIntegrator.syncAllIcons 方法
  - 遍历所有识别的图标组件
  - 导出 SVG 并调用 IconSetManager.addIcon 保存
  - 实现增量同步：只更新变化的图标
  - 返回 SyncResult（成功数量、失败数量、错误列表）
  - 实现 syncIcon 方法：同步单个图标
  - _需求: 3.3, 3.4_

- [x] 20. 实现 Figma API 错误处理和重试
  - 实现指数退避重试策略（初始延迟 1 秒，最多 3 次）
  - 设置请求超时为 30 秒
  - 捕获网络错误、API 错误、超时错误
  - 记录详细的错误日志
  - 确保 Figma API 失败不影响现有图标库服务
  - _需求: 3.5, 7.4_

- [ ]* 20.1 编写 Figma 错误处理的属性测试
  - **属性 18: Figma API 重试机制**
  - **验证需求: 7.4**
  - 模拟 API 失败，验证重试行为

- [x] 21. 实现 Figma 同步 API 端点
  - 实现 POST /api/sync/figma 端点
  - 需要管理员认证
  - 支持查询参数：full（完全同步）或 incremental（增量同步）
  - 调用 FigmaIntegrator.syncAllIcons
  - 返回同步结果
  - _需求: 3.3, 3.4_

- [x] 22. 配置 Figma 集成环境变量
  - 在 .env 文件中添加 FIGMA_API_TOKEN 和 FIGMA_FILE_ID
  - 在应用启动时验证 Figma 配置（如果启用）
  - 记录 Figma 集成状态
  - _需求: 3.1_

- [x] 23. 实现健康检查端点
  - 实现 GET /health 端点
  - 检查存储层状态
  - 检查缓存状态
  - 检查 Figma 连接状态（如果配置）
  - 返回系统统计信息（图标总数、运行时间）
  - _需求: 7.5_

- [ ] 24. 编写部署文档
  - 创建 README.md：项目概述和快速开始
  - 创建 DEPLOYMENT.md：部署指南
  - 文档化环境变量配置
  - 提供 Docker 配置示例（Dockerfile 和 docker-compose.yml）
  - 文档化 API 端点（可选：使用 OpenAPI/Swagger）
  - _需求: 所有_

- [ ] 25. 最终检查点
  - 确保所有测试通过，如有问题请询问用户
