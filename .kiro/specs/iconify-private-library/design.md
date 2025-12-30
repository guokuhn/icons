# 设计文档

## 概述

本系统是一个完全自建的 Iconify 私有图标库解决方案，包含自建 Iconify API 服务端和 React 客户端集成。系统采用三阶段渐进式开发策略，从基础的文件系统管理到动态 API 上传，最终实现与 Figma 的自动化集成。

核心设计原则：
- 完全自主可控，不依赖任何外部图标库
- 遵循 Iconify API 标准规范，确保与官方客户端库兼容
- 高性能缓存策略，优化图标加载体验
- 模块化架构，支持分阶段实施

## 架构

### 系统架构图

```mermaid
graph TB
    subgraph "React 客户端"
        A[React 应用] --> B[@iconify/react]
        B --> C[Iconify 客户端配置]
    end
    
    subgraph "Iconify API 服务"
        D[HTTP 服务器] --> E[路由层]
        E --> F[图标集管理器]
        E --> G[缓存管理器]
        F --> H[SVG 解析器]
        F --> I[存储层]
    end
    
    subgraph "数据源"
        J[文件系统 - SVG 文件]
        K[上传接口]
        L[Figma API 集成]
    end
    
    C -->|HTTP 请求| D
    I --> J
    K --> F
    L --> F
    G --> M[内存缓存]
    G --> N[HTTP 缓存头]
```

### 技术栈

**后端服务:**
- Node.js + Express (或 Fastify) - HTTP 服务器
- TypeScript - 类型安全
- @iconify/tools - SVG 处理和图标集生成
- node-cache - 内存缓存

**前端客户端:**
- React 18+
- @iconify/react - 图标组件
- TypeScript

**第三方集成:**
- Figma REST API - 图标导入

## 组件和接口

### 1. Iconify API 服务端

#### 1.1 HTTP 服务器 (Express/Fastify)

负责处理所有 HTTP 请求，提供 RESTful API 端点。

**主要端点:**

```typescript
// 获取图标集列表
GET /collections

// 获取特定图标集的所有图标
GET /collection?prefix=gd

// 获取单个或多个图标
GET /icons?icons=gd:icon1,gd:icon2

// 上传图标 (阶段 2)
POST /api/upload
Content-Type: multipart/form-data

// 删除图标 (阶段 2)
DELETE /api/icons/:name

// 触发 Figma 同步 (阶段 3)
POST /api/sync/figma

// 查看图标历史版本
GET /api/icons/:name/versions

// 回滚图标版本
POST /api/icons/:name/rollback
```

#### 1.2 图标集管理器 (IconSetManager)

核心业务逻辑组件，管理图标集的生命周期。

```typescript
interface IconSetManager {
  // 加载图标集
  loadIconSet(namespace: string): Promise<IconSet>;
  
  // 添加图标
  addIcon(namespace: string, name: string, svg: string): Promise<void>;
  
  // 删除图标
  removeIcon(namespace: string, name: string): Promise<void>;
  
  // 更新图标
  updateIcon(namespace: string, name: string, svg: string): Promise<void>;
  
  // 获取图标
  getIcon(namespace: string, name: string): Promise<IconData | null>;
  
  // 获取所有图标
  getAllIcons(namespace: string): Promise<IconSet>;
  
  // 保存版本
  saveVersion(namespace: string, name: string, svg: string): Promise<string>;
  
  // 获取版本历史
  getVersionHistory(namespace: string, name: string): Promise<Version[]>;
  
  // 回滚到指定版本
  rollbackToVersion(namespace: string, name: string, versionId: string): Promise<void>;
}
```

#### 1.3 SVG 解析器 (SVGParser)

使用 @iconify/tools 解析和优化 SVG 文件。

```typescript
interface SVGParser {
  // 解析 SVG 字符串为图标数据
  parseSVG(svgContent: string): Promise<IconData>;
  
  // 验证 SVG 格式
  validateSVG(svgContent: string): boolean;
  
  // 优化 SVG（移除不必要的属性、简化路径等）
  optimizeSVG(svgContent: string): Promise<string>;
  
  // 提取 SVG 元数据
  extractMetadata(svgContent: string): SVGMetadata;
}
```

#### 1.4 存储层 (StorageLayer)

管理图标文件的持久化存储。

```typescript
interface StorageLayer {
  // 保存图标文件
  saveIcon(namespace: string, name: string, data: IconData): Promise<void>;
  
  // 读取图标文件
  readIcon(namespace: string, name: string): Promise<IconData | null>;
  
  // 删除图标文件
  deleteIcon(namespace: string, name: string): Promise<void>;
  
  // 列出所有图标
  listIcons(namespace: string): Promise<string[]>;
  
  // 保存图标集元数据
  saveIconSetMetadata(namespace: string, metadata: IconSetMetadata): Promise<void>;
  
  // 读取图标集元数据
  readIconSetMetadata(namespace: string): Promise<IconSetMetadata | null>;
}
```

**文件系统结构:**

```
icons/
  gd/                    # 命名空间目录
    icons/               # 图标数据
      icon1.json
      icon2.json
    versions/            # 版本历史
      icon1/
        v1_timestamp.json
        v2_timestamp.json
    metadata.json        # 图标集元数据
    source/              # 原始 SVG 文件（可选保留）
      icon1.svg
      icon2.svg
```

#### 1.5 缓存管理器 (CacheManager)

实现多层缓存策略以优化性能。

```typescript
interface CacheManager {
  // 获取缓存的图标集
  getCachedIconSet(namespace: string): IconSet | null;
  
  // 缓存图标集
  cacheIconSet(namespace: string, iconSet: IconSet): void;
  
  // 使缓存失效
  invalidateCache(namespace: string, iconName?: string): void;
  
  // 生成 ETag
  generateETag(data: any): string;
  
  // 获取 HTTP 缓存头
  getCacheHeaders(namespace: string): CacheHeaders;
}
```

**缓存策略:**
- 内存缓存：使用 node-cache 缓存解析后的图标集数据
- HTTP 缓存：设置 Cache-Control、ETag、Last-Modified 头
- 缓存时间：图标集数据缓存 24 小时，支持条件请求

#### 1.6 CORS 配置管理器 (CorsConfigManager)

管理跨域资源共享（CORS）配置，支持多个域名。

```typescript
interface CorsConfigManager {
  // 解析 CORS 配置
  parseConfig(envValue: string | undefined): CorsConfig;
  
  // 验证 CORS 配置
  validateConfig(config: CorsConfig): CorsValidationResult;
  
  // 检查源是否被允许
  isOriginAllowed(origin: string | undefined, config: CorsConfig): boolean;
  
  // 获取 CORS 中间件配置
  getCorsMiddlewareConfig(config: CorsConfig): CorsOptions;
}
```

**实现细节:**

```typescript
class CorsConfigManager {
  parseConfig(envValue: string | undefined): CorsConfig {
    // 未设置或空值：拒绝所有跨域请求
    if (!envValue || envValue.trim() === '') {
      return { origins: [], allowAll: false };
    }
    
    // 通配符：允许所有域名
    if (envValue.trim() === '*') {
      return { origins: [], allowAll: true };
    }
    
    // 多个域名：按逗号分隔并去除空格
    const origins = envValue
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    return { origins, allowAll: false };
  }
  
  validateConfig(config: CorsConfig): CorsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (config.allowAll) {
      warnings.push('CORS configured to allow all origins (*). This should only be used in development.');
      return { valid: true, errors, warnings };
    }
    
    if (config.origins.length === 0) {
      warnings.push('No CORS origins configured. All cross-origin requests will be rejected.');
      return { valid: true, errors, warnings };
    }
    
    // 验证每个域名格式
    config.origins.forEach(origin => {
      try {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(`Invalid CORS origin protocol: ${origin}. Must be http: or https:`);
        }
      } catch (error) {
        errors.push(`Invalid CORS origin format: ${origin}. Must be a valid URL.`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  isOriginAllowed(origin: string | undefined, config: CorsConfig): boolean {
    // 允许所有域名
    if (config.allowAll) {
      return true;
    }
    
    // 没有配置任何域名：拒绝
    if (config.origins.length === 0) {
      return false;
    }
    
    // 同源请求（没有 origin 头）：允许
    if (!origin) {
      return true;
    }
    
    // 检查是否在允许列表中
    return config.origins.includes(origin);
  }
  
  getCorsMiddlewareConfig(config: CorsConfig): CorsOptions {
    return {
      origin: (origin, callback) => {
        if (this.isOriginAllowed(origin, config)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    };
  }
}
```

**使用示例:**

```typescript
// 在 Express 应用中使用
const corsManager = new CorsConfigManager();
const corsConfig = corsManager.parseConfig(process.env.CORS_ORIGIN);

// 验证配置
const validation = corsManager.validateConfig(corsConfig);
if (!validation.valid) {
  logger.error('Invalid CORS configuration:', validation.errors);
  process.exit(1);
}

// 记录警告
validation.warnings.forEach(warning => logger.warn(warning));

// 应用 CORS 中间件
app.use(cors(corsManager.getCorsMiddlewareConfig(corsConfig)));

// 记录配置信息
if (corsConfig.allowAll) {
  logger.info('CORS: Allowing all origins (*)');
} else if (corsConfig.origins.length > 0) {
  logger.info(`CORS: Allowing ${corsConfig.origins.length} origins:`, corsConfig.origins);
} else {
  logger.info('CORS: No origins configured, rejecting all cross-origin requests');
}
```

#### 1.7 Figma 集成器 (FigmaIntegrator) - 阶段 3

与 Figma API 交互，自动导入图标。

```typescript
interface FigmaIntegrator {
  // 连接到 Figma
  connect(apiToken: string, fileId: string): Promise<void>;
  
  // 获取文件中的图标组件
  fetchIconComponents(): Promise<FigmaComponent[]>;
  
  // 导出组件为 SVG
  exportComponentAsSVG(componentId: string): Promise<string>;
  
  // 同步所有图标
  syncAllIcons(): Promise<SyncResult>;
  
  // 同步单个图标
  syncIcon(componentId: string): Promise<void>;
}
```

### 2. React 客户端集成

#### 2.1 Iconify 配置

```typescript
// iconify-config.ts
import { addAPIProvider } from '@iconify/react';

export function configureIconify() {
  // 配置自建 API 服务
  addAPIProvider('custom', {
    resources: ['http://localhost:3000'], // 自建 API 服务地址
  });
  
  // 设置 gd 命名空间使用自定义 API
  addCollection({
    prefix: 'gd',
    provider: 'custom',
  });
}
```

#### 2.2 图标组件使用

```typescript
import { Icon } from '@iconify/react';
import { configureIconify } from './iconify-config';

// 应用初始化时配置
configureIconify();

// 使用图标
function MyComponent() {
  return (
    <div>
      <Icon icon="gd:logo" width="24" height="24" />
      <Icon icon="gd:menu" />
    </div>
  );
}
```

## 数据模型

### IconData

表示单个图标的数据结构（遵循 Iconify 格式）。

```typescript
interface IconData {
  body: string;           // SVG 路径数据
  width?: number;         // 图标宽度
  height?: number;        // 图标高度
  left?: number;          // 左偏移
  top?: number;           // 上偏移
  rotate?: number;        // 旋转角度
  hFlip?: boolean;        // 水平翻转
  vFlip?: boolean;        // 垂直翻转
}
```

### IconSet

表示完整的图标集。

```typescript
interface IconSet {
  prefix: string;         // 命名空间，固定为 "gd"
  icons: {
    [name: string]: IconData;
  };
  width?: number;         // 默认宽度
  height?: number;        // 默认高度
  lastModified?: number;  // 最后修改时间戳
}
```

### IconSetMetadata

图标集的元数据。

```typescript
interface IconSetMetadata {
  prefix: string;
  name: string;
  total: number;          // 图标总数
  version: string;        // 版本号
  author?: string;
  license?: string;
  lastModified: number;
}
```

### Version

图标版本信息。

```typescript
interface Version {
  id: string;             // 版本 ID
  timestamp: number;      // 创建时间戳
  data: IconData;         // 图标数据
  author?: string;        // 修改者
  comment?: string;       // 版本说明
}
```

### SVGMetadata

SVG 文件的元数据。

```typescript
interface SVGMetadata {
  viewBox?: string;
  width?: string;
  height?: string;
  hasValidPath: boolean;
}
```

### FigmaComponent

Figma 组件信息。

```typescript
interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  description?: string;
}
```

### SyncResult

Figma 同步结果。

```typescript
interface SyncResult {
  success: number;        // 成功数量
  failed: number;         // 失败数量
  errors: Array<{
    componentId: string;
    error: string;
  }>;
}
```

### CacheHeaders

HTTP 缓存头配置。

```typescript
interface CacheHeaders {
  'Cache-Control': string;
  'ETag': string;
  'Last-Modified': string;
}
```

### CorsConfig

CORS 配置数据模型。

```typescript
interface CorsConfig {
  origins: string[];      // 允许的源域名列表
  allowAll: boolean;      // 是否允许所有域名（通配符 *）
}

interface CorsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

```typescript
interface CacheHeaders {
  'Cache-Control': string;
  'ETag': string;
  'Last-Modified': string;
}
```

## 正确性属性

*属性是指在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*


### 核心功能属性

**属性 1: SVG 到 Iconify 格式转换**
*对于任何*有效的 SVG 文件，无论是通过文件系统、上传接口还是 Figma API 导入，解析后都应该生成包含 body、width、height 等必需字段的有效 Iconify 图标数据
**验证需求: 1.1, 1.3, 3.3**

**属性 2: 图标请求响应完整性**
*对于任何*存在于 "gd" 命名空间的图标，当客户端请求时，API 服务应该返回包含正确命名空间、完整 SVG 数据和元数据的响应
**验证需求: 1.2, 1.5, 5.3**

**属性 3: 无效 SVG 拒绝**
*对于任何*格式无效的 SVG 输入（缺少路径数据、格式错误等），系统应该拒绝处理并返回明确的错误信息
**验证需求: 2.2**

**属性 4: 图标上传立即可用**
*对于任何*成功上传的图标，立即通过 API 请求该图标应该能够获取到刚上传的数据
**验证需求: 2.1, 2.4**

**属性 5: 图标删除完全移除**
*对于任何*被删除的图标，删除后请求该图标应该返回 404 状态码，且该图标不应出现在图标集列表中
**验证需求: 2.5**

**属性 6: 图标名称冲突处理**
*对于任何*已存在的图标名称，当上传同名图标时，系统应该根据配置一致地选择覆盖或拒绝操作
**验证需求: 2.3**

### 缓存与性能属性

**属性 7: HTTP 缓存头完整性**
*对于任何*图标或图标集的响应，都应该包含 Cache-Control（max-age >= 3600）、ETag 和 Last-Modified 头
**验证需求: 4.1, 4.2, 4.4**

**属性 8: 条件请求 304 响应**
*对于任何*未修改的资源，当客户端发送带有匹配 ETag 的 If-None-Match 请求时，服务器应该返回 304 状态码
**验证需求: 4.3**

**属性 9: 缓存失效机制**
*对于任何*图标的添加或更新操作，操作后该图标集的 ETag 或版本标识符应该与操作前不同
**验证需求: 4.5, 8.4**

**属性 10: 客户端缓存复用**
*对于任何*图标，当多个 React 组件引用相同图标时，Iconify 客户端应该只发送一次网络请求
**验证需求: 6.4**

### API 规范兼容性属性

**属性 11: 图标集列表格式符合规范**
*对于任何*图标集列表请求，响应应该是有效的 JSON，且包含符合 Iconify API 规范的字段结构
**验证需求: 5.1**

**属性 12: 图标集响应包含所有图标**
*对于任何*图标集请求，响应中的 icons 对象应该包含该命名空间下所有存在的图标定义
**验证需求: 5.2**

**属性 13: 图标数据字段完整性**
*对于任何*返回的图标数据，都应该至少包含 body 字段，以及 width 和 height 字段（除非使用默认值）
**验证需求: 5.4**

**属性 14: 不存在资源返回 404**
*对于任何*不存在的图标或图标集请求，服务器应该返回 404 状态码和 JSON 格式的错误描述
**验证需求: 5.5, 7.2**

### 错误处理与可靠性属性

**属性 15: 错误日志记录完整性**
*对于任何*SVG 解析失败、文件系统错误或 Figma API 失败，系统应该记录包含错误类型、相关资源标识和失败原因的日志条目
**验证需求: 7.1, 7.3, 7.4**

**属性 16: 错误隔离不影响服务**
*对于任何*单个图标的处理错误或文件系统操作失败，服务应该继续响应其他有效的图标请求
**验证需求: 7.3, 3.5**

**属性 17: React 应用错误容错**
*对于任何*图标加载失败的情况，React 应用应该渲染占位符或错误状态，而不应该抛出未捕获的异常导致应用崩溃
**验证需求: 6.3**

**属性 18: Figma API 重试机制**
*对于任何*Figma API 调用失败，系统应该至少尝试重试一次，并记录所有尝试的结果
**验证需求: 7.4**

### 版本管理属性

**属性 19: 版本历史完整性**
*对于任何*图标，每次更新操作都应该在版本历史中创建新条目，且查询历史应该返回所有版本按时间戳排序
**验证需求: 8.1, 8.2**

**属性 20: 版本回滚恢复数据**
*对于任何*图标的历史版本，回滚到该版本后，当前图标数据应该与该历史版本的数据完全一致
**验证需求: 8.3**

### 集成与配置属性

**属性 21: Figma 组件识别**
*对于任何*从 Figma API 获取的组件列表，系统应该能够根据命名约定或标记正确识别哪些组件是图标
**验证需求: 3.2**

## 错误处理

### 错误分类

系统定义以下错误类别：

1. **客户端错误 (4xx)**
   - 400 Bad Request: 无效的请求参数或格式
   - 404 Not Found: 请求的图标或图标集不存在
   - 409 Conflict: 图标名称冲突（当配置为拒绝覆盖时）
   - 413 Payload Too Large: 上传的文件超过大小限制

2. **服务器错误 (5xx)**
   - 500 Internal Server Error: 服务器内部错误
   - 502 Bad Gateway: Figma API 调用失败
   - 503 Service Unavailable: 服务暂时不可用

### 错误响应格式

所有错误响应遵循统一的 JSON 格式：

```typescript
interface ErrorResponse {
  error: {
    code: string;           // 错误代码，如 "INVALID_SVG"
    message: string;        // 人类可读的错误描述
    details?: any;          // 可选的详细信息
    timestamp: number;      // 错误发生时间戳
  };
}
```

### 错误处理策略

**SVG 解析错误:**
- 记录详细的解析错误信息（文件名、行号、错误原因）
- 返回 400 状态码和具体的错误描述
- 不影响其他图标的正常服务

**文件系统错误:**
- 记录错误日志
- 对于读取错误，返回 404 或 500
- 对于写入错误，返回 500 并保持现有数据不变
- 实现重试机制（最多 3 次）

**Figma API 错误:**
- 记录 API 调用失败的详细信息
- 实现指数退避重试策略（初始延迟 1 秒，最多重试 3 次）
- 超时设置为 30 秒
- 失败后保持本地图标库继续可用

**网络错误:**
- 客户端实现请求超时（10 秒）
- 显示友好的错误提示
- 提供重试选项

**并发错误:**
- 使用文件锁或数据库事务防止并发写入冲突
- 实现乐观锁机制处理版本冲突

## 测试策略

### 单元测试

使用 Jest 或 Vitest 作为测试框架，覆盖以下核心模块：

**SVGParser 单元测试:**
- 测试有效 SVG 的解析
- 测试各种无效 SVG 的拒绝
- 测试 SVG 优化功能
- 测试元数据提取

**IconSetManager 单元测试:**
- 测试图标的 CRUD 操作
- 测试图标集加载和保存
- 测试版本管理功能
- 测试并发操作处理

**CacheManager 单元测试:**
- 测试缓存的存取
- 测试缓存失效逻辑
- 测试 ETag 生成
- 测试缓存头生成

**StorageLayer 单元测试:**
- 测试文件读写操作
- 测试目录结构创建
- 测试错误处理

**API 端点单元测试:**
- 测试各个 HTTP 端点的请求和响应
- 测试错误状态码
- 测试请求验证

**CORS 配置单元测试:**
- 测试单个域名配置的解析
- 测试多个域名配置的解析（逗号分隔）
- 测试通配符 `*` 配置
- 测试空配置或未设置的情况
- 测试无效 URL 格式的处理
- 测试配置验证逻辑
- 测试 CORS 中间件对允许域名的处理
- 测试 CORS 中间件对拒绝域名的处理

### 属性测试

使用 fast-check (JavaScript/TypeScript 的属性测试库) 实现属性测试。每个属性测试至少运行 100 次迭代。

**测试标注格式:**
每个属性测试必须使用注释明确标注对应的设计文档属性：
```typescript
// Feature: iconify-private-library, Property 1: SVG 到 Iconify 格式转换
```

**核心属性测试:**

1. **属性 1 测试**: 生成随机的有效 SVG，验证转换后的 Iconify 格式
2. **属性 2 测试**: 生成随机图标名称和数据，验证请求响应的完整性
3. **属性 3 测试**: 生成各种无效 SVG，验证拒绝行为
4. **属性 4 测试**: 上传随机图标，立即请求，验证可用性
5. **属性 5 测试**: 添加随机图标，删除，验证不可访问
6. **属性 6 测试**: 测试两种配置下的冲突处理一致性
7. **属性 7 测试**: 请求随机图标，验证缓存头存在和值
8. **属性 8 测试**: 发送条件请求，验证 304 响应
9. **属性 9 测试**: 更新图标，验证 ETag 变化
10. **属性 19 测试**: 多次更新图标，验证版本历史完整性
11. **属性 20 测试**: 创建版本，回滚，验证数据一致性
12. **属性 21 测试**: 生成随机 CORS 配置，验证解析正确性
13. **属性 22 测试**: 生成随机允许的域名，验证请求被接受
14. **属性 23 测试**: 生成随机未授权域名，验证请求被拒绝

**生成器设计:**

```typescript
// SVG 生成器：生成有效的 SVG 字符串
const validSVGArbitrary = fc.record({
  width: fc.integer({ min: 1, max: 1000 }),
  height: fc.integer({ min: 1, max: 1000 }),
  path: fc.string({ minLength: 10 }), // 简化的路径数据
});

// 图标名称生成器：生成有效的图标名称
const iconNameArbitrary = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
  { minLength: 1, maxLength: 50 }
);

// 无效 SVG 生成器：生成各种无效的 SVG
const invalidSVGArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('<svg></svg>'), // 没有路径
  fc.constant('not xml'),
  fc.constant('<svg><invalid></svg>'),
);

// CORS 配置生成器：生成有效的 CORS 配置字符串
const corsConfigArbitrary = fc.oneof(
  fc.constant('*'), // 通配符
  fc.constant(''), // 空配置
  fc.webUrl(), // 单个 URL
  fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }).map(urls => urls.join(',')), // 多个 URL
);

// 域名生成器：生成有效的域名
const validOriginArbitrary = fc.oneof(
  fc.constant('http://localhost:3000'),
  fc.constant('http://localhost:5173'),
  fc.webUrl({ validSchemes: ['http', 'https'] }),
);
```

### 集成测试

测试各组件之间的集成：

**API 服务集成测试:**
- 启动完整的 API 服务
- 测试端到端的图标上传、查询、删除流程
- 测试缓存行为
- 测试并发请求处理
- 测试 CORS 跨域请求（从不同域名发起请求）
- 测试 CORS 预检请求（OPTIONS 方法）

**React 客户端集成测试:**
- 使用 React Testing Library
- 测试图标组件的渲染
- 测试加载状态和错误状态
- 测试与 API 服务的交互

**Figma 集成测试:**
- 使用模拟的 Figma API 响应
- 测试完整的同步流程
- 测试错误处理和重试

### 端到端测试

使用 Playwright 或 Cypress 进行端到端测试：

- 测试完整的用户工作流
- 测试三个阶段的功能
- 测试浏览器缓存行为
- 测试错误场景的用户体验

### 性能测试

**负载测试:**
- 使用 Apache Bench 或 k6 进行负载测试
- 测试并发请求处理能力
- 测试缓存效果

**基准测试:**
- 测试 SVG 解析性能
- 测试图标集加载时间
- 测试 API 响应时间

**目标指标:**
- API 响应时间 < 100ms (缓存命中)
- API 响应时间 < 500ms (缓存未命中)
- 支持至少 100 并发请求
- 图标集大小 < 1MB (1000 个图标)

## 实施阶段

### 阶段 1: 文件系统基础 (第 1-2 周)

**目标:** 实现基于文件系统的图标管理和基础 API 服务

**交付物:**
- 可运行的 Iconify API 服务
- SVG 解析和转换功能
- 基础的 HTTP 端点 (/collections, /collection, /icons)
- React 客户端配置和示例
- 基础缓存实现

**验证标准:**
- 手动添加 SVG 文件到指定目录
- React 应用能够加载和显示图标
- 缓存头正确设置
- 通过需求 1 和需求 4 的所有验收标准

### 阶段 2: 动态管理 API (第 3-4 周)

**目标:** 实现图标的动态上传、删除和版本管理

**交付物:**
- 图标上传 API
- 图标删除 API
- 版本管理系统
- 管理界面（可选）

**验证标准:**
- 通过 API 上传 SVG 文件
- 上传的图标立即可用
- 版本历史正确记录
- 支持版本回滚
- 通过需求 2 和需求 8 的所有验收标准

### 阶段 3: Figma 集成 (第 5-6 周)

**目标:** 实现与 Figma 的自动化集成

**交付物:**
- Figma API 集成模块
- 自动同步功能
- 同步配置界面
- 错误处理和重试机制

**验证标准:**
- 成功连接到 Figma API
- 正确识别和导出图标组件
- 同步的图标在系统中可用
- 错误情况下服务保持可用
- 通过需求 3 的所有验收标准

## 安全考虑

### CORS (跨域资源共享) 配置

**多域名支持设计:**

系统支持配置多个允许的 CORS 源域名，以便不同环境和域名的客户端应用都能安全访问图标服务。

**配置格式:**
```bash
# .env 文件配置示例

# 单个域名
CORS_ORIGIN=http://localhost:5173

# 多个域名（逗号分隔）
CORS_ORIGIN=http://localhost:5173,https://app.example.com,https://admin.example.com

# 允许所有域名（开发环境）
CORS_ORIGIN=*

# 空值或未设置（默认拒绝所有跨域请求）
# CORS_ORIGIN=
```

**实现逻辑:**

```typescript
// CORS 配置解析器
interface CorsConfig {
  origins: string[];
  allowAll: boolean;
}

function parseCorsOrigins(envValue: string | undefined): CorsConfig {
  // 未设置或空值：拒绝所有跨域请求
  if (!envValue || envValue.trim() === '') {
    return { origins: [], allowAll: false };
  }
  
  // 通配符：允许所有域名
  if (envValue.trim() === '*') {
    return { origins: [], allowAll: true };
  }
  
  // 多个域名：按逗号分隔并去除空格
  const origins = envValue
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
  
  return { origins, allowAll: false };
}

// CORS 中间件配置
const corsConfig = parseCorsOrigins(process.env.CORS_ORIGIN);

app.use(cors({
  origin: (origin, callback) => {
    // 允许所有域名
    if (corsConfig.allowAll) {
      callback(null, true);
      return;
    }
    
    // 没有配置任何域名：拒绝
    if (corsConfig.origins.length === 0) {
      callback(new Error('CORS not configured'), false);
      return;
    }
    
    // 同源请求（没有 origin 头）：允许
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // 检查是否在允许列表中
    if (corsConfig.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true, // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
```

**安全考虑:**

1. **生产环境配置**: 生产环境应明确列出所有允许的域名，避免使用通配符 `*`
2. **协议匹配**: 域名必须包含完整的协议（http:// 或 https://），确保协议匹配
3. **端口匹配**: 如果域名包含端口号，必须完全匹配（如 `http://localhost:3000` 和 `http://localhost:5173` 是不同的源）
4. **子域名**: 每个子域名都需要单独配置（如 `app.example.com` 和 `admin.example.com`）
5. **日志记录**: 记录被拒绝的 CORS 请求，便于调试和安全审计

**配置验证:**

启动时验证 CORS 配置的有效性：

```typescript
function validateCorsConfig(config: CorsConfig): void {
  if (config.allowAll) {
    logger.warn('CORS configured to allow all origins (*). This should only be used in development.');
    return;
  }
  
  if (config.origins.length === 0) {
    logger.warn('No CORS origins configured. All cross-origin requests will be rejected.');
    return;
  }
  
  // 验证每个域名格式
  config.origins.forEach(origin => {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol)) {
        logger.error(`Invalid CORS origin protocol: ${origin}. Must be http: or https:`);
      }
    } catch (error) {
      logger.error(`Invalid CORS origin format: ${origin}. Must be a valid URL.`);
    }
  });
  
  logger.info(`CORS configured with ${config.origins.length} allowed origins:`, config.origins);
}
```

**环境配置示例:**

```bash
# 开发环境 (.env.development)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# 测试环境 (.env.test)
CORS_ORIGIN=https://test.example.com,https://test-admin.example.com

# 生产环境 (.env.production)
CORS_ORIGIN=https://app.example.com,https://admin.example.com,https://www.example.com
```

### 认证和授权

**API 访问控制:**
- 读取端点（GET /collections, /icons）: 公开访问或基础认证
- 写入端点（POST, DELETE）: 需要 API 密钥或 JWT 令牌
- 管理端点: 需要管理员权限

**Figma API 安全:**
- API 令牌存储在环境变量中，不提交到代码库
- 使用 HTTPS 与 Figma API 通信
- 定期轮换 API 令牌

### 输入验证

**SVG 文件验证:**
- 文件大小限制: 最大 1MB
- 文件类型验证: 必须是有效的 XML/SVG
- 内容安全: 移除潜在的脚本标签和事件处理器
- 路径数据验证: 确保包含有效的 SVG 路径

**图标名称验证:**
- 只允许字母、数字、连字符和下划线
- 长度限制: 1-50 字符
- 防止路径遍历攻击（如 "../"）

### 速率限制

**API 速率限制:**
- 读取端点: 1000 请求/分钟/IP
- 写入端点: 100 请求/分钟/IP
- Figma 同步: 10 请求/小时

**实现方式:**
- 使用 express-rate-limit 中间件
- 基于 IP 地址或 API 密钥
- 返回 429 Too Many Requests 状态码

### 数据保护

**备份策略:**
- 每日自动备份图标数据
- 保留最近 30 天的备份
- 备份存储在独立位置

**数据完整性:**
- 使用文件校验和验证数据完整性
- 原子性写入操作（写入临时文件后重命名）
- 定期验证存储数据的一致性

## 监控和可观测性

### 日志记录

**日志级别:**
- ERROR: 系统错误、API 失败
- WARN: 无效请求、配置问题
- INFO: 图标操作、同步事件
- DEBUG: 详细的调试信息

**日志内容:**
- 时间戳
- 日志级别
- 操作类型
- 相关资源（图标名称、文件路径）
- 错误信息和堆栈跟踪
- 请求 ID（用于追踪）

**日志存储:**
- 使用 Winston 或 Pino 日志库
- 日志文件按日期轮转
- 保留最近 30 天的日志

### 指标收集

**关键指标:**
- API 请求数量和响应时间
- 缓存命中率
- 图标数量和总大小
- 错误率
- Figma 同步成功率

**实现方式:**
- 使用 Prometheus 客户端库
- 暴露 /metrics 端点
- 集成 Grafana 进行可视化

### 健康检查

**健康检查端点:**
```
GET /health
```

**响应内容:**
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "checks": {
    "storage": "ok",
    "cache": "ok",
    "figma": "ok"
  },
  "stats": {
    "totalIcons": 150,
    "uptime": 86400
  }
}
```

## 部署架构

### 开发环境

- 本地运行 API 服务（Node.js）
- 本地文件系统存储
- React 开发服务器
- 热重载支持

### 生产环境

**推荐架构:**
```
[客户端浏览器]
      ↓
[CDN / 反向代理 (Nginx)]
      ↓
[Iconify API 服务 (Node.js)]
      ↓
[文件系统 / 对象存储]
```

**部署选项:**
1. **单服务器部署**: 适合小规模使用
2. **容器化部署**: 使用 Docker，便于扩展
3. **无服务器部署**: 使用 AWS Lambda + S3 或类似服务

**环境变量配置:**
```env
PORT=3000
NODE_ENV=production
ICON_STORAGE_PATH=/data/icons
CACHE_TTL=86400
FIGMA_API_TOKEN=xxx
FIGMA_FILE_ID=xxx
API_KEY=xxx
CORS_ORIGIN=https://your-app.com
```

### 扩展性考虑

**水平扩展:**
- API 服务无状态设计，支持多实例部署
- 使用共享存储（NFS、S3）或数据库
- 负载均衡器分发请求

**缓存策略:**
- 应用层缓存（内存）
- CDN 缓存（边缘节点）
- 浏览器缓存

**性能优化:**
- 图标集预生成和压缩
- 支持 gzip/brotli 压缩
- HTTP/2 支持
- 图标懒加载

## 依赖项

### 后端依赖

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@iconify/tools": "^3.0.0",
    "node-cache": "^5.1.2",
    "multer": "^1.4.5-lts.1",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "vitest": "^1.0.0",
    "fast-check": "^3.15.0"
  }
}
```

### 前端依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "@iconify/react": "^4.1.1"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.0",
    "vitest": "^1.0.0"
  }
}
```

### Figma 集成依赖

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

## 文档要求

### API 文档

使用 OpenAPI 3.0 规范编写 API 文档，包括：
- 所有端点的描述
- 请求和响应示例
- 错误代码说明
- 认证方式

### 开发者文档

- 快速开始指南
- 配置说明
- 部署指南
- 故障排除

### 用户文档

- React 集成指南
- 图标命名规范
- Figma 同步配置
- 最佳实践

## 未来扩展

### 可能的增强功能

1. **图标搜索**: 支持按名称、标签、类别搜索图标
2. **图标预览**: 提供 Web 界面浏览和预览图标
3. **批量操作**: 支持批量上传、删除、更新
4. **图标变体**: 支持同一图标的多个样式变体
5. **自动优化**: 自动优化 SVG 文件大小
6. **CDN 集成**: 直接集成 CDN 服务
7. **多命名空间**: 支持多个图标集命名空间
8. **权限管理**: 细粒度的用户权限控制
9. **Webhook**: 图标更新时触发 Webhook 通知
10. **GraphQL API**: 提供 GraphQL 接口作为 REST 的补充
