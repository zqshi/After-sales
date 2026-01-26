# 安全加固指南

> **文档版本**: 1.0
> **最后更新**: 2026-01-26
> **适用环境**: Production, Staging

---

## 目录

1. [加固概述](#加固概述)
2. [应用层加固](#应用层加固)
3. [基础设施加固](#基础设施加固)
4. [数据库加固](#数据库加固)
5. [网络层加固](#网络层加固)
6. [容器安全加固](#容器安全加固)
7. [监控与日志](#监控与日志)
8. [加固验证](#加固验证)

---

## 加固概述

### 加固目标

- 最小化攻击面
- 实施纵深防御
- 遵循最小权限原则
- 确保数据安全
- 提高系统韧性

### 加固原则

1. **默认拒绝**: 除非明确允许，否则拒绝所有访问
2. **最小权限**: 只授予完成任务所需的最小权限
3. **纵深防御**: 多层安全控制
4. **安全配置**: 使用安全的默认配置
5. **持续监控**: 实时监控安全状态

---

## 应用层加固

### 1. 认证与授权加固

#### 1.1 JWT配置加固

**backend/src/config/auth.config.ts**
```typescript
export const authConfig = {
  jwt: {
    // 使用强密钥（至少256位）
    secret: process.env.JWT_SECRET, // 从环境变量读取
    expiresIn: '15m', // 短过期时间
    refreshExpiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'after-sales-system',
    audience: 'after-sales-api',
  },

  // 密码策略
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: 12, // 增加哈希强度
  },

  // 账户锁定策略
  lockout: {
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30分钟
    resetAfter: 24 * 60 * 60 * 1000, // 24小时
  },
};
```

#### 1.2 Session安全配置

**backend/src/config/session.config.ts**
```typescript
export const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'sessionId', // 不使用默认名称
  cookie: {
    httpOnly: true, // 防止XSS
    secure: true, // 仅HTTPS
    sameSite: 'strict', // 防止CSRF
    maxAge: 3600000, // 1小时
    domain: process.env.COOKIE_DOMAIN,
  },
  resave: false,
  saveUninitialized: false,
};
```

#### 1.3 RBAC权限加固

```typescript
// 实施严格的权限检查
export const permissionMiddleware = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 检查用户角色和权限
    const hasPermission = await checkPermission(user.id, requiredPermission);

    if (!hasPermission) {
      // 记录未授权访问尝试
      logger.warn('Unauthorized access attempt', {
        userId: user.id,
        permission: requiredPermission,
        ip: req.ip,
      });

      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
```

### 2. 输入验证加固

#### 2.1 参数验证

```typescript
import { z } from 'zod';

// 严格的输入验证
export const createTaskSchema = z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题过长')
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/, '标题包含非法字符'),

  type: z.enum(['support', 'bug_fix', 'feature', 'maintenance']),

  priority: z.enum(['low', 'medium', 'high', 'urgent']),

  assigneeId: z.string()
    .uuid('无效的用户ID'),

  dueDate: z.string()
    .datetime()
    .optional(),
});

// 使用验证中间件
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
```

#### 2.2 SQL注入防护

```typescript
// 始终使用参数化查询
export class TaskRepository {
  async findById(id: string): Promise<Task | null> {
    // ✅ 正确：使用参数化查询
    const result = await this.dataSource
      .getRepository(TaskEntity)
      .findOne({ where: { id } });

    // ❌ 错误：字符串拼接
    // const result = await this.dataSource.query(
    //   `SELECT * FROM tasks WHERE id = '${id}'`
    // );

    return result ? Task.fromEntity(result) : null;
  }
}
```

#### 2.3 XSS防护

```typescript
import DOMPurify from 'isomorphic-dompurify';

// 清理HTML输入
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
};

// 在存储前清理
export const createMessage = async (content: string) => {
  const sanitizedContent = sanitizeHtml(content);
  // 存储清理后的内容
};
```

#### 2.4 CSRF防护

```typescript
import csrf from 'csurf';

// 启用CSRF保护
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
});

// 在路由中使用
app.post('/api/tasks', csrfProtection, createTaskHandler);
```

### 3. API安全加固

#### 3.1 速率限制

```typescript
import rateLimit from 'express-rate-limit';

// 全局速率限制
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100个请求
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录接口严格限制
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 最多5次尝试
  skipSuccessfulRequests: true,
});

// 应用限制
app.use('/api/', globalLimiter);
app.post('/api/auth/login', loginLimiter, loginHandler);
```

#### 3.2 CORS配置

```typescript
import cors from 'cors';

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24小时
};

app.use(cors(corsOptions));
```

#### 3.3 安全响应头

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### 4. 敏感数据保护

#### 4.1 日志脱敏

```typescript
// 日志脱敏中间件
export const sanitizeLog = (data: any): any => {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLog(sanitized[key]);
    }
  }

  return sanitized;
};

// 使用
logger.info('User login', sanitizeLog({ username, password }));
```

#### 4.2 环境变量管理

```bash
# .env.production (示例)
# 永远不要提交到Git

# 数据库
DB_HOST=prod-db.internal
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=<strong-random-password>
DB_NAME=aftersales_prod

# JWT
JWT_SECRET=<256-bit-random-key>
JWT_REFRESH_SECRET=<256-bit-random-key>

# Session
SESSION_SECRET=<256-bit-random-key>

# 加密
ENCRYPTION_KEY=<256-bit-random-key>

# API密钥
AGENTSCOPE_API_KEY=<api-key>
```

**生成强密钥**
```bash
# 生成256位随机密钥
openssl rand -base64 32

# 生成UUID
uuidgen
```

---

## 基础设施加固

### 1. 服务器加固

#### 1.1 SSH加固

```bash
# /etc/ssh/sshd_config

# 禁用root登录
PermitRootLogin no

# 禁用密码认证
PasswordAuthentication no
PubkeyAuthentication yes

# 只允许特定用户
AllowUsers deploy

# 修改默认端口
Port 2222

# 禁用空密码
PermitEmptyPasswords no

# 设置超时
ClientAliveInterval 300
ClientAliveCountMax 2

# 禁用X11转发
X11Forwarding no

# 使用强加密算法
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,diffie-hellman-group-exchange-sha256
```

**重启SSH服务**
```bash
sudo systemctl restart sshd
```

#### 1.2 防火墙配置

```bash
# 使用UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许SSH (自定义端口)
sudo ufw allow 2222/tcp

# 允许HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许PostgreSQL (仅内网)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# 启用防火墙
sudo ufw enable
```

#### 1.3 系统更新

```bash
# 自动安全更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 手动更新
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
```

#### 1.4 文件权限

```bash
# 应用目录权限
sudo chown -R deploy:deploy /opt/after-sales
sudo chmod -R 750 /opt/after-sales

# 配置文件权限
sudo chmod 600 /opt/after-sales/.env
sudo chmod 600 /opt/after-sales/config/*.json

# 日志目录权限
sudo chmod 755 /var/log/after-sales
sudo chmod 644 /var/log/after-sales/*.log
```

### 2. 反向代理加固（Nginx）

```nginx
# /etc/nginx/sites-available/after-sales

server {
    listen 443 ssl http2;
    server_name api.after-sales.com;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/api.after-sales.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.after-sales.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 隐藏版本信息
    server_tokens off;

    # 请求大小限制
    client_max_body_size 10M;
    client_body_buffer_size 128k;

    # 超时设置
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # 限制请求方法
    if ($request_method !~ ^(GET|POST|PUT|DELETE|PATCH|OPTIONS)$ ) {
        return 405;
    }

    # 代理配置
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 速率限制
        limit_req zone=api burst=20 nodelay;
    }
}

# 速率限制配置
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name api.after-sales.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 数据库加固

### 1. PostgreSQL加固

#### 1.1 访问控制

```bash
# /etc/postgresql/14/main/pg_hba.conf

# 只允许本地连接
local   all             all                                     peer

# 只允许特定IP通过密码连接
host    aftersales_prod app_user        10.0.1.0/24            scram-sha-256

# 拒绝其他所有连接
host    all             all             0.0.0.0/0              reject
```

#### 1.2 PostgreSQL配置

```bash
# /etc/postgresql/14/main/postgresql.conf

# 监听地址
listen_addresses = 'localhost,10.0.1.10'

# SSL配置
ssl = on
ssl_cert_file = '/etc/postgresql/14/main/server.crt'
ssl_key_file = '/etc/postgresql/14/main/server.key'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on

# 日志配置
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'ddl'
log_connections = on
log_disconnections = on
log_duration = on
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# 连接限制
max_connections = 100
superuser_reserved_connections = 3

# 密码加密
password_encryption = scram-sha-256
```

#### 1.3 数据库用户权限

```sql
-- 创建应用用户（最小权限）
CREATE USER app_user WITH PASSWORD '<strong-password>';

-- 只授予必要的权限
GRANT CONNECT ON DATABASE aftersales_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 撤销不必要的权限
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE aftersales_prod FROM PUBLIC;

-- 创建只读用户（用于报表）
CREATE USER readonly_user WITH PASSWORD '<strong-password>';
GRANT CONNECT ON DATABASE aftersales_prod TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

### 2. Redis加固

```bash
# /etc/redis/redis.conf

# 绑定地址
bind 127.0.0.1 10.0.1.10

# 启用密码
requirepass <strong-redis-password>

# 禁用危险命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG "CONFIG_<random-string>"

# 持久化
save 900 1
save 300 10
save 60 10000

# AOF
appendonly yes
appendfsync everysec

# 最大内存
maxmemory 2gb
maxmemory-policy allkeys-lru

# 日志
loglevel notice
logfile /var/log/redis/redis-server.log
```

---

## 网络层加固

### 1. 网络隔离

```yaml
# Docker Compose网络隔离
version: '3.8'

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # 内部网络，无法访问外网
  database:
    driver: bridge
    internal: true

services:
  nginx:
    networks:
      - frontend
      - backend

  backend:
    networks:
      - backend
      - database

  postgres:
    networks:
      - database
```

### 2. DDoS防护

```nginx
# Nginx DDoS防护配置

# 连接限制
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;

# 请求限制
limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;
limit_req zone=req_limit burst=20 nodelay;

# 慢速攻击防护
client_body_timeout 10s;
client_header_timeout 10s;
send_timeout 10s;
```

---

## 容器安全加固

### 1. Docker镜像加固

```dockerfile
# Dockerfile最佳实践

# 使用官方基础镜像
FROM node:18-alpine AS base

# 以非root用户运行
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 只复制必要文件
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

# 切换到非root用户
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 暴露端口
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2. Docker运行时安全

```bash
# 安全运行容器
docker run -d \
  --name backend \
  --read-only \  # 只读文件系统
  --tmpfs /tmp \  # 临时文件系统
  --security-opt=no-new-privileges \  # 禁止提权
  --cap-drop=ALL \  # 删除所有capabilities
  --cap-add=NET_BIND_SERVICE \  # 只添加必要的
  --memory=512m \  # 内存限制
  --cpus=1.0 \  # CPU限制
  --pids-limit=100 \  # 进程数限制
  -e NODE_ENV=production \
  after-sales-backend:latest
```

### 3. Kubernetes安全配置

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001

      containers:
      - name: backend
        image: after-sales-backend:latest

        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL

        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"

        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 监控与日志

### 1. 安全日志

```typescript
// 记录安全事件
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({
      filename: '/var/log/after-sales/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 30,
    }),
  ],
});

// 记录安全事件
export const logSecurityEvent = (event: {
  type: 'login' | 'logout' | 'access_denied' | 'suspicious_activity';
  userId?: string;
  ip: string;
  details: any;
}) => {
  securityLogger.info('Security event', {
    ...event,
    timestamp: new Date().toISOString(),
  });
};
```

### 2. 异常检测

```typescript
// 检测异常登录
export const detectAnomalousLogin = async (userId: string, ip: string) => {
  const recentLogins = await getRecentLogins(userId, 24); // 24小时内

  // 检查IP地址变化
  const uniqueIPs = new Set(recentLogins.map(l => l.ip));
  if (uniqueIPs.size > 5) {
    await alertSecurityTeam({
      type: 'multiple_ips',
      userId,
      ips: Array.from(uniqueIPs),
    });
  }

  // 检查登录频率
  if (recentLogins.length > 20) {
    await alertSecurityTeam({
      type: 'high_frequency',
      userId,
      count: recentLogins.length,
    });
  }
};
```

---

## 加固验证

### 1. 自动化验证脚本

```bash
#!/bin/bash
# scripts/verify-hardening.sh

echo "=== 安全加固验证 ==="

# 检查SSH配置
echo "检查SSH配置..."
if grep -q "PermitRootLogin no" /etc/ssh/sshd_config; then
  echo "✓ SSH root登录已禁用"
else
  echo "✗ SSH root登录未禁用"
fi

# 检查防火墙
echo "检查防火墙..."
if sudo ufw status | grep -q "Status: active"; then
  echo "✓ 防火墙已启用"
else
  echo "✗ 防火墙未启用"
fi

# 检查SSL证书
echo "检查SSL证书..."
if openssl s_client -connect api.after-sales.com:443 < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
  echo "✓ SSL证书有效"
else
  echo "✗ SSL证书无效"
fi

# 检查环境变量
echo "检查敏感配置..."
if [ -f .env ] && [ $(stat -c %a .env) = "600" ]; then
  echo "✓ .env文件权限正确"
else
  echo "✗ .env文件权限不正确"
fi

echo "=== 验证完成 ==="
```

### 2. 安全扫描

```bash
# 运行安全扫描
npm audit
pip-audit
trivy image after-sales-backend:latest
```

---

## 加固检查清单

- [ ] JWT密钥强度 >= 256位
- [ ] 密码使用bcrypt (cost >= 12)
- [ ] 实施账户锁定策略
- [ ] 启用CSRF保护
- [ ] 配置安全响应头
- [ ] 实施速率限制
- [ ] 配置CORS白名单
- [ ] 日志脱敏
- [ ] SSH禁用root登录
- [ ] SSH禁用密码认证
- [ ] 防火墙已启用
- [ ] 系统自动更新已启用
- [ ] 文件权限正确设置
- [ ] Nginx SSL配置正确
- [ ] PostgreSQL访问控制配置
- [ ] Redis密码已设置
- [ ] Docker容器以非root运行
- [ ] 容器资源限制已设置
- [ ] 安全日志已启用
- [ ] 异常检测已配置

---

## 持续加固

### 定期审查

- 每月审查安全配置
- 每季度更新加固措施
- 每年进行渗透测试

### 保持更新

- 订阅安全公告
- 及时应用安全补丁
- 更新依赖包

---

## 联系方式

**安全团队**
- 邮箱: security@company.com
- 应急热线: 400-XXX-XXXX
