# Redis Storage Layer

本文档说明如何使用 Redis 作为图标存储层。

## 为什么使用 Redis？

### 性能优势
- **读取速度**: Redis 内存读取比文件系统快 10-100 倍
- **并发处理**: 天然支持高并发，无文件锁问题
- **网络延迟**: 本地 Redis 延迟 < 1ms

### 构建优势
- **无需打包图标**: 图标数据在 Redis 中，不影响代码构建
- **部署更快**: 不需要复制大量 JSON 文件
- **容器镜像更小**: 减少镜像体积

### 扩展性
- **水平扩展**: 多个 API 实例共享同一个 Redis
- **数据同步**: 天然支持多实例数据一致性
- **集群支持**: Redis Cluster 支持海量数据

## 安装 Redis

### macOS
```bash
# 使用 Homebrew 安装
brew install redis

# 启动 Redis 服务
brew services start redis

# 或手动启动
redis-server
```

### Linux (Ubuntu/Debian)
```bash
# 安装 Redis
sudo apt-get update
sudo apt-get install redis-server

# 启动 Redis 服务
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Docker
```bash
# 运行 Redis 容器
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

# 使用持久化
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### Windows
```bash
# 使用 WSL2 安装 Linux 版本
# 或下载 Windows 版本: https://github.com/microsoftarchive/redis/releases
```

## 配置

### 1. 环境变量配置

在 `packages/api/.env` 文件中设置：

```env
# 使用 Redis 存储
STORAGE_TYPE=redis

# Redis 连接 URL
REDIS_URL=redis://localhost:6379
```

### 2. Redis URL 格式

```
redis://[username]:[password]@[host]:[port]/[database]
```

**示例：**

```env
# 本地开发（无密码）
REDIS_URL=redis://localhost:6379

# 本地开发（有密码）
REDIS_URL=redis://:mypassword@localhost:6379

# 远程服务器
REDIS_URL=redis://user:pass@redis.example.com:6379/0

# Redis Cloud
REDIS_URL=redis://:password@redis-12345.cloud.redislabs.com:12345
```

### 3. 生产环境配置

**推荐配置：**

```env
# 生产环境
STORAGE_TYPE=redis
REDIS_URL=redis://:your-strong-password@redis.production.com:6379

# 启用 Redis 持久化（在 Redis 配置文件中）
# appendonly yes
# appendfsync everysec
```

## Redis 数据结构

### 图标数据
```
Key: icon:{namespace}:{name}
Type: Hash
Fields:
  - data: JSON string of IconData
```

### 图标列表
```
Key: icons:{namespace}
Type: Set
Members: icon names
```

### 元数据
```
Key: metadata:{namespace}
Type: Hash
Fields:
  - data: JSON string of IconSetMetadata
```

### 版本历史
```
Key: versions:{namespace}:{name}
Type: Sorted Set
Score: timestamp
Member: versionId
```

### 版本数据
```
Key: version:{namespace}:{name}:{versionId}
Type: Hash
Fields:
  - data: JSON string of IconData
```

## 使用示例

### 查看 Redis 数据

```bash
# 连接到 Redis CLI
redis-cli

# 查看所有键
KEYS *

# 查看特定命名空间的图标
SMEMBERS icons:gd

# 查看特定图标数据
HGET icon:gd:logo data

# 查看图标数量
SCARD icons:gd

# 查看版本历史
ZRANGE versions:gd:logo 0 -1 WITHSCORES
```

### 备份和恢复

**备份：**
```bash
# RDB 快照备份
redis-cli SAVE
# 备份文件位于: /var/lib/redis/dump.rdb

# 或使用 BGSAVE（后台保存）
redis-cli BGSAVE
```

**恢复：**
```bash
# 停止 Redis
sudo systemctl stop redis-server

# 复制备份文件
sudo cp /path/to/backup/dump.rdb /var/lib/redis/dump.rdb

# 启动 Redis
sudo systemctl start redis-server
```

### 清空数据

```bash
# 清空当前数据库
redis-cli FLUSHDB

# 清空所有数据库
redis-cli FLUSHALL

# 清空特定命名空间（在应用中）
curl -X DELETE http://localhost:3000/api/admin/namespace/gd \
  -H "x-api-key: your-api-key"
```

## 监控

### Redis 信息
```bash
# 查看 Redis 信息
redis-cli INFO

# 查看内存使用
redis-cli INFO memory

# 查看统计信息
redis-cli INFO stats

# 实时监控命令
redis-cli MONITOR
```

### 应用监控

访问健康检查端点：
```bash
curl http://localhost:3000/health
```

响应示例：
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "checks": {
    "storage": "ok",
    "cache": "ok"
  },
  "stats": {
    "totalIcons": 150,
    "uptime": 86400,
    "storageType": "redis",
    "redisConnected": true,
    "redisTotalKeys": 450,
    "redisMemoryUsed": "2.5M"
  }
}
```

## 性能优化

### Redis 配置优化

在 `redis.conf` 中：

```conf
# 最大内存限制（根据实际情况调整）
maxmemory 256mb

# 内存淘汰策略（当达到最大内存时）
maxmemory-policy allkeys-lru

# 持久化配置
save 900 1      # 900秒内至少1个键变化时保存
save 300 10     # 300秒内至少10个键变化时保存
save 60 10000   # 60秒内至少10000个键变化时保存

# AOF 持久化（更安全）
appendonly yes
appendfsync everysec
```

### 连接池配置

Redis 客户端（ioredis）已配置连接池：
- 自动重连
- 最多重试 3 次
- 重试延迟：50ms * 重试次数（最大 2000ms）

## 故障排除

### 连接失败

**问题**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决方案**:
1. 检查 Redis 是否运行：`redis-cli ping`
2. 检查 Redis 端口：`netstat -an | grep 6379`
3. 检查防火墙设置
4. 验证 REDIS_URL 配置

### 内存不足

**问题**: `OOM command not allowed when used memory > 'maxmemory'`

**解决方案**:
1. 增加 Redis 最大内存：`maxmemory 512mb`
2. 配置淘汰策略：`maxmemory-policy allkeys-lru`
3. 清理不需要的数据
4. 升级 Redis 服务器

### 数据丢失

**问题**: Redis 重启后数据丢失

**解决方案**:
1. 启用 AOF 持久化：`appendonly yes`
2. 配置 RDB 快照：`save 900 1`
3. 定期备份数据
4. 使用 Redis 集群或主从复制

### 性能下降

**问题**: 响应时间变慢

**解决方案**:
1. 检查 Redis 内存使用：`redis-cli INFO memory`
2. 检查慢查询日志：`redis-cli SLOWLOG GET 10`
3. 优化数据结构
4. 增加 Redis 内存
5. 使用 Redis 集群分片

## 从文件系统迁移

如果你之前使用文件系统存储，可以使用以下脚本迁移数据：

```typescript
// migrate-to-redis.ts
import { StorageLayer } from './src/storage/StorageLayer.js';
import { RedisStorageLayer } from './src/storage/RedisStorageLayer.js';

async function migrate() {
  const fileStorage = new StorageLayer('./icons');
  const redisStorage = new RedisStorageLayer();
  
  await redisStorage.connect();
  
  const namespaces = ['gd']; // 添加你的命名空间
  
  for (const namespace of namespaces) {
    console.log(`Migrating namespace: ${namespace}`);
    
    const icons = await fileStorage.listIcons(namespace);
    console.log(`Found ${icons.length} icons`);
    
    for (const iconName of icons) {
      const iconData = await fileStorage.readIcon(namespace, iconName);
      if (iconData) {
        await redisStorage.saveIcon(namespace, iconName, iconData);
        console.log(`Migrated: ${namespace}:${iconName}`);
      }
    }
    
    const metadata = await fileStorage.readIconSetMetadata(namespace);
    if (metadata) {
      await redisStorage.saveIconSetMetadata(namespace, metadata);
      console.log(`Migrated metadata for: ${namespace}`);
    }
  }
  
  await redisStorage.disconnect();
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

运行迁移：
```bash
npx tsx migrate-to-redis.ts
```

## 生产部署建议

### 1. 使用 Redis 集群
- 提高可用性
- 数据分片
- 自动故障转移

### 2. 配置主从复制
- 读写分离
- 数据备份
- 高可用性

### 3. 启用持久化
- AOF + RDB 双重保障
- 定期备份到对象存储（S3/OSS）

### 4. 监控和告警
- 内存使用率
- 连接数
- 命令执行时间
- 错误率

### 5. 安全配置
- 设置强密码
- 绑定特定 IP
- 使用 TLS 加密连接
- 禁用危险命令（FLUSHALL, FLUSHDB）

## 参考资源

- [Redis 官方文档](https://redis.io/documentation)
- [ioredis 文档](https://github.com/redis/ioredis)
- [Redis 最佳实践](https://redis.io/docs/manual/patterns/)
- [Redis 持久化](https://redis.io/docs/manual/persistence/)
- [Redis 集群](https://redis.io/docs/manual/scaling/)
