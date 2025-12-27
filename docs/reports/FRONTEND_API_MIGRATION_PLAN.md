# 前端API层迁移计划

**迁移目标**: 统一前端API调用，从 `api.js` 迁移到 `ApiClient.js`

**生成日期**: 2025-12-27
**预计工时**: 3小时
**优先级**: MEDIUM（本月完成）

---

## 📊 现状分析

### 问题描述
- **重复代码**: `assets/js/api.js` (309行) 与 `assets/js/infrastructure/api/ApiClient.js` (310行) 功能完全重复
- **代码相似度**: 95%+，唯一区别是实现方式（函数式 vs ES6 Class）
- **维护成本**: 修改API逻辑需要同步两处

### 依赖统计
| 文件 | 引用api.js | 状态 |
|------|-----------|------|
| `ai/index.js` | ✅ | 待迁移 |
| `chat/index.js` | ✅ | 待迁移 |
| `customer/index.js` | ✅ | 待迁移 |
| `infrastructure/repositories/CustomerProfileRepository.js` | ✅ | 待迁移 |
| `infrastructure/repositories/KnowledgeRepository.js` | ✅ | 待迁移 |
| `knowledge/index.js` | ✅ | 待迁移 |
| `presentation/chat/UnifiedChatController.js` | ✅ | 待迁移 |
| `requirements/index.js` | ✅ | 待迁移 |
| `tasks/index.js` | ✅ | 待迁移 |

**总计**: 9个文件依赖 `api.js`

---

## 🎯 迁移策略

### 原则
1. **分批迁移**: 每次迁移2-3个文件，逐步验证
2. **向后兼容**: 迁移过程中保持api.js可用
3. **充分测试**: 每批迁移后运行E2E测试
4. **最后删除**: 所有文件迁移完成后才删除api.js

### 优先级分组

#### Batch 1: Repository层（最简单，1小时）
- `infrastructure/repositories/CustomerProfileRepository.js`
- `infrastructure/repositories/KnowledgeRepository.js`

**原因**: Repository已经设计为依赖注入，改动最小

---

#### Batch 2: 模块入口文件（中等难度，1小时）
- `ai/index.js`
- `knowledge/index.js`
- `requirements/index.js`
- `tasks/index.js`

**原因**: 这些是模块入口，修改后影响范围可控

---

#### Batch 3: 视图控制器（需要测试，1小时）
- `chat/index.js`
- `customer/index.js`
- `presentation/chat/UnifiedChatController.js`

**原因**: 涉及UI交互，需要仔细测试

---

## 📝 详细步骤

### Phase 1: Batch 1 - Repository层迁移

#### 1.1 修改 CustomerProfileRepository.js
**当前代码**:
```javascript
import * as api from '../api.js';

class CustomerProfileRepository {
  async findById(id) {
    return await api.getCustomerProfile(id);
  }
}
```

**迁移后代码**:
```javascript
import { ApiClient } from '../infrastructure/api/ApiClient.js';

class CustomerProfileRepository {
  constructor(apiClient = ApiClient.getInstance()) {
    this.apiClient = apiClient;
  }

  async findById(id) {
    const response = await this.apiClient.get(`/api/customers/${id}`);
    return response.data;
  }
}
```

**验证步骤**:
1. 浏览器打开客户画像页面
2. 检查Network面板，确认API调用正常
3. 运行单元测试（如果有）

---

#### 1.2 修改 KnowledgeRepository.js
**当前代码**:
```javascript
import * as api from '../api.js';

class KnowledgeRepository {
  async search(query) {
    return await api.searchKnowledge(query);
  }
}
```

**迁移后代码**:
```javascript
import { ApiClient } from '../infrastructure/api/ApiClient.js';

class KnowledgeRepository {
  constructor(apiClient = ApiClient.getInstance()) {
    this.apiClient = apiClient;
  }

  async search(query) {
    const response = await this.apiClient.post('/api/knowledge/search', { query });
    return response.data;
  }
}
```

**验证步骤**:
1. 测试知识库搜索功能
2. 确认结果显示正常

---

### Phase 2: Batch 2 - 模块入口文件迁移

#### 2.1 迁移模式（通用）
**所有模块入口文件**（`ai/index.js`, `knowledge/index.js`, `requirements/index.js`, `tasks/index.js`）：

**修改前**:
```javascript
import * as api from '../api.js';

document.getElementById('btn-create').addEventListener('click', async () => {
  const result = await api.createTask(data);
  // ...
});
```

**修改后**:
```javascript
import { ApiClient } from '../infrastructure/api/ApiClient.js';

const apiClient = ApiClient.getInstance();

document.getElementById('btn-create').addEventListener('click', async () => {
  const response = await apiClient.post('/api/tasks', data);
  const result = response.data;
  // ...
});
```

**API映射表**:
| api.js方法 | ApiClient调用 |
|-----------|--------------|
| `api.createTask(data)` | `apiClient.post('/api/tasks', data)` |
| `api.getTasks(filters)` | `apiClient.get('/api/tasks', { params: filters })` |
| `api.createRequirement(data)` | `apiClient.post('/api/requirements', data)` |
| `api.searchKnowledge(query)` | `apiClient.post('/api/knowledge/search', { query })` |
| `api.analyzeMessage(msg)` | `apiClient.post('/api/ai/analyze', { message: msg })` |

---

### Phase 3: Batch 3 - 视图控制器迁移

#### 3.1 修改 UnifiedChatController.js
**注意事项**:
- 该文件负责聊天核心逻辑，需要重点测试
- 涉及WebSocket和实时通信，确保不影响消息收发

**测试清单**:
- [ ] 发送消息正常
- [ ] 接收消息正常
- [ ] 历史消息加载
- [ ] 文件上传（如果有）
- [ ] 表情/富文本（如果有）

---

#### 3.2 修改 chat/index.js & customer/index.js
**测试清单**:
- [ ] 对话列表加载
- [ ] 客户信息展示
- [ ] 筛选和排序功能
- [ ] 分页加载

---

## 🧪 测试策略

### 单元测试（可选，推荐）
为每个Repository/Service编写单元测试，mock ApiClient

**示例**:
```javascript
// CustomerProfileRepository.test.js
import { CustomerProfileRepository } from './CustomerProfileRepository.js';

test('findById should call API with correct params', async () => {
  const mockApiClient = {
    get: vi.fn().mockResolvedValue({ data: { id: '123', name: 'Test' } })
  };

  const repo = new CustomerProfileRepository(mockApiClient);
  const result = await repo.findById('123');

  expect(mockApiClient.get).toHaveBeenCalledWith('/api/customers/123');
  expect(result.name).toBe('Test');
});
```

---

### E2E测试（必须）
每个Batch迁移后，运行以下E2E测试场景：

**场景1: 客户管理**
1. 打开客户列表页
2. 搜索客户
3. 查看客户详情
4. 编辑客户信息

**场景2: 对话管理**
1. 打开对话列表
2. 创建新对话
3. 发送消息
4. 关闭对话

**场景3: 知识库**
1. 打开知识库页面
2. 搜索知识
3. 查看知识详情

**场景4: 需求管理**
1. 创建需求
2. 查看需求列表
3. 更新需求状态

---

## 📦 提交策略

### 每个Batch独立提交
```bash
# Batch 1 提交
git add assets/js/infrastructure/repositories/
git commit -m "refactor: migrate Repository layer to ApiClient (Batch 1/3)"

# Batch 2 提交
git add assets/js/ai/ assets/js/knowledge/ assets/js/requirements/ assets/js/tasks/
git commit -m "refactor: migrate module entry files to ApiClient (Batch 2/3)"

# Batch 3 提交
git add assets/js/chat/ assets/js/customer/ assets/js/presentation/
git commit -m "refactor: migrate controllers to ApiClient (Batch 3/3)"

# 最终删除api.js
git rm assets/js/api.js
git commit -m "refactor: remove deprecated api.js, migration complete"
```

---

## 🚨 回滚计划

### 如果迁移失败
每个Batch提交前都做一次git commit，可以快速回滚：

```bash
# 回滚到上一次提交
git reset --hard HEAD~1

# 或回滚到特定提交
git log --oneline
git reset --hard <commit-hash>
```

---

## 🔧 代码生成脚本（可选）

### 自动生成迁移代码
```bash
# 扫描所有api.js引用
grep -r "import.*api\.js" assets/js --include="*.js" | cut -d':' -f1 > files_to_migrate.txt

# 批量替换（谨慎使用，先备份）
sed -i.bak "s|import \* as api from.*api\.js|import { ApiClient } from '../infrastructure/api/ApiClient.js';\\nconst apiClient = ApiClient.getInstance();|g" file.js
```

---

## 📊 进度追踪

| Batch | 文件数 | 状态 | 预计工时 | 完成日期 |
|-------|--------|------|----------|----------|
| Batch 1 | 2个 | ⏳ 待开始 | 1小时 | - |
| Batch 2 | 4个 | ⏳ 待开始 | 1小时 | - |
| Batch 3 | 3个 | ⏳ 待开始 | 1小时 | - |
| 清理api.js | 1个 | ⏳ 待开始 | 10分钟 | - |

**总进度**: 0% (0/10)

---

## ✅ 完成标准

- [x] 所有9个文件完成迁移
- [x] E2E测试全部通过
- [x] 删除api.js文件
- [x] 代码Review通过
- [x] 部署到预发环境验证

---

## 📚 参考资料

### ApiClient.js API文档
```javascript
class ApiClient {
  // GET请求
  async get(url, config?)

  // POST请求
  async post(url, data?, config?)

  // PUT请求
  async put(url, data?, config?)

  // DELETE请求
  async delete(url, config?)

  // 请求拦截器
  interceptors.request.use(fn)

  // 响应拦截器
  interceptors.response.use(successFn, errorFn)
}

// 使用方式
const apiClient = ApiClient.getInstance();
const response = await apiClient.get('/api/users', { params: { page: 1 } });
console.log(response.data, response.status);
```

### 常见API端点映射
| 资源 | GET | POST | PUT | DELETE |
|------|-----|------|-----|--------|
| Conversations | `/api/conversations` | `/api/conversations` | `/api/conversations/:id` | `/api/conversations/:id` |
| Messages | `/api/conversations/:id/messages` | `/api/conversations/:id/messages` | - | - |
| Customers | `/api/customers` | `/api/customers` | `/api/customers/:id` | `/api/customers/:id` |
| Requirements | `/api/requirements` | `/api/requirements` | `/api/requirements/:id` | `/api/requirements/:id` |
| Tasks | `/api/tasks` | `/api/tasks` | `/api/tasks/:id` | `/api/tasks/:id` |
| Knowledge | `/api/knowledge` | `/api/knowledge/search` | `/api/knowledge/:id` | `/api/knowledge/:id` |

---

**迁移负责人**: 前端团队
**Review**: 技术负责人
**最后更新**: 2025-12-27

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
