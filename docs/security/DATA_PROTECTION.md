# 数据保护政策

> **文档版本**: 1.0
> **最后更新**: 2026-01-26
> **适用范围**: 全公司

---

## 1. 政策概述

### 1.1 目的

本政策旨在：
- 保护客户和公司的敏感数据
- 确保符合数据保护法规（GDPR、CCPA等）
- 建立数据处理的标准流程
- 防止数据泄露和滥用

### 1.2 适用范围

本政策适用于：
- 所有员工、承包商、合作伙伴
- 所有处理客户数据的系统
- 所有数据生命周期阶段

---

## 2. 数据分类

### 2.1 敏感数据分级

| 级别 | 类型 | 示例 | 保护要求 |
|------|------|------|---------|
| **高度敏感** | 个人身份信息 | 身份证号、护照号、银行账号 | 加密存储、加密传输、严格访问控制 |
| **敏感** | 个人信息 | 姓名、电话、邮箱、地址 | 加密传输、访问控制、日志审计 |
| **内部** | 业务数据 | 订单信息、对话记录、任务数据 | 访问控制、备份 |
| **公开** | 公开信息 | 产品文档、公告 | 无特殊要求 |

### 2.2 数据清单

**客户数据**
- 客户档案（姓名、公司、联系方式）
- 对话记录
- 需求和任务信息
- 客户画像数据

**系统数据**
- 用户账号和密码
- 访问日志
- 审计日志
- 系统配置

---

## 3. 数据收集

### 3.1 收集原则

- **最小化原则**: 只收集必要的数据
- **透明原则**: 明确告知用户收集目的
- **合法原则**: 获得用户明确同意
- **目的限制**: 只用于声明的目的

### 3.2 用户同意

```typescript
// 隐私政策同意
export interface PrivacyConsent {
  userId: string;
  consentType: 'data_collection' | 'data_processing' | 'marketing';
  consentGiven: boolean;
  consentDate: Date;
  ipAddress: string;
  userAgent: string;
}

// 记录用户同意
export const recordConsent = async (consent: PrivacyConsent) => {
  await consentRepository.save(consent);
  logger.info('Privacy consent recorded', { userId: consent.userId });
};
```

---

## 4. 数据存储

### 4.1 加密要求

**传输加密**
- 所有数据传输使用TLS 1.2+
- API通信使用HTTPS
- 数据库连接加密

**存储加密**
```typescript
// 敏感字段加密
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 256-bit key
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
};

export const decrypt = (encryptedText: string): string => {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};
```

### 4.2 数据库安全

```sql
-- 敏感字段加密存储
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_encrypted TEXT, -- 加密存储
  id_number_encrypted TEXT, -- 加密存储
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建审计表
CREATE TABLE data_access_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  record_id UUID,
  accessed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET
);
```

---

## 5. 数据访问控制

### 5.1 访问权限

```typescript
// 基于角色的数据访问控制
export const dataAccessControl = {
  // 管理员：全部数据
  admin: ['read', 'write', 'delete'],

  // 客服：客户数据（读写）
  agent: ['read', 'write'],

  // 分析师：数据（只读）
  analyst: ['read'],

  // 审计员：日志（只读）
  auditor: ['read_logs'],
};

// 检查数据访问权限
export const checkDataAccess = async (
  userId: string,
  operation: string,
  resourceType: string,
) => {
  const user = await getUserWithRole(userId);
  const permissions = dataAccessControl[user.role];

  if (!permissions.includes(operation)) {
    // 记录未授权访问尝试
    await logUnauthorizedAccess({
      userId,
      operation,
      resourceType,
      timestamp: new Date(),
    });

    throw new Error('Access denied');
  }

  // 记录数据访问
  await logDataAccess({
    userId,
    operation,
    resourceType,
    timestamp: new Date(),
  });
};
```

### 5.2 数据脱敏

```typescript
// 数据脱敏规则
export const maskSensitiveData = (data: any, userRole: string): any => {
  if (userRole === 'admin') {
    return data; // 管理员看到完整数据
  }

  return {
    ...data,
    // 手机号脱敏
    phone: data.phone ? data.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : null,
    // 邮箱脱敏
    email: data.email ? data.email.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
    // 身份证号脱敏
    idNumber: data.idNumber ? data.idNumber.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2') : null,
  };
};
```

---

## 6. 数据使用

### 6.1 使用限制

- 只用于业务目的
- 不得用于营销（未经同意）
- 不得出售或共享给第三方
- 不得用于歧视性决策

### 6.2 数据分析

```typescript
// 匿名化数据用于分析
export const anonymizeForAnalytics = (data: CustomerData): AnalyticsData => {
  return {
    // 使用哈希ID代替真实ID
    customerId: crypto.createHash('sha256').update(data.id).digest('hex'),

    // 移除个人身份信息
    // name: REMOVED
    // email: REMOVED
    // phone: REMOVED

    // 保留统计信息
    industry: data.industry,
    region: data.region,
    orderCount: data.orderCount,
    totalRevenue: data.totalRevenue,
    createdAt: data.createdAt,
  };
};
```

---

## 7. 数据保留

### 7.1 保留期限

| 数据类型 | 保留期限 | 删除方式 |
|---------|---------|---------|
| 客户档案 | 账户关闭后1年 | 软删除 → 硬删除 |
| 对话记录 | 3年 | 归档 → 删除 |
| 访问日志 | 1年 | 自动删除 |
| 审计日志 | 7年 | 归档保存 |
| 备份数据 | 90天 | 自动删除 |

### 7.2 自动清理

```typescript
// 定时清理过期数据
import cron from 'node-cron';

// 每天凌晨2点执行
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting data retention cleanup');

  // 删除90天前的访问日志
  await deleteOldAccessLogs(90);

  // 归档3年前的对话记录
  await archiveOldConversations(3 * 365);

  // 删除已关闭账户1年后的数据
  await deleteClosedAccountData(365);

  logger.info('Data retention cleanup completed');
});
```

---

## 8. 数据删除

### 8.1 用户删除请求

```typescript
// 处理用户数据删除请求（GDPR Right to Erasure）
export const handleDataDeletionRequest = async (userId: string) => {
  logger.info('Processing data deletion request', { userId });

  // 1. 验证用户身份
  await verifyUserIdentity(userId);

  // 2. 软删除用户数据
  await softDeleteUserData(userId);

  // 3. 30天等待期（允许恢复）
  await scheduleHardDeletion(userId, 30);

  // 4. 通知用户
  await notifyUser(userId, 'deletion_scheduled');

  // 5. 记录删除请求
  await logDeletionRequest({
    userId,
    requestedAt: new Date(),
    scheduledDeletionDate: addDays(new Date(), 30),
  });
};

// 硬删除（不可恢复）
export const hardDeleteUserData = async (userId: string) => {
  await db.transaction(async (trx) => {
    // 删除所有相关数据
    await trx('customer_profiles').where({ userId }).delete();
    await trx('conversations').where({ customerId: userId }).delete();
    await trx('requirements').where({ customerId: userId }).delete();
    await trx('tasks').where({ customerId: userId }).delete();

    // 匿名化日志中的用户ID
    await trx('access_logs')
      .where({ userId })
      .update({ userId: 'DELETED_USER' });

    logger.info('User data hard deleted', { userId });
  });
};
```

### 8.2 数据导出

```typescript
// 用户数据导出（GDPR Right to Data Portability）
export const exportUserData = async (userId: string): Promise<UserDataExport> => {
  const profile = await getCustomerProfile(userId);
  const conversations = await getConversations(userId);
  const requirements = await getRequirements(userId);
  const tasks = await getTasks(userId);

  return {
    profile: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
      createdAt: profile.createdAt,
    },
    conversations: conversations.map(c => ({
      id: c.id,
      messages: c.messages,
      createdAt: c.createdAt,
      closedAt: c.closedAt,
    })),
    requirements: requirements.map(r => ({
      title: r.title,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
    })),
    tasks: tasks.map(t => ({
      title: t.title,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
    exportedAt: new Date(),
  };
};
```

---

## 9. 数据泄露响应

### 9.1 泄露检测

```typescript
// 监控异常数据访问
export const detectDataBreach = async () => {
  // 检测大量数据导出
  const largeExports = await db('data_access_log')
    .where('operation', 'export')
    .where('created_at', '>', subHours(new Date(), 1))
    .groupBy('user_id')
    .having(db.raw('COUNT(*) > 10'));

  if (largeExports.length > 0) {
    await alertSecurityTeam({
      type: 'potential_data_breach',
      details: largeExports,
    });
  }

  // 检测异常访问模式
  const suspiciousAccess = await detectAnomalousAccess();

  if (suspiciousAccess.length > 0) {
    await alertSecurityTeam({
      type: 'suspicious_access',
      details: suspiciousAccess,
    });
  }
};
```

### 9.2 泄露响应流程

```markdown
1. **检测与确认** (0-1小时)
   - 确认泄露范围
   - 评估影响程度
   - 启动应急响应

2. **遏制** (1-4小时)
   - 隔离受影响系统
   - 撤销泄露账户权限
   - 阻止进一步泄露

3. **调查** (4-24小时)
   - 确定泄露原因
   - 识别受影响数据
   - 收集证据

4. **通知** (24-72小时)
   - 通知监管机构
   - 通知受影响用户
   - 发布公告

5. **修复** (持续)
   - 修复漏洞
   - 加强安全措施
   - 更新政策流程

6. **复盘** (事后)
   - 分析根本原因
   - 制定改进措施
   - 更新应急预案
```

---

## 10. 合规要求

### 10.1 GDPR合规

- ✅ 数据处理合法性基础
- ✅ 用户同意机制
- ✅ 数据主体权利（访问、删除、导出）
- ✅ 数据保护影响评估（DPIA）
- ✅ 数据泄露通知（72小时内）
- ✅ 数据保护官（DPO）指定

### 10.2 合规检查清单

- [ ] 隐私政策已发布并易于访问
- [ ] 用户同意机制已实施
- [ ] 数据加密已启用
- [ ] 访问控制已配置
- [ ] 数据保留政策已实施
- [ ] 数据删除流程已建立
- [ ] 数据导出功能已实现
- [ ] 泄露响应流程已制定
- [ ] 员工隐私培训已完成
- [ ] 第三方处理协议已签署

---

## 11. 员工责任

### 11.1 员工义务

- 遵守数据保护政策
- 保护访问凭证
- 报告安全事件
- 参加隐私培训
- 签署保密协议

### 11.2 违规处理

| 违规类型 | 处罚措施 |
|---------|---------|
| 轻微违规 | 警告、培训 |
| 严重违规 | 停职、降级 |
| 恶意泄露 | 解雇、法律追责 |

---

## 12. 第三方管理

### 12.1 第三方评估

```markdown
在与第三方共享数据前，必须：
1. 评估第三方安全能力
2. 签署数据处理协议（DPA）
3. 限制数据访问范围
4. 定期审计第三方合规性
```

### 12.2 数据处理协议

```markdown
数据处理协议必须包含：
- 数据处理目的和范围
- 数据保护措施
- 数据保留期限
- 数据删除义务
- 泄露通知义务
- 审计权利
```

---

## 13. 培训与意识

### 13.1 培训计划

- 新员工入职培训
- 年度隐私培训
- 角色专项培训
- 安全意识宣传

### 13.2 培训内容

- 数据保护法规
- 公司隐私政策
- 安全最佳实践
- 事件响应流程

---

## 14. 政策审查

- 每年审查并更新政策
- 法规变更时及时更新
- 重大事件后审查改进

---

## 联系方式

**数据保护官（DPO）**
- 邮箱: dpo@company.com
- 电话: 400-XXX-XXXX

**隐私问题咨询**
- 邮箱: privacy@company.com
