# TaxKB知识库集成技术方案

**版本**: v1.0
**日期**: 2025-12-16
**状态**: 技术方案（待实施）

---

## 一、方案概述

### 1.1 集成目标

将TaxKB智能知识库系统作为售后系统的**主知识库**，提供：
- 文档智能解析（PDF/DOCX/XLSX → Markdown）
- 语义搜索和向量检索
- QA问答对提取
- 文档生命周期管理
- 相似度检测和去重

### 1.2 架构选型

**方案**：TaxKB作为主知识库（推荐方案A）

**理由**：
- ✅ 直接利用TaxKB强大的文档处理能力
- ✅ 支持PDF/DOCX文档上传和智能解析
- ✅ 内置语义搜索和QA提取
- ✅ 完整的文档生命周期管理
- ✅ 避免维护本地复杂的知识库逻辑

**架构图**：
```
┌─────────────────────────────────────────────────────────┐
│                    售后系统前端                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   KnowledgeApplicationService (应用服务)          │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
└─────────────────┼─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│               售后系统后端 (Node.js/TypeScript)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Knowledge Use Cases (应用层)              │   │
│  │  • GetKnowledge • SearchKnowledge • Upload...    │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │      KnowledgeRepository (仓储接口)               │   │
│  │      实现: TaxKBKnowledgeRepository               │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │        TaxKBAdapter (适配器层)                    │   │
│  │  • API调用封装 • 数据映射 • 错误处理             │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
└─────────────────┼─────────────────────────────────────────┘
                  │ HTTP API
                  ▼
┌─────────────────────────────────────────────────────────┐
│              TaxKB API v3.1 (外部服务)                   │
│         http://localhost:8000/api/v3                    │
│  • 36个API端点 • 文档处理 • 语义搜索 • QA提取          │
└─────────────────────────────────────────────────────────┘
```

---

## 二、技术架构设计

### 2.1 分层职责

| 层次 | 组件 | 职责 |
|------|------|------|
| **应用层** | Knowledge Use Cases | 业务用例编排，调用仓储和领域服务 |
| **领域层** | KnowledgeItem 聚合根 | 知识条目领域模型（保持不变） |
| **基础设施层** | TaxKBAdapter | TaxKB API调用封装、数据转换 |
| **基础设施层** | TaxKBKnowledgeRepository | 实现IKnowledgeRepository接口 |
| **配置层** | config/taxkb.config.ts | TaxKB连接配置、API Key管理 |

### 2.2 核心组件

#### 1) TaxKBAdapter（适配器）

**职责**：封装所有TaxKB API调用

**位置**：`backend/src/infrastructure/adapters/TaxKBAdapter.ts`

**核心方法**：
```typescript
export class TaxKBAdapter {
  // 文档管理
  uploadDocument(file: Buffer, metadata?: any): Promise<TaxKBDocument>
  getDocument(docId: string, options?: any): Promise<TaxKBDocument>
  deleteDocument(docId: string): Promise<void>

  // 搜索
  searchDocuments(query: string, filters?: any): Promise<TaxKBSearchResult[]>
  semanticSearch(query: string, options?: any): Promise<TaxKBSemanticResult[]>

  // QA
  searchQA(question: string, filters?: any): Promise<TaxKBQAPair[]>

  // 处理进度
  getProcessingProgress(docId: string): Promise<TaxKBProcessingStatus>
}
```

#### 2) TaxKBKnowledgeRepository（仓储实现）

**职责**：实现IKnowledgeRepository接口，调用TaxKBAdapter

**位置**：`backend/src/infrastructure/repositories/TaxKBKnowledgeRepository.ts`

**核心方法**：
```typescript
export class TaxKBKnowledgeRepository implements IKnowledgeRepository {
  constructor(private adapter: TaxKBAdapter) {}

  async findById(id: string): Promise<KnowledgeItem | null>
  async findByFilters(filters: KnowledgeFilters): Promise<KnowledgeItem[]>
  async save(item: KnowledgeItem): Promise<void>
  async delete(id: string): Promise<void>
}
```

#### 3) Mapper（数据映射器）

**职责**：TaxKB数据结构 ↔ KnowledgeItem领域模型

**位置**：`backend/src/infrastructure/repositories/mappers/TaxKBMapper.ts`

**核心方法**：
```typescript
export class TaxKBMapper {
  // TaxKB → KnowledgeItem
  static toKnowledgeItem(taxkbDoc: TaxKBDocument): KnowledgeItem

  // KnowledgeItem → TaxKB
  static toTaxKBDocument(item: KnowledgeItem): Partial<TaxKBDocument>

  // 分类映射
  static mapCategory(businessDomain: string): KnowledgeCategory

  // 标签扁平化
  static flattenTags(taxkbTags: TaxKBTags): string[]
}
```

---

## 三、数据映射方案

### 3.1 核心字段映射

| TaxKB字段 | KnowledgeItem字段 | 映射规则 |
|-----------|------------------|---------|
| `doc_id` | `id` | 直接映射 |
| `title` | `title` | 直接映射 |
| `content` | `content` | Markdown内容直接映射 |
| `category.business_domain` | `category` | 映射到枚举（见下表） |
| `tags` | `tags` | 扁平化为字符串数组 |
| `status` | `metadata.status` | 存入元数据 |
| `created_at` | `createdAt` | 时间戳转换 |
| `file_hash` | `metadata.fileHash` | 存入元数据 |
| `page_count` | `metadata.pageCount` | 存入元数据 |
| `quality_score` | `metadata.qualityScore` | 存入元数据 |

### 3.2 分类映射规则

```typescript
const CATEGORY_MAPPING: Record<string, KnowledgeCategory> = {
  // TaxKB business_domain → KnowledgeCategory
  '员工关系/假期管理': 'policy',
  '员工关系/员工服务': 'guide',
  '系统问题/登录异常': 'troubleshooting',
  '常见问题': 'faq',
  // 默认
  '*': 'other'
};

function mapCategory(businessDomain: string): KnowledgeCategory {
  return CATEGORY_MAPPING[businessDomain] || CATEGORY_MAPPING['*'];
}
```

### 3.3 标签扁平化

**TaxKB标签结构**（层级化）：
```json
{
  "时间维度": [{"tag_id": "tag_001", "name": "2025年"}],
  "主题维度": [{"tag_id": "tag_002", "name": "产假"}]
}
```

**映射为**（扁平化）：
```json
["2025年", "产假"]
```

### 3.4 元数据扩展

**KnowledgeItem元数据扩展**：
```typescript
interface KnowledgeMetadata {
  // 原有字段
  source: string;
  author: string;
  version: string;

  // TaxKB扩展字段
  taxkbDocId: string;           // TaxKB文档ID
  status: string;                // draft/active/pending_review/archived
  fileHash: string;              // 文件哈希
  pageCount: number;             // 页数
  qualityScore: number;          // 质量分（0-1）
  processingStatus: string;      // 处理状态
  companyEntity?: string;        // 公司主体
  businessDomain?: string;       // 业务领域
}
```

---

## 四、API封装实现

### 4.1 TaxKBAdapter完整实现

**文件**：`backend/src/infrastructure/adapters/TaxKBAdapter.ts`

```typescript
import { config } from '@/config/taxkb.config';

export interface TaxKBDocument {
  doc_id: string;
  title: string;
  content: string;
  status: 'draft' | 'active' | 'pending_review' | 'archived' | 'deprecated';
  category: {
    company_entity: string;
    business_domain: string;
  };
  tags: Record<string, Array<{ tag_id: string; name: string }>>;
  file_hash: string;
  page_count: number;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface TaxKBSearchResult {
  doc_id: string;
  title: string;
  score: number;
  match_reason: {
    query_mode: string;
    match: string;
    score?: number;
  };
}

export class TaxKBAdapter {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.taxkb.baseUrl;
    this.apiKey = config.taxkb.apiKey;
    this.timeout = config.taxkb.timeout;
  }

  /**
   * 上传文档
   */
  async uploadDocument(
    file: Buffer,
    metadata?: {
      title?: string;
      category?: { company_entity?: string; business_domain?: string };
    }
  ): Promise<TaxKBDocument> {
    const formData = new FormData();
    formData.append('file', new Blob([file]));

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.request<TaxKBDocument>('/documents', {
      method: 'POST',
      body: formData,
    });

    return response;
  }

  /**
   * 获取文档详情
   */
  async getDocument(
    docId: string,
    options?: {
      include?: ('tags' | 'fulltext' | 'sections' | 'metadata')[];
    }
  ): Promise<TaxKBDocument> {
    const params = new URLSearchParams();
    if (options?.include) {
      params.append('include', options.include.join(','));
    }

    return await this.request<TaxKBDocument>(
      `/documents/${docId}?${params.toString()}`
    );
  }

  /**
   * 搜索文档
   */
  async searchDocuments(
    query: string,
    filters?: {
      status?: string[];
      category?: { company_entity?: string[]; business_domain?: string[] };
      tags?: Array<{ dimension: string; values: string[] }>;
      limit?: number;
    }
  ): Promise<TaxKBSearchResult[]> {
    const response = await this.request<{
      total: number;
      documents: TaxKBSearchResult[];
    }>('/search/documents', {
      method: 'POST',
      body: JSON.stringify({
        query,
        query_mode: 'filename',
        status_filter: filters?.status || ['active'],
        category_filter: filters?.category,
        tag_filter: filters?.tags,
        limit: filters?.limit || 20,
      }),
    });

    return response.documents;
  }

  /**
   * 语义搜索
   */
  async semanticSearch(
    query: string,
    options?: {
      docIds?: string[];
      topK?: number;
      includeChunks?: boolean;
    }
  ): Promise<any[]> {
    const response = await this.request<{
      document_chunk_results: any[];
      qa_pair_results: any[];
    }>('/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        query,
        query_mode: ['document_chunk'],
        doc_ids: options?.docIds,
        top_k: options?.topK || 5,
        include: {
          chunks: options?.includeChunks ?? true,
        },
      }),
    });

    return response.document_chunk_results;
  }

  /**
   * QA搜索
   */
  async searchQA(
    question: string,
    filters?: { doc_ids?: string[]; top_k?: number }
  ): Promise<any[]> {
    const response = await this.request<{ answers: any[] }>('/search/qa', {
      method: 'POST',
      body: JSON.stringify({
        query: question,
        doc_filter: filters?.doc_ids ? { doc_ids: filters.doc_ids } : undefined,
        top_k: filters?.top_k || 5,
      }),
    });

    return response.answers;
  }

  /**
   * 删除文档
   */
  async deleteDocument(docId: string): Promise<void> {
    await this.request(`/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取处理进度
   */
  async getProcessingProgress(docId: string): Promise<{
    overall_status: string;
    overall_progress: number;
    tasks: any[];
  }> {
    return await this.request(`/documents/${docId}/processing`);
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new TaxKBError(
          error.message || 'TaxKB API request failed',
          response.status,
          error
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new TaxKBError('Request timeout', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * TaxKB错误类
 */
export class TaxKBError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'TaxKBError';
  }
}
```

### 4.2 TaxKBMapper实现

**文件**：`backend/src/infrastructure/repositories/mappers/TaxKBMapper.ts`

```typescript
import { KnowledgeItem } from '@/domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@/domain/knowledge/value-objects/KnowledgeCategory';
import type { TaxKBDocument } from '../adapters/TaxKBAdapter';

export class TaxKBMapper {
  /**
   * TaxKB文档 → KnowledgeItem领域模型
   */
  static toKnowledgeItem(taxkbDoc: TaxKBDocument): KnowledgeItem {
    return KnowledgeItem.rehydrate(
      {
        title: taxkbDoc.title,
        content: taxkbDoc.content || '',
        category: this.mapCategory(taxkbDoc.category?.business_domain),
        tags: this.flattenTags(taxkbDoc.tags),
        source: 'taxkb',
        author: taxkbDoc.category?.company_entity || 'system',
        version: '1.0',
        // TaxKB扩展元数据
        metadata: {
          taxkbDocId: taxkbDoc.doc_id,
          status: taxkbDoc.status,
          fileHash: taxkbDoc.file_hash,
          pageCount: taxkbDoc.page_count,
          qualityScore: taxkbDoc.quality_score,
          companyEntity: taxkbDoc.category?.company_entity,
          businessDomain: taxkbDoc.category?.business_domain,
        },
      },
      taxkbDoc.doc_id // 使用TaxKB的doc_id作为聚合根ID
    );
  }

  /**
   * KnowledgeItem → TaxKB文档（用于创建/更新）
   */
  static toTaxKBDocument(item: KnowledgeItem): Partial<TaxKBDocument> {
    const props = item.toJSON();

    return {
      title: props.title,
      category: {
        company_entity: props.metadata?.companyEntity || '系统',
        business_domain: this.reverseMapCategory(props.category),
      },
    };
  }

  /**
   * 分类映射：TaxKB business_domain → KnowledgeCategory
   */
  private static mapCategory(businessDomain?: string): KnowledgeCategory {
    if (!businessDomain) return 'other';

    const mapping: Record<string, KnowledgeCategory> = {
      '员工关系/假期管理': 'policy',
      '员工关系/员工服务': 'guide',
      '员工关系/人事管理': 'policy',
      '系统问题/登录异常': 'troubleshooting',
      '系统问题/功能故障': 'troubleshooting',
      '常见问题': 'faq',
    };

    return mapping[businessDomain] || 'other';
  }

  /**
   * 反向分类映射：KnowledgeCategory → TaxKB business_domain
   */
  private static reverseMapCategory(category: KnowledgeCategory): string {
    const reverseMapping: Record<KnowledgeCategory, string> = {
      policy: '员工关系/假期管理',
      guide: '员工关系/员工服务',
      faq: '常见问题',
      troubleshooting: '系统问题/功能故障',
      other: '其他',
    };

    return reverseMapping[category] || '其他';
  }

  /**
   * 标签扁平化：TaxKB层级标签 → 字符串数组
   */
  private static flattenTags(
    taxkbTags: Record<string, Array<{ tag_id: string; name: string }>>
  ): string[] {
    if (!taxkbTags) return [];

    const tags: string[] = [];

    Object.values(taxkbTags).forEach((dimensionTags) => {
      dimensionTags.forEach((tag) => {
        tags.push(tag.name);
      });
    });

    return tags;
  }
}
```

### 4.3 TaxKBKnowledgeRepository实现

**文件**：`backend/src/infrastructure/repositories/TaxKBKnowledgeRepository.ts`

```typescript
import { IKnowledgeRepository } from '@/domain/knowledge/repositories/IKnowledgeRepository';
import { KnowledgeItem } from '@/domain/knowledge/models/KnowledgeItem';
import { TaxKBAdapter } from '../adapters/TaxKBAdapter';
import { TaxKBMapper } from './mappers/TaxKBMapper';

export class TaxKBKnowledgeRepository implements IKnowledgeRepository {
  constructor(private adapter: TaxKBAdapter) {}

  /**
   * 根据ID查找知识条目
   */
  async findById(id: string): Promise<KnowledgeItem | null> {
    try {
      const taxkbDoc = await this.adapter.getDocument(id, {
        include: ['tags', 'fulltext', 'metadata'],
      });

      return TaxKBMapper.toKnowledgeItem(taxkbDoc);
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 根据过滤条件查找知识条目
   */
  async findByFilters(filters: {
    keyword?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<KnowledgeItem[]> {
    // 使用TaxKB的文档搜索
    const results = await this.adapter.searchDocuments(
      filters.keyword || '',
      {
        status: ['active'],
        limit: filters.limit || 20,
      }
    );

    // 批量获取详细信息
    const items = await Promise.all(
      results.map(async (result) => {
        const doc = await this.adapter.getDocument(result.doc_id, {
          include: ['tags', 'metadata'],
        });
        return TaxKBMapper.toKnowledgeItem(doc);
      })
    );

    // 前端过滤（TaxKB不支持category和tags过滤）
    return items.filter((item) => {
      const props = item.toJSON();

      if (filters.category && props.category !== filters.category) {
        return false;
      }

      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((tag) => props.tags.includes(tag));
        if (!hasTag) return false;
      }

      return true;
    });
  }

  /**
   * 保存知识条目（创建或更新）
   */
  async save(item: KnowledgeItem): Promise<void> {
    // TaxKB不支持直接更新文档内容，仅支持上传新文档
    // 此方法主要用于更新元数据或分类
    console.warn('TaxKB不支持直接更新文档，请通过上传新文档替代');
  }

  /**
   * 删除知识条目
   */
  async delete(id: string): Promise<void> {
    await this.adapter.deleteDocument(id);
  }

  /**
   * 语义搜索（扩展方法）
   */
  async semanticSearch(
    query: string,
    options?: { topK?: number }
  ): Promise<KnowledgeItem[]> {
    const results = await this.adapter.semanticSearch(query, {
      topK: options?.topK || 5,
      includeChunks: false,
    });

    // 获取完整文档信息
    const items = await Promise.all(
      results.map(async (result) => {
        const doc = await this.adapter.getDocument(result.doc_id);
        return TaxKBMapper.toKnowledgeItem(doc);
      })
    );

    return items;
  }

  /**
   * QA搜索（扩展方法）
   */
  async searchQA(question: string, topK: number = 5): Promise<any[]> {
    return await this.adapter.searchQA(question, { top_k: topK });
  }
}
```

---

## 五、配置管理

### 5.1 配置文件

**文件**：`backend/src/config/taxkb.config.ts`

```typescript
export const taxkbConfig = {
  // TaxKB服务配置
  baseUrl: process.env.TAXKB_BASE_URL || 'http://localhost:8000/api/v3',
  apiKey: process.env.TAXKB_API_KEY || 'test_api_key',
  timeout: parseInt(process.env.TAXKB_TIMEOUT || '30000'),

  // 功能开关
  enabled: process.env.TAXKB_ENABLED === 'true',

  // 缓存配置
  cache: {
    enabled: true,
    ttl: 300, // 5分钟
    maxSize: 100, // 最多缓存100个文档
  },

  // 重试配置
  retry: {
    maxAttempts: 3,
    backoff: 1000, // 初始等待1秒
  },
};
```

### 5.2 环境变量

**文件**：`.env`

```bash
# TaxKB知识库配置
TAXKB_ENABLED=true
TAXKB_BASE_URL=http://localhost:8000/api/v3
TAXKB_API_KEY=test_api_key
TAXKB_TIMEOUT=30000

# 知识库默认配置
KNOWLEDGE_DEFAULT_SOURCE=taxkb
KNOWLEDGE_CACHE_TTL=300
KNOWLEDGE_MAX_SEARCH_RESULTS=20
```

---

## 六、Use Cases更新

### 6.1 GetKnowledgeItemUseCase

**文件**：`backend/src/application/use-cases/knowledge/GetKnowledgeItemUseCase.ts`

```typescript
export class GetKnowledgeItemUseCase {
  constructor(
    private knowledgeRepository: IKnowledgeRepository // 注入TaxKBKnowledgeRepository
  ) {}

  async execute(id: string): Promise<KnowledgeItemResponseDTO> {
    // 从TaxKB获取文档
    const item = await this.knowledgeRepository.findById(id);

    if (!item) {
      throw new NotFoundError(`Knowledge item ${id} not found`);
    }

    return KnowledgeItemResponseDTO.fromDomain(item);
  }
}
```

### 6.2 SearchKnowledgeUseCase（新增）

**文件**：`backend/src/application/use-cases/knowledge/SearchKnowledgeUseCase.ts`

```typescript
export class SearchKnowledgeUseCase {
  constructor(
    private repository: TaxKBKnowledgeRepository // 使用具体类以访问扩展方法
  ) {}

  async execute(request: {
    query: string;
    mode: 'keyword' | 'semantic' | 'qa';
    filters?: any;
  }): Promise<any> {
    switch (request.mode) {
      case 'keyword':
        return await this.repository.findByFilters({
          keyword: request.query,
          ...request.filters,
        });

      case 'semantic':
        return await this.repository.semanticSearch(request.query, {
          topK: request.filters?.limit || 5,
        });

      case 'qa':
        return await this.repository.searchQA(request.query);

      default:
        throw new Error('Invalid search mode');
    }
  }
}
```

### 6.3 UploadDocumentUseCase（新增）

**文件**：`backend/src/application/use-cases/knowledge/UploadDocumentUseCase.ts`

```typescript
export class UploadDocumentUseCase {
  constructor(
    private adapter: TaxKBAdapter,
    private eventBus: IEventBus
  ) {}

  async execute(request: {
    file: Buffer;
    title: string;
    category?: string;
  }): Promise<string> {
    // 上传文档到TaxKB
    const taxkbDoc = await this.adapter.uploadDocument(request.file, {
      title: request.title,
      category: {
        business_domain: request.category || '其他',
      },
    });

    // 发布领域事件
    await this.eventBus.publish(
      new KnowledgeItemCreatedEvent({
        knowledgeId: taxkbDoc.doc_id,
        title: taxkbDoc.title,
      })
    );

    return taxkbDoc.doc_id;
  }
}
```

---

## 七、API Controller更新

### 7.1 KnowledgeController

**文件**：`backend/src/presentation/http/controllers/KnowledgeController.ts`

```typescript
export class KnowledgeController {
  /**
   * 搜索知识（支持多模式）
   * POST /api/knowledge/search
   */
  async search(request: FastifyRequest, reply: FastifyReply) {
    const { query, mode = 'keyword', filters } = request.body as any;

    const results = await this.searchKnowledgeUseCase.execute({
      query,
      mode,
      filters,
    });

    return reply.send({
      success: true,
      data: results,
    });
  }

  /**
   * 上传文档
   * POST /api/knowledge/upload
   */
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();

    if (!data) {
      throw new BadRequestError('No file uploaded');
    }

    const buffer = await data.toBuffer();

    const docId = await this.uploadDocumentUseCase.execute({
      file: buffer,
      title: data.filename,
      category: (request.body as any).category,
    });

    return reply.send({
      success: true,
      data: { docId },
      message: '文档上传成功，正在处理中',
    });
  }

  /**
   * 获取处理进度
   * GET /api/knowledge/:id/progress
   */
  async getProgress(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const progress = await this.adapter.getProcessingProgress(id);

    return reply.send({
      success: true,
      data: progress,
    });
  }
}
```

---

## 八、错误处理策略

### 8.1 错误类型

| 错误类型 | 处理策略 |
|---------|---------|
| **网络超时** | 重试3次，间隔递增 |
| **404 Not Found** | 返回null，不抛异常 |
| **409 Conflict** | 文档重复，提示用户 |
| **422 Unprocessable** | 参数错误，返回错误详情 |
| **500 Internal Error** | 记录日志，返回通用错误 |
| **503 Service Unavailable** | TaxKB不可用，降级到错误提示 |

### 8.2 Circuit Breaker（熔断器）

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

---

## 九、性能优化

### 9.1 缓存策略

**LRU缓存**：
```typescript
import LRU from 'lru-cache';

const documentCache = new LRU<string, KnowledgeItem>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5分钟
});

export class CachedTaxKBRepository implements IKnowledgeRepository {
  constructor(
    private baseRepository: TaxKBKnowledgeRepository,
    private cache: LRU<string, KnowledgeItem>
  ) {}

  async findById(id: string): Promise<KnowledgeItem | null> {
    // 先查缓存
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // 调用TaxKB
    const item = await this.baseRepository.findById(id);

    if (item) {
      this.cache.set(id, item);
    }

    return item;
  }
}
```

### 9.2 批量请求优化

```typescript
export class BatchRequestOptimizer {
  private queue: string[] = [];
  private timer: NodeJS.Timeout | null = null;

  async batchGet(docIds: string[]): Promise<KnowledgeItem[]> {
    // 将请求合并到队列
    this.queue.push(...docIds);

    // 延迟100ms执行批量请求
    return new Promise((resolve) => {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(async () => {
        const ids = [...new Set(this.queue)];
        this.queue = [];

        // 并行请求
        const results = await Promise.all(
          ids.map((id) => this.repository.findById(id))
        );

        resolve(results.filter((item) => item !== null));
      }, 100);
    });
  }
}
```

---

## 十、前端集成

### 10.1 前端Repository更新

**文件**：`assets/js/infrastructure/repositories/KnowledgeRepository.js`

```javascript
export class KnowledgeRepository {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 搜索知识（支持语义搜索）
   */
  async search(query, mode = 'keyword', filters = {}) {
    const response = await this.apiClient.post('/api/knowledge/search', {
      query,
      mode,
      filters,
    });

    return response.data.map(item =>
      KnowledgeItem.rehydrate(item, item.id)
    );
  }

  /**
   * 上传文档
   */
  async uploadDocument(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title || file.name);
    formData.append('category', metadata.category || 'other');

    const response = await this.apiClient.post('/api/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.docId;
  }

  /**
   * 获取处理进度
   */
  async getProgress(docId) {
    const response = await this.apiClient.get(`/api/knowledge/${docId}/progress`);
    return response.data;
  }
}
```

---

## 十一、测试策略

### 11.1 单元测试

**TaxKBAdapter测试**：
```typescript
describe('TaxKBAdapter', () => {
  it('should upload document successfully', async () => {
    const adapter = new TaxKBAdapter();
    const file = Buffer.from('test content');

    const result = await adapter.uploadDocument(file, {
      title: 'Test Document',
    });

    expect(result.doc_id).toBeDefined();
    expect(result.status).toBe('draft');
  });

  it('should handle 404 error gracefully', async () => {
    const adapter = new TaxKBAdapter();

    await expect(adapter.getDocument('non-existent')).rejects.toThrow(
      TaxKBError
    );
  });
});
```

**TaxKBMapper测试**：
```typescript
describe('TaxKBMapper', () => {
  it('should map TaxKB document to KnowledgeItem', () => {
    const taxkbDoc = {
      doc_id: 'doc_123',
      title: '产假政策',
      content: '...',
      category: { business_domain: '员工关系/假期管理' },
      tags: { '时间': [{ name: '2025年' }] },
    };

    const item = TaxKBMapper.toKnowledgeItem(taxkbDoc);

    expect(item.id).toBe('doc_123');
    expect(item.category).toBe('policy');
    expect(item.tags).toContain('2025年');
  });
});
```

### 11.2 集成测试

```typescript
describe('TaxKBKnowledgeRepository Integration', () => {
  let repository: TaxKBKnowledgeRepository;

  beforeEach(() => {
    const adapter = new TaxKBAdapter();
    repository = new TaxKBKnowledgeRepository(adapter);
  });

  it('should find documents by keyword', async () => {
    const results = await repository.findByFilters({
      keyword: '产假',
      limit: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toBeInstanceOf(KnowledgeItem);
  });

  it('should perform semantic search', async () => {
    const results = await repository.semanticSearch('如何申请产假');

    expect(results.length).toBeGreaterThan(0);
  });
});
```

---

## 十二、部署方案

### 12.1 Docker Compose配置

**文件**：`docker-compose.yml`

```yaml
version: '3.8'

services:
  # 售后系统后端
  backend:
    build: ./backend
    environment:
      - TAXKB_ENABLED=true
      - TAXKB_BASE_URL=http://taxkb:8000/api/v3
      - TAXKB_API_KEY=${TAXKB_API_KEY}
    depends_on:
      - taxkb

  # TaxKB服务（假设有Docker镜像）
  taxkb:
    image: taxkb:v3.1
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://taxkb_user:password@taxkb_db:5432/taxkb
    depends_on:
      - taxkb_db

  # TaxKB数据库
  taxkb_db:
    image: postgres:15
    environment:
      - POSTGRES_USER=taxkb_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=taxkb
```

### 12.2 健康检查

```typescript
export class HealthCheckService {
  constructor(private adapter: TaxKBAdapter) {}

  async checkTaxKB(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();

    try {
      await this.adapter.getDocument('health-check-doc');
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}
```

---

## 十三、实施步骤

### 阶段1：基础适配层（2-3天）

1. ✅ 创建 `TaxKBAdapter.ts`
2. ✅ 创建 `TaxKBMapper.ts`
3. ✅ 实现基本API调用（上传、获取、搜索）
4. ✅ 添加错误处理和重试机制
5. ✅ 编写单元测试

### 阶段2：Repository集成（1-2天）

1. ✅ 创建 `TaxKBKnowledgeRepository.ts`
2. ✅ 实现IKnowledgeRepository接口
3. ✅ 添加缓存层
4. ✅ 更新依赖注入配置
5. ✅ 编写集成测试

### 阶段3：Use Cases更新（1天）

1. ✅ 更新现有5个Use Cases
2. ✅ 新增 `SearchKnowledgeUseCase`
3. ✅ 新增 `UploadDocumentUseCase`
4. ✅ 更新Controller

### 阶段4：前端集成（2-3天）

1. ✅ 更新前端 `KnowledgeRepository.js`
2. ✅ 实现文档上传UI
3. ✅ 实现语义搜索UI
4. ✅ 显示处理进度

### 阶段5：测试和优化（1-2天）

1. ✅ 完整集成测试
2. ✅ 性能测试和优化
3. ✅ 错误处理完善
4. ✅ 文档编写

**总计**：7-11天（约56-88小时）

---

## 十四、风险和缓解措施

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| TaxKB服务不可用 | 🟡 中 | 熔断器、健康检查、降级提示 |
| API延迟高 | 🟡 中 | 缓存、批量请求、超时控制 |
| 数据映射错误 | 🟡 中 | 完善Mapper单元测试 |
| 文档处理失败 | 🟢 低 | 轮询进度、重试机制 |

---

## 十五、总结

### 核心优势

1. **功能强大**：利用TaxKB的文档智能处理能力
2. **架构清晰**：适配器模式隔离外部依赖
3. **易于维护**：领域模型不变，仅更新基础设施层
4. **性能优化**：缓存、批量请求、熔断器
5. **可测试性强**：单元测试、集成测试、Mock友好

### 后续优化

1. **监控告警**：集成Grafana监控TaxKB健康度
2. **日志收集**：ELK收集API调用日志
3. **A/B测试**：对比TaxKB vs 本地知识库效果
4. **成本优化**：评估TaxKB API调用成本

---

**文档版本**: v1.0
**最后更新**: 2025-12-16
**维护者**: 开发团队

