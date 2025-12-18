# TaxKB API v3.1 使用说明

**版本**: v3.1.0
**更新日期**: 2025-12-03
**Schema版本**: v2.1
**基础URL**: `http://localhost:8000/api/v3`

---

## 一、系统简介

### 1.1 TaxKB 是什么

TaxKB 是一个**智能知识库系统**，核心价值是将**非结构化的文档**（PDF/DOCX/XLSX）转化为**可检索、可问答的知识**，广泛应用于企业政策文档管理、个税咨询服务等场景。

### 1.2 核心功能

| 功能模块 | 说明 |
|---------|------|
| **智能提取** | 文档 → Markdown + 表格 + 图片，支持多格式 |
| **文档去重** | 基于file_hash自动检测重复上传 |
| **相似度检测** | 自动识别文档版本关系和变体 |
| **分层加工** | L0→L1→L2→L3分层处理，支持增量更新 |
| **智能分类** | 7维度标签体系，自动分类+人工确认 |
| **语义检索** | 向量化检索，支持标签过滤和多策略搜索 |
| **知识问答** | QA对提取，问题直达答案，带来源引用 |
| **生命周期管理** | 完整的文档状态机，异常检测与决策分离 |

### 1.3 v3.1 主要变更

相比v3.0，v3.1引入了**完整的文档生命周期管理机制**，核心变更如下：

#### 变更1：文档状态机重构

**v3.0**：简单的processing状态（pending/processing/completed）

**v3.1**：语义化状态机，表达"文档能不能用"
```
draft → active/pending_review → archived/deprecated
         ↓
    可检索      需人工决策      已归档/已废弃
```

#### 变更2：上传阶段异常检测

新增三层检测机制，在上传时发现问题：

1. **file_hash去重**：完全相同文件，返回409 Conflict
2. **相似度检测**：L2完成后检测相似文档（≥0.85），自动进入pending_review
3. **分类置信度检测**：L3自动分类置信度<0.7，进入pending_review等待确认

#### 变更3：分类与标签分离

- **核心分类**（document_category表）：公司主体、业务领域为必填字段，决定文档能否激活
- **内容标签**（document_tags表）：可选辅助信息，不阻塞文档检索

#### 变更4：职责边界清晰

| 角色 | 职责 |
|-----|------|
| **知识库** | 检测异常、暴露状态、提供原子操作API |
| **外围系统** | 查询状态、收集用户决策、调用原子操作完成业务逻辑 |

#### 变更5：新增/调整的API

**新增**：
- `GET /documents/{doc_id}/review` - 查询pending_review详情
- `PATCH /documents/{doc_id}/category` - 更新文档分类（原子操作）
- `PATCH /documents/{doc_id}/metadata` - 更新文档元数据（如文件名）
- `POST /documents/{doc_id}/decisions` - 已废弃，改为外围系统组合原子操作

**调整**：
- `POST /documents` - 增加409冲突响应，支持重复检测
- `GET /documents/{doc_id}` - 返回新状态字段（status, status_reason）
- `GET /documents/{doc_id}/processing` - 处理进度从jobs表实时派生
- ~~`GET /documents/{doc_id}/similar` - 增强相似度检测，返回关系类型~~（v3.1.1起下线，逻辑并入“相似度检测任务”+`GET /documents/{doc_id}/review`）

**删除**：
- 不再提供"决策"类API，外围系统通过组合PATCH操作实现业务逻辑

---

## 二、API总览

### 2.1 认证说明

所有API请求需在HTTP Header中提供API Key：

```http
X-API-Key: your-api-key
```

测试环境默认：`test_api_key`

#### 状态码与错误响应

所有API均遵循标准HTTP状态码语义，调用方应首先依据状态码判断结果，再解析响应体。常见状态如下：

| 状态码 | 典型场景 | 说明 |
|--------|----------|------|
| **200 OK** | GET/POST/PATCH成功 | 同步操作完成并返回结果。 |
| **201 Created** | 文档上传、创建Processing | 已创建新的资源，响应体中包含标识符。 |
| **202 Accepted** | 触发异步任务 | 请求已接受，将在后台处理（如批量Processing）。 |
| **204 No Content** | DELETE等幂等操作 | 操作成功但无返回体。 |
| **400 Bad Request** | 参数缺失、格式错误 | 调整请求并重试。 |
| **401 Unauthorized** | API Key缺失或无效 | 校验`X-API-Key`。 |
| **403 Forbidden** | 没有访问权限 | 账号被禁用或无接口授权。 |
| **404 Not Found** | doc_id/资源不存在 | 确认资源是否已创建或被删除。 |
| **409 Conflict** | 资源状态冲突 | 例如上传重复文档（`duplicate_file`、`duplicate_file_different_name`）。 |
| **422 Unprocessable Entity** | 业务校验不通过 | 字段值违反约束（如分类缺失）。 |
| **429 Too Many Requests** | 触发限流 | 稍后重试或降低频率。 |
| **500 Internal Server Error** | 服务内部异常 | 稍后重试并联系维护人员。 |
| **503 Service Unavailable** | 服务维护或处理资源不足 | 等待恢复或重试。 |

当返回4xx/5xx时，响应体遵循统一结构：

```json
{
  "error": "error_code",
  "message": "人类可读描述",
  "details": {
    "...": "可选的上下文信息"
  }
}
```

例如上传重复文档会返回`409 + duplicate_file`，外部系统可根据`status_code`快速分支，再结合`error`字段执行细分逻辑。

---

### 2.2 文档管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/documents` | 上传文档（含去重检测） |
| GET | `/documents/{doc_id}` | 查询文档详情（含状态） |
| GET | `/documents/{doc_id}/content` | 获取文档Markdown内容 |
| GET | `/documents/{doc_id}/processing` | 查询文档处理进度 |
| GET | `/documents/{doc_id}/review` | 查询pending_review详情 ⭐新增 |
| ~~GET~~ | ~~`/documents/{doc_id}/similar`~~ | ⚠️ v3.1.1起下线，改用`similarity_detect`任务 + `GET /documents/{doc_id}/review` 观看结果 |
| PATCH | `/documents/{doc_id}` | 更新文档状态（原子操作） ⭐调整 |
| PATCH | `/documents/{doc_id}/category` | 更新文档分类（原子操作） ⭐新增 |
| PATCH | `/documents/{doc_id}/metadata` | 更新文档元数据（原子操作） ⭐新增 |
| PATCH | `/documents/{doc_id}/review/{review_id}` | 更新pending_review项状态（处理记录） ⭐新增 |
| PATCH | `/documents/{doc_id}/tags` | 修改文档标签 |
| DELETE | `/documents/{doc_id}` | 删除文档 |

---

### 2.3 分类与标签 API

**分类字典（单级）**

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/categories` | 查询公司主体或业务领域（单级列表），支持`type=company_entity|business_domain` |

**标签（单层、含维度）**

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/tags` | 查询标签列表，支持`dimension`过滤（如`时间`、`地点`、`用户`） |
| PATCH | `/documents/{doc_id}/tags` | 批量打标/解绑标签 |
| GET | `/tags/{tag_id}/documents` | 查询标签下的文档 |

---

### 2.4 搜索 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/search/documents` | 文档检索（标签过滤） |
| POST | `/search/semantic` | 语义搜索 |
| POST | `/search/qa` | QA搜索 |

---

### 2.5 任务管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/processings` | 创建Processing批量任务 |
| GET | `/processings` | 列表查询Processings |
| GET | `/processings/{processing_id}` | 查询Processing状态 |
| GET | `/processings/{processing_id}/jobs` | 查询Processing的所有Jobs |
| POST | `/processings/{processing_id}/retry` | 重试失败任务 |
| POST | `/processings/{processing_id}/cancel` | 取消Processing |
| GET | `/jobs` | 列表查询Jobs |
| GET | `/jobs/{job_id}` | 查询Job状态 |
| POST | `/jobs/{job_id}/retry` | 重试Job |

---

### 2.6 统计 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/stats/overview` | 统计总览 |
| GET | `/stats/documents` | 文档分布统计（公司主体/业务领域/状态） |
| GET | `/stats/tags` | 标签统计 |
| GET | `/stats/processings` | 任务统计 |
| GET | `/stats/quality` | 质量统计 |

---

### 2.7 QA管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/qa/extract` | 触发QA提取任务 |
| GET | `/qa/pairs` | 列表查询QA Pairs |
| GET | `/qa/pairs/{qa_id}` | 查询QA Pair详情 |
| GET | `/qa/stats` | QA统计信息 |

---

## 三、API详细说明

### 3.1 文档管理 API

#### 3.1.1 上传文档

**端点**：`POST /api/v3/documents`

**功能**：上传文档，自动进行file_hash去重检测。

**请求参数**：
- **file** (必填, multipart): 文件二进制数据
- **metadata** (可选, JSON字符串): 元数据

**metadata字段**：
```json
{
  "title": "文档标题（可选，默认使用filename）",
  "description": "文档描述（可选）",
  "category": {
    "company_entity": "公司主体（可选）",
    "business_domain": "业务领域（可选）"
  }
}
```

> 说明：`metadata.category` 完全可选。如果上传方提供主体/业务域，系统会记录为“用户建议分类（source=manual_upload）”，L2/L3 自动分类完成后若检测到与用户建议不一致，会进入 `pending_review`，`review_type=category_conflict`。外部系统可提示用户确认保留哪个分类。

**响应示例（成功）**：
```json
{
  "doc_id": "doc_abc123def456",
  "status": "draft",
  "message": "文档上传成功，已自动创建L1提取任务",
  "document": {
    "title": "2025年产假政策",
    "file_hash": "sha256:abc123...",
    "file_size": 102400,
    "created_at": "2025-12-03T10:00:00"
  },
  "category": {
    "company_entity": "北京总部",
    "business_domain": "员工关系/假期管理",
    "source": "manual",
    "verified": true
  },
  "tags": {
    "时间维度": [
      {"tag_id": "tag_001", "name": "2025年", "verified": true}
    ]
  },
  "processing": {
    "processing_id": "proc_xyz789",
    "tasks": ["l1_extract", "l2_vectorize", "l3_knowledge_extract"]
  }
}
```

- **分类来源说明**：
  - 未提供分类：系统自动提取，响应中 `category.source="auto"`、`verified=false`，若置信度不足会进入`pending_review`。
  - 提供了分类：字段标记为 `source="manual_upload"`，自动分类仍会执行；若与用户输入冲突，则设置`review_type="category_conflict"`等待确认。

**响应示例（重复-文件名一致）**：
```json
// HTTP 409 Conflict
{
  "error": "duplicate_file",
  "message": "文档已存在",
  "existing_doc": {
    "doc_id": "doc_001",
    "title": "2025年产假政策",
    "file_hash": "sha256:abc123...",
    "created_at": "2025-11-28T10:00:00",
    "uploaded_by": "张经理"
  }
}
```

**响应示例（重复-文件名不一致）**：
```json
// HTTP 409 Conflict
{
  "error": "duplicate_file_different_name",
  "message": "文档内容已存在，但文件名不同",
  "existing_doc": {
    "doc_id": "doc_001",
    "filename": "产假政策-2025.pdf",
    "file_hash": "sha256:abc123..."
  },
  "new_filename": "2025年产假政策.pdf",
  "suggested_actions": [
    "使用已有文档（doc_001）",
    "更新文件名为新文件名（调用PATCH /documents/{doc_id}/metadata）",
    "取消上传"
  ]
}
```

**使用示例**：
```bash
# 基础上传
curl -X POST "http://localhost:8000/api/v3/documents" \
  -H "X-API-Key: test_api_key" \
  -F "file=@document.pdf"

# 带分类上传
curl -X POST "http://localhost:8000/api/v3/documents" \
  -H "X-API-Key: test_api_key" \
  -F "file=@document.pdf" \
  -F 'metadata={
    "title": "产假政策",
    "category": {
      "company_entity": "北京总部",
      "business_domain": "员工关系/假期管理"
    }
  }'
```

---

#### 3.1.2 查询文档详情 ⭐v3.1重构

**端点**：`GET /api/v3/documents/{doc_id}`

**功能**：查询文档详情，支持按需返回不同维度信息。v3.1版本移除了L2相关字段，新增了sections目录结构。

**查询参数**：
- **include** (可选): 包含的字段，逗号分隔，支持以下值：
  - `tags`: 返回标签信息（默认包含）
  - `fulltext`: 返回L1全文 markdown_content
  - `sections`: 返回文档目录结构（仅heading chunk）
  - `metadata`: 返回元数据信息（page_count, summary等）

**响应字段说明**：

| 字段 | 类型 | 说明 | 返回条件 |
|------|------|------|----------|
| `doc_id` | string | 文档唯一ID | 始终返回 |
| `title` | string | 文档标题 | 始终返回 |
| `file_hash` | string | 文件哈希值 | 始终返回 |
| `status` | string | 生命周期状态（draft/pending_review/active/archived/deprecated） | 始终返回 |
| `file_size` | int | 文件大小（字节） | 始终返回 |
| `file_path` | string | 文件存储路径 | 始终返回 |
| `created_at` | string | 创建时间 | 始终返回 |
| `updated_at` | string | 更新时间 | 始终返回 |
| `tags` | object | 标签信息（按维度分组） | 默认返回 |
| `content` | string | L1全文Markdown | include=fulltext |
| `sections` | array | 目录结构（仅heading） | include=sections |
| `section_stats` | object | chunk统计信息 | include=sections |
| `page_count` | int | 页数 | include=metadata |
| `char_count` | int | 字符数 | include=metadata |
| `table_count` | int | 表格数 | include=metadata |
| `image_count` | int | 图片数 | include=metadata |
| `one_sentence_summary` | string | 一句话摘要 | include=metadata |
| `detailed_summary` | string | 详细摘要 | include=metadata |
| `quality_score` | float | 质量分（0-1） | include=metadata |

**sections字段结构**（目录项，仅heading chunk）：
```json
{
  "chunk_id": "doc_xxx_000",
  "section_heading": "第一章 总则",
  "section_level": 1,
  "page_numbers": [1],
  "parent_chunk_id": null
}
```

**section_stats字段结构**：
```json
{
  "total_chunks": 15,
  "heading_count": 3,
  "text_count": 10,
  "image_count": 1,
  "table_count": 1
}
```

**响应示例（基础信息）**：
```json
{
  "doc_id": "doc_abc123def456",
  "title": "2025年产假政策",
  "file_hash": "sha256:abc123...",
  "status": "active",
  "file_size": 102400,
  "file_path": "/storage/2025/12/03/document.pdf",
  "created_at": "2025-12-03T10:00:00",
  "updated_at": "2025-12-03T10:05:00",
  "tags": {
    "时间维度": [{"tag_id": "tag_001", "name": "2025年"}],
    "主题维度": [{"tag_id": "tag_002", "name": "产假"}]
  },
  "content": null,
  "sections": null,
  "section_stats": null,
  "page_count": null,
  "char_count": null,
  "table_count": null,
  "image_count": null,
  "one_sentence_summary": null,
  "detailed_summary": null,
  "quality_score": null
}
```

**响应示例（含目录结构）**：
```json
{
  "doc_id": "doc_abc123def456",
  "title": "2025年产假政策",
  "status": "active",
  "sections": [
    {"chunk_id": "doc_abc123_000", "section_heading": "申请条件", "section_level": 1, "page_numbers": [1], "parent_chunk_id": null},
    {"chunk_id": "doc_abc123_002", "section_heading": "办理流程", "section_level": 2, "page_numbers": [2], "parent_chunk_id": "doc_abc123_000"}
  ],
  "section_stats": {"total_chunks": 15, "heading_count": 3, "text_count": 10, "image_count": 1, "table_count": 1}
}
```

**v3.1变更说明**：

| 变更项 | v3.0 | v3.1 |
|--------|------|------|
| include参数 | `tags,metadata,content` | `tags,fulltext,sections,metadata` |
| L2字段 | 返回`l2_strategy`, `l2_chunk_count`等 | **已移除** |
| 状态字段 | `processing_status` | `status`（语义化lifecycle状态） |
| 目录结构 | 无 | 新增`sections`和`section_stats` |
| 全文字段 | `l1_full_text` | `content` |

**使用示例**：
```bash
# 1. 基础信息 + 标签（默认）
curl "http://localhost:8000/api/v3/documents/doc_abc123" -H "X-API-Key: test_api_key"

# 2. 查看文档目录结构
curl "http://localhost:8000/api/v3/documents/doc_abc123?include=sections" -H "X-API-Key: test_api_key"

# 3. 获取全文
curl "http://localhost:8000/api/v3/documents/doc_abc123?include=fulltext" -H "X-API-Key: test_api_key"

# 4. 完整信息
curl "http://localhost:8000/api/v3/documents/doc_abc123?include=fulltext,sections,metadata" -H "X-API-Key: test_api_key"
```

---

#### 3.1.3 查询pending_review详情 ⭐新增

**端点**：`GET /api/v3/documents/{doc_id}/review`

**功能**：查询处于pending_review状态的文档的详细信息，包括异常原因和可选操作。文档处于pending_review时，L1/L2/L3的检测链路仍会继续完成，所有检测到的问题都会记录到`review_items`里，调用方可一次性查看并逐个处理。

**字段说明**：
- `review_summary.unresolved`：尚未处理的问题数量。
- `review_items[]`：每个元素包含 `review_id`、`type`（`similar_document` / `low_confidence_category` / `category_conflict` / …）、`status`（`unresolved`/`resolved`）、`created_at`、`details`、`suggested_actions`。
- 处理完单个问题后，先执行对应原子操作（如 PATCH 分类 / 状态），再调用 `PATCH /documents/{doc_id}/review/{review_id}` 标记为 `resolved`。当所有`review_items`解决后，文档即可激活（或由外部系统显式激活）。

**响应示例**：
```json
{
  "doc_id": "doc_abc123",
  "status": "pending_review",
  "review_summary": {
    "unresolved": 2,
    "resolved": 0,
    "last_updated": "2025-12-03T10:05:00"
  },
  "review_items": [
    {
      "review_id": "rev_similar_001",
      "type": "similar_document",
      "status": "unresolved",
      "created_at": "2025-12-03T10:00:00",
      "details": {
        "similar_docs": [
          {
            "doc_id": "doc_002",
            "title": "2024年产假政策",
            "similarity": 0.92,
            "relation_type": "version",
            "file_hash": "sha256:def456...",
            "created_at": "2024-12-01T10:00:00",
            "status": "active",
            "l3_one_sentence": "2024年产假政策解读"
          }
        ],
        "diff_summary": [
          "新增：体检医院地址和联系方式",
          "更新：银行卡办理要求"
        ]
      },
      "suggested_actions": [
        {
          "action": "replace",
          "description": "用新文档替换旧文档（旧文档归档）",
          "steps": [
            "PATCH /documents/{new_doc_id} {\"status\": \"active\"}",
            "PATCH /documents/{old_doc_id} {\"status\": \"archived\"}"
          ]
        },
        {
          "action": "keep_both",
          "description": "保留两个版本（标记为variant关系）",
          "steps": [
            "PATCH /documents/{new_doc_id} {\"status\": \"active\"}"
          ]
        },
        {
          "action": "cancel",
          "description": "取消上传新文档",
          "steps": [
            "DELETE /documents/{new_doc_id}"
          ]
        }
      ]
    },
    {
      "review_id": "rev_category_conflict_001",
      "type": "category_conflict",
      "status": "unresolved",
      "created_at": "2025-12-03T10:02:00",
      "details": {
        "user_category": {
          "company_entity": "集团总部",
          "business_domain": "员工关系/假期管理",
          "source": "manual_upload"
        },
        "auto_category": {
          "company_entity": "上海子公司",
          "business_domain": "员工关系/员工服务",
          "confidence": 0.92,
          "source": "auto"
        },
        "reason": "上传侧分类与AI分类不一致"
      },
      "suggested_actions": [
        {
          "action": "keep_user_category",
          "description": "确认用户分类，保持当前category",
          "steps": [
            "PATCH /documents/{doc_id}/category {company_entity, business_domain, \"source\": \"manual\"}",
            "PATCH /documents/{doc_id} {\"status\": \"active\"}"
          ]
        },
        {
          "action": "use_auto_category",
          "description": "采用AI分类",
          "steps": [
            "PATCH /documents/{doc_id}/category {...auto_category..., \"source\": \"auto_confirmed\"}",
            "PATCH /documents/{doc_id} {\"status\": \"active\"}"
          ]
        }
      ]
    }
  ]
}
```

**使用示例**：
```bash
curl "http://localhost:8000/api/v3/documents/doc_abc123/review" \
  -H "X-API-Key: test_api_key"
```

---

#### 3.1.4 更新文档状态（原子操作） ⭐调整

**端点**：`PATCH /api/v3/documents/{doc_id}`

**功能**：更新文档状态，这是一个原子操作，外围系统可组合多个调用完成复杂业务逻辑。

**请求体**：
```json
{
  "status": "active",  // draft/active/pending_review/archived/deprecated
  "status_reason": "用户确认激活"  // 可选，状态变更原因
}
```

**响应示例**：
```json
{
  "doc_id": "doc_abc123",
  "status": "active",
  "status_reason": "用户确认激活",
  "previous_status": "pending_review",
  "updated_at": "2025-12-03T10:10:00",
  "message": "文档状态已更新"
}
```

**使用示例**：
```bash
# 激活文档
curl -X PATCH "http://localhost:8000/api/v3/documents/doc_abc123" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key" \
  -d '{"status": "active"}'

# 归档文档
curl -X PATCH "http://localhost:8000/api/v3/documents/doc_old" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key" \
  -d '{"status": "archived", "status_reason": "被doc_new替代"}'
```

---

#### 3.1.5 更新文档分类（原子操作） ⭐新增

**端点**：`PATCH /api/v3/documents/{doc_id}/category`

**功能**：更新文档的核心分类（公司主体、业务领域），人工确认的分类会自动激活文档。

**请求体**：
```json
{
  "company_entity": "集团总部",
  "business_domain": "员工关系/员工服务"
}
```

**响应示例**：
```json
{
  "doc_id": "doc_abc123",
  "message": "分类已更新，文档已激活",
  "category": {
    "company_entity": "集团总部",
    "business_domain": "员工关系/员工服务",
    "source": "manual",
    "confidence": 1.0,
    "verified": true
  },
  "status": "active",  // 人工确认分类后自动激活
  "updated_at": "2025-12-03T10:15:00"
}
```

**使用示例**：
```bash
curl -X PATCH "http://localhost:8000/api/v3/documents/doc_abc123/category" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key" \
  -d '{
    "company_entity": "集团总部",
    "business_domain": "员工关系/员工服务"
  }'
```

---

#### 3.1.6 更新文档元数据（原子操作） ⭐新增

**端点**：`PATCH /api/v3/documents/{doc_id}/metadata`

**功能**：更新文档元数据（如文件名、描述），用于处理文件名冲突场景。

**请求体**：
```json
{
  "title": "2025年产假政策（新版）.pdf",
  "description": "更新后的文档描述"
}
```

**响应示例**：
```json
{
  "doc_id": "doc_abc123",
  "message": "文档元数据已更新",
  "title": "2025年产假政策（新版）.pdf",
  "description": "更新后的文档描述",
  "updated_at": "2025-12-03T10:20:00"
}
```

**使用示例**：
```bash
curl -X PATCH "http://localhost:8000/api/v3/documents/doc_abc123/metadata" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key" \
  -d '{"title": "2025年产假政策（新版）.pdf"}'
```

---

#### 3.1.7 查找相似文档（已下线）

> **自v3.1.1起**，同步API `GET /api/v3/documents/{doc_id}/similar` 暂时下线。相似度检测由后台任务 `similarity_detect` 负责，结果写入 `document_review_items` 和 `version_relations`。
>
> - L2完成后自动触发检测，若发现相似文档（≥0.85），文档状态会被更新为 `pending_review`，并在 `GET /documents/{doc_id}/review` 中返回 `type=similar_document` 的review项。
> - 若只需查看相似关系，可查询 `version_relations`（后续将补充查询接口）。临时方案：调用 `GET /documents/{doc_id}/review`，读取 `details.similar_docs`。
>
> 👉 详见《docs/design/similarity-detection-task.md》

---

#### 3.1.8 查询文档处理进度 ⭐调整

**端点**：`GET /api/v3/documents/{doc_id}/processing`

**功能**：从processing_jobs表实时派生处理进度（不再存储在document_content表）。

**查询参数**：
- **processing_id** (可选): 指定processing_id（默认使用current_processing_id）

**响应示例**：
```json
{
  "doc_id": "doc_abc123",
  "processing_id": "proc_xyz789",
  "overall_status": "processing",  // pending/processing/completed/failed
  "overall_progress": 66,
  "tasks": [
    {
      "job_id": "job_001",
      "task": "l1_extract",
      "status": "completed",
      "progress": 100,
      "created_at": "2025-12-03T10:00:00",
      "started_at": "2025-12-03T10:00:05",
      "completed_at": "2025-12-03T10:01:00",
      "error_message": null
    },
    {
      "job_id": "job_002",
      "task": "l2_vectorize",
      "status": "processing",
      "progress": 50,
      "created_at": "2025-12-03T10:01:00",
      "started_at": "2025-12-03T10:01:05",
      "completed_at": null,
      "error_message": null
    },
    {
      "job_id": "job_003",
      "task": "l3_knowledge_extract",
      "status": "pending",
      "progress": 0,
      "created_at": "2025-12-03T10:00:00",
      "started_at": null,
      "completed_at": null,
      "error_message": null
    }
  ]
}
```

**整体状态计算逻辑**：
- **failed**: 任何任务失败
- **completed**: 所有任务完成
- **processing**: 有任务正在处理
- **pending**: 所有任务待处理

---

### 3.2 其他API（标签、搜索、任务、统计、QA）

为保持v3.1文档的自洽性，本节结合PRD重点对标签、搜索、任务、统计、QA等模块进行详细说明，如果需要历史字段差异可再参考《TaxKB-API-v3-使用说明.md》第5-10节。

#### 3.2.1 与v3.0的差异概览

| 能力 | v3.0 行为 | v3.1 变化 | 相关章节 |
|------|-----------|-----------|----------|
| 分类字典 | 无专门API，分类依赖外部维护 | 新增单级`GET /categories`，提供主体/业务域字典 | 2.3, 3.2.2 |
| 标签管理 | 完整的CRUD能力 | 简化为只读查询与`PATCH /documents/{doc_id}/tags`批量打标，强调轻量定位 | 2.3, 3.2.3 |
| 搜索/相似 | 仅支持标签过滤 | 引入分类过滤、`relation_type`、`min_similarity`参数 | 3.1.7 |
| 任务/Processing | 处理进度存于document_content | 通过`GET /documents/{doc_id}/processing`实时派生，新增`overall_status` | 3.1.8 |
| 统计API | 维度和端点拆分，含大量自由维度参数 | 聚焦分布统计，`/stats/documents` 仅支持 `company_entity` / `business_domain` / `status`，语义清晰 | 2.6, 3.2.5 |
| QA管理 | QA状态与文档耦合 | QA进入`pending_review`以响应文档状态变化 | 4.4, 5.3 |

#### 3.2.2 分类与标签 API

##### GET `/categories`

- **功能**：查询分类字典，包含公司主体和业务领域两个单级列表。
- **查询参数**：
  - `type` (可选): `company_entity` 或 `business_domain`，不传则返回两个列表。
  - `keyword` (可选): 模糊搜索名称。
- **响应示例**：
```json
{
  "company_entity": [
    {"value": "集团总部", "label": "集团总部"},
    {"value": "上海子公司", "label": "上海子公司"}
  ],
  "business_domain": [
    {"value": "员工关系/假期管理", "label": "员工关系/假期管理"}
  ]
}
```

##### GET `/tags`

- **功能**：查询单层标签列表，可按维度过滤。
- **查询参数**：
  - `dimension` (可选): 如`时间`、`地点`、`用户`，不传则返回全部。
  - `keyword` (可选): 模糊搜索标签名。
- **响应示例**：
```json
[
  {"tag_id": "tag_time_2025", "name": "2025年", "dimension": "时间"},
  {"tag_id": "tag_city_sh", "name": "上海", "dimension": "地点"}
]
```

##### PATCH `/documents/{doc_id}/tags`

- **功能**：为文档批量打标或解绑标签。
- **请求体**：
```json
{
  "add": ["tag_time_2025", "tag_city_sh"],
  "remove": ["tag_user_hr"]
}
```
- **响应**：返回当前标签列表。

##### GET `/tags/{tag_id}/documents`

- **功能**：查看标签下的文档列表。
- **查询参数**：`status`（active/pending_review/draft）、`page`, `page_size`。
- **响应示例**：
```json
{
  "tag_id": "tag_time_2025",
  "dimension": "时间",
  "documents": [
    {"doc_id": "doc_a", "title": "2025年产假政策", "status": "active"}
  ],
  "total": 1
}
```

#### 3.2.3 搜索与语义 API

搜索接口在保持v3.0一致性的基础上，新增分类过滤和pending_review隔离。

##### POST `/search/documents`

- **用途**：查找文档级结果，`query_mode` 支持 `filename`（默认）或 `summary`，查询语义随模式切换。
- **请求示例**：
```json
{
  "limit": 20,
  "offset": 0,
  "query_mode": "filename",
  "query": "规章制度",
  "status_filter": ["active", "pending_review"],
  "category_filter": {
    "company_entity": ["金山世游"]
  },
  "tag_filter": [
    {"dimension": "内容标签", "values": ["假期管理"], "match": "any"}
  ],
  "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
  "include": {"tags": true, "category": true}
}
```
- **字段要点**：
  - `status_filter` 默认 `["active"]`，可叠加 `pending_review` 等生命周期；传入非法值会返回400。
  - `tag_filter` 采用 `{dimension, values[], match, negate}` 结构，系统自动展开层级标签并在 `filters_applied.invalid_tags` 回显无效项。
  - `include` 控制是否附带 `tags`、`category`、`content_hash` 等拓展字段。
  - 当 `query_mode=filename` 且向量召回得分 `<0.2` 时，不会出现在 `recommendations` 中。
- **响应示例**：
```json
{
  "total": 3,
  "limit": 20,
  "offset": 0,
  "filters_applied": {
    "query_mode": "filename",
    "status_filter": ["active", "pending_review"],
    "tag_filter": [
      {"dimension": "内容标签", "values": ["假期管理"], "match": "any"}
    ],
    "doc_list_count": 15
  },
  "expanded_tags": {
    "内容标签": ["假期管理"]
  },
  "documents": [
    {
      "doc_id": "doc_20d8f322e731",
      "title": "附件一：金山世游考勤、休假及加班管理规定",
      "status": "active",
      "file_size": 354495,
      "created_at": "2025-12-05T00:24:30.264196",
      "category": {
        "company_entity": "金山世游",
        "business_domain": "员工关系/假期管理"
      },
      "tags": {
        "内容标签": [
          {"tag_id": "tag_fd41d2aa73ac", "name": "绩效考核"}
        ]
      },
      "match_reason": {
        "query_mode": "filename",
        "match": "like"
      }
    }
  ],
  "recommendations": [
    {
      "doc_id": "doc_4e2f16cae7af",
      "title": "附件六：金山世游绩效制度",
      "status": "pending_review",
      "match_reason": {
        "query_mode": "filename",
        "match": "semantic",
        "score": 0.34
      }
    }
  ]
}
```

##### POST `/search/semantic`

- **用途**：统一语义检索入口，可同时检索文档/Chunk 与 QA 对象。
- **请求示例**：
```json
{
  "query": "试用期考核不过会怎样",
  "query_mode": ["document_chunk", "qa_pair"],
  "doc_ids": ["doc_b9747a09663d"],
  "status_filter": ["active", "pending_review"],
  "tag_filter": [
    {"dimension": "主体", "values": ["金山世游"], "match": "any"}
  ],
  "top_k": 5,
  "include": {"chunks": true, "tags": true, "category": true}
}
```
- **字段要点**：
  - `query_mode` 仅接受 `document_chunk`、`qa_pair`，可多选；为空时默认 `document_chunk`。
  - `doc_ids` 用于显式约束候选文档，仍会叠加其他过滤条件；超过500条返回400。
  - `include` 控制返回粒度：`chunks`、`qa_pairs`、`tags`、`category`、`content`。
- **响应示例**：
```json
{
  "query": "试用期考核不过会怎样",
  "top_k": 5,
  "filters_applied": {
    "query_mode": ["document_chunk", "qa_pair"],
    "status_filter": ["active", "pending_review"],
    "doc_ids": ["doc_b9747a09663d"],
    "doc_list_count": 2
  },
  "expanded_tags": {
    "主体": ["金山世游"]
  },
  "total_documents": 1,
  "total_qa_pairs": 1,
  "document_chunk_results": [
    {
      "doc_id": "doc_b9747a09663d",
      "title": "附件七：金山世游员工手册",
      "score": 0.27,
      "match_reason": {
        "query_mode": "document_chunk",
        "score": 0.27
      },
      "category": {
        "company_entity": "金山世游",
        "business_domain": "员工关系/人事管理"
      },
      "tags": {
        "主体": [{"tag_id": "tag_4ad770b675f9", "name": "金山世游"}]
      },
      "chunks": [
        {
          "chunk_id": "doc_b9747a09663d_chunk_0062",
          "content": "5.3 试用期考核...",
          "score": 0.18,
          "source": {
            "section_heading": "试用期考核",
            "page_numbers": [7]
          }
        }
      ]
    }
  ],
  "qa_pair_results": [
    {
      "qa_id": "qa_00123",
      "doc_id": "doc_b9747a09663d",
      "question": "试用期考核不过怎么办？",
      "answer": "公司有权解除劳动合同……",
      "score": 0.41,
      "match_reason": {
        "query_mode": "qa_pair",
        "score": 0.41
      }
    }
  ]
}
```
- **行为说明**：
  - 步骤一总是通过 DuckDB 预筛文档（遵循 status/category/tag/date/doc_ids），`doc_list_count` 回显候选规模。
  - `document_chunk_results` 先按文档得分排序，再根据 `include.chunks` 决定是否附带 chunk 命中详情。
  - `qa_pair_results` 受相同 doc list 限制，且仅当 `query_mode` 包含 `qa_pair` 时返回；若未开启 `include.qa_pairs`，仅提供 doc 级信息。

##### POST `/search/qa`

- **用途**：检索“问答对粒度”的结果，适合聊天机器人直接返回答案。
- **请求参数**：
  - `query` (必填): 用户问题。
  - `doc_filter` (可选): `{ "category": {...}, "doc_ids": [...] }`。
  - `top_k` (可选): 返回答案数量（默认5）。
  - `include_source` (可选，默认true): 是否附带来源文档信息。
- **响应示例**：
```json
{
  "query": "男员工陪产假多久",
  "answers": [
    {
      "qa_id": "qa_001",
      "question": "陪产假时长是多少？",
      "answer": "公司政策规定男员工可享受15天陪产假...",
      "confidence": 0.87,
      "source_doc_id": "doc_abc123",
      "source_excerpt": "……陪产假最长15天……"
    }
  ]
}
```

#### 3.2.4 任务管理 API

Processing用于批量执行各层级任务。所有接口位于`/api/v3/processings`和`/api/v3/jobs`。

##### POST `/processings`

- **功能**：创建处理任务。
- **请求体**：
```json
{
  "task_type": "l3_knowledge_extract",
  "doc_ids": ["doc_a", "doc_b"],
  "priority": "high",
  "callback_url": "https://example.com/hooks/processings"
}
```
- **响应**：`processing_id`, `created_jobs`。

##### GET `/processings/{processing_id}`

- **功能**：查看Processing整体状态。
- **响应要点**：
```json
{
  "processing_id": "proc_xyz",
  "task_type": "l3_knowledge_extract",
  "overall_status": "processing",
  "jobs": [
    {"job_id": "job_1", "doc_id": "doc_a", "status": "completed"},
    {"job_id": "job_2", "doc_id": "doc_b", "status": "failed", "error": "timeout"}
  ]
}
```

##### POST `/processings/{processing_id}/retry`

- **功能**：重试失败的Job，可指定`job_ids`，未传则重试当前Processing下所有失败任务。

##### POST `/processings/{processing_id}/cancel`

- **功能**：取消`pending`或`processing`状态的Processing，后台会终止尚未启动的Job。

##### GET `/jobs/{job_id}`

- **功能**：查看单个Job的状态、错误日志、重试次数等。

#### 3.2.5 统计 API

统计接口帮助运维查看文档状态、分类覆盖及质量。

##### GET `/stats/overview`

- **功能**：返回整体概况。
- **响应示例**：
```json
{
  "total_documents": 337,
  "total_tags": 128,
  "total_processings": 42,
  "total_jobs": 311,
  "avg_quality_score": 0.87,
  "storage_size_mb": 912.4,
  "timestamp": "2025-12-04T09:10:11.123456"
}
```

##### GET `/stats/documents`

- **查询参数**：
  - `dimensions` (可选，重复 Query 参数): 1-3 个维度，限定取值 `company_entity` / `business_domain` / `status`。未指定时默认仅返回 `status` 分布。
  - `status_filter` (可选，重复 Query 参数): 过滤生命周期，允许 `draft` / `pending_review` / `active` / `archived` / `deprecated`。
  - `date_start`, `date_end` (可选): 统计时间范围，格式 `YYYY-MM-DD`，基于 `document_content.created_at`。
- **请求示例**：
```
GET /api/v3/stats/documents?dimensions=company_entity&dimensions=status&status_filter=active&date_start=2025-01-01&date_end=2025-12-31
```
- **响应示例**：
```json
{
  "total_documents": 110,
  "filters_applied": {
    "status": ["active"],
    "date_range": {"start": "2025-01-01", "end": "2025-12-31"}
  },
  "distributions": [
    {
      "dimension": "company_entity",
      "buckets": [
        {"value": "集团总部", "count": 60, "ratio": 0.5455},
        {"value": "上海子公司", "count": 35, "ratio": 0.3182},
        {"value": "未设置", "count": 15, "ratio": 0.1363}
      ]
    },
    {
      "dimension": "status",
      "buckets": [
        {"value": "active", "count": 110, "ratio": 1.0000}
      ]
    }
  ]
}
```

- **说明**：
  - 该端点专注“分布”场景，维度固定为公司主体、业务领域与生命周期状态。
  - `dimensions` 可重复出现，响应将按照入参顺序返回多段 `dimension` 对象；每个桶包含绝对数量 `count` 与四位小数的占比 `ratio`，方便前端直接展示。
  - `filters_applied` 回显当前的生命周期/日期过滤条件，便于审计统计口径。
  - 如果数据库为空或某个维度下没有有效值，则对应 `buckets` 返回空数组。

##### GET `/stats/tags`

- **功能**：统计标签维度的总体情况，并支持按关键词过滤查看命中的标签及其关联文档数量。
- **查询参数**：`keyword`（可选，模糊匹配标签名称）。
- **响应示例**：
```json
{
  "total_tags": 128,
  "by_dimension": {
    "主体": 60,
    "业务域": 40,
    "时间": 28
  },
  "top_tags": [
    {"tag_id": "tag_headquarter", "name": "集团总部政策", "dimension": "主体", "doc_count": 45}
  ],
  "avg_tags_per_doc": 3.2,
  "filters_applied": {
    "keyword": "总部"
  },
  "tags": [
    {"tag_id": "tag_headquarter", "name": "集团总部政策", "dimension": "主体", "doc_count": 45}
  ]
}
```

##### GET `/stats/quality`

- **功能**：依据 `document_review_items` 汇总 pending_review 问题类型，便于查看 `similar_document`、`low_confidence_category` 等异常的处理进度。
- **查询参数**：`review_type`（可选），仅统计某种问题类型。
- **响应示例**：
```json
{
  "total_issues": 12,
  "filters_applied": {
    "review_type": "similar_document"
  },
  "by_type": [
    {
      "review_type": "similar_document",
      "unresolved": 5,
      "resolved": 2,
      "total": 7
    }
  ]
}
```

#### 3.2.6 QA管理 API

QA接口负责触发知识问答抽取与维护问答数据。

##### POST `/qa/extract`

- **功能**：为指定文档生成问答对。
- **请求体**：
```json
{
  "doc_id": "doc_abc123",
  "prompt_template": "请生成5条覆盖主要条款的问答",
  "max_pairs": 5,
  "tags": ["主题维度:产假"]
}
```
- **响应**：返回`task_id`和预计完成时间。

##### GET `/qa/pairs`

- **功能**：分页查询问答对，可按文档、状态或关键词过滤。常用于Dashboard或审核工具中列出可复核/可展示的问答。
- **查询参数**：
  - `doc_id` (可选): 只查看某一文档的问答。
  - `status` (可选): `draft` / `published` / `pending_review`。
  - `keyword` (可选): 在问题或答案文本中模糊匹配。
  - `page`, `page_size` (可选): 分页参数，默认 `page=1`, `page_size=20`。
- **响应示例**：
```json
{
  "total": 2,
  "pairs": [
    {
      "qa_id": "qa_001",
      "question": "陪产假可以休多久？",
      "answer": "男员工可享受15天陪产假，需提前5个工作日申请。",
      "status": "published",
      "confidence": 0.85,
      "source": {
        "doc_id": "doc_abc123",
        "doc_title": "集团总部陪产假流程指引",
        "chunks": [
          {
            "chunk_id": "chunk_12",
            "content": "……男员工陪产假最长15天，需提前5个工作日递交申请……"
          }
        ]
      },
      "updated_at": "2025-12-03T11:00:00"
    }
  ]
}
```
- **要点**：`pairs[].source` 返回引用的文档和具体内容片段，便于 UI 展示“答案出处”或快速跳转到原文。

##### GET `/qa/pairs/{qa_id}`

- **功能**：查看单条问答详情。
- **响应示例**：
```json
{
  "qa_id": "qa_001",
  "doc_id": "doc_abc123",
  "question": "员工可享受多久产假？",
  "answer": "法定产假为98天，另可申请延长...",
  "source_chunks": [
    {"chunk_id": "chunk_12", "content": "...."}
  ],
  "status": "published",
  "updated_at": "2025-12-03T11:00:00"
}
```

##### GET `/qa/stats`

- **功能**：统计问答数量及状态分布，可配合Dashboard显示发布进度。

> 提示：若需要更细粒度的字段说明（如分页返回字段、错误码），请参考各接口响应示例与第2章状态码规范。

---

## 四、核心业务场景

### 4.1 场景1：检测到完全重复的文档

**业务流程**：用户上传文件 → 系统检测到file_hash重复 → 返回409告知已存在

```python
# 外围系统（IM Agent）
def handle_document_upload(file_path):
    # 1. 调用上传API
    response = POST("/api/v3/documents", files={"file": file_path})

    if response.status_code == 409:
        # 2. 检测到重复
        error = response.json()
        if error["error"] == "duplicate_file":
            # 文件名一致，完全重复
            existing = error["existing_doc"]
            notify_user(f"""
                这份文档之前已经录入过了！
                📄 已存在文档：{existing['title']}
                📅 录入时间：{existing['created_at']}
                不需要重复上传。
            """)
            return existing["doc_id"]

        elif error["error"] == "duplicate_file_different_name":
            # 文件名不一致，询问用户
            choice = ask_user(f"""
                文档内容已存在，但文件名不同：
                已有：{error['existing_doc']['filename']}
                新的：{error['new_filename']}

                您希望：
                1. 使用已有文档
                2. 更新为新文件名
                3. 取消上传
            """)

            if choice == "更新文件名":
                # 3. 更新文件名
                doc_id = error["existing_doc"]["doc_id"]
                PATCH(f"/api/v3/documents/{doc_id}/metadata", {
                    "title": error["new_filename"]
                })
                notify_user("文件名已更新")
                return doc_id

            elif choice == "使用已有":
                return error["existing_doc"]["doc_id"]

            else:
                notify_user("已取消")
                return None

    else:
        # 上传成功，返回doc_id
        return response.json()["doc_id"]
```

---

#### 3.1.9 更新pending_review项状态 ⭐新增

**端点**：`PATCH /api/v3/documents/{doc_id}/review/{review_id}`

**功能**：在完成相应的原子操作后，标记某个`review_item`为已处理（或重新打开）。系统会同步更新`review_summary.unresolved`计数；当所有问题均为`resolved`时，若文档状态允许，将自动从`pending_review`转为`active`（或按调用方后续的状态更新请求执行）。

**请求体**：
```json
{
  "status": "resolved",   // 可选值：resolved / unresolved
  "resolution_reason": "已确认AI分类，文档可用",
  "metadata": {
    "operator": "张经理"
  }
}
```

**响应示例**：
```json
{
  "doc_id": "doc_abc123",
  "review_item": {
    "review_id": "rev_category_conflict_001",
    "type": "category_conflict",
    "status": "resolved",
    "resolved_at": "2025-12-03T10:05:00",
    "resolution_reason": "用户确认AI分类"
  },
  "review_summary": {
    "unresolved": 0,
    "resolved": 2
  },
  "next_step": "文档状态可更新为active"
}
```

**说明**：
- `status` 默认只能从 `unresolved` → `resolved`，特殊情况下可重新打开（传`unresolved`）。
- 调用前应先完成对应的业务操作（例如：PATCH分类、归档旧文档）。该接口仅记录“已处理”的事实，并驱动待办数量的变化。
- 若最后一个问题被标记为`resolved`，系统会尝试自动激活文档；若需要额外条件（例如等待异步处理），可在随后调用`PATCH /documents/{doc_id}`更新状态。

---

### 4.2 场景2：检测到高度相似的文档（新版本）

**业务流程**：
1. 文档上传成功，自动触发L1→L2→L3
2. L2完成后，系统检测到相似文档（similarity=0.92）
3. 文档进入pending_review状态
4. 外围系统查询状态，发现异常，通知用户
5. 用户决策"用新版本替换旧版本"
6. 外围系统调用原子操作完成替换

```python
# 外围系统（IM Agent）
def monitor_document_processing(doc_id):
    # 1. 轮询处理进度
    while True:
        progress = GET(f"/api/v3/documents/{doc_id}/processing")

        if progress["overall_status"] == "completed":
            # 2. 处理完成，检查文档状态
            doc = GET(f"/api/v3/documents/{doc_id}")

            if doc["status"] == "pending_review":
                # 3. 发现异常，查询详情
                review = GET(f"/api/v3/documents/{doc_id}/review")

                for item in review["review_items"]:
                    if item["type"] != "similar_document":
                        continue

                    similar = item["details"]["similar_docs"][0]
                    diff_summary = "\n".join(item["details"]["diff_summary"])

                    choice = ask_user(f"""
                        发现这份文档和之前的一份很相似！
                        📄 相似文档：{similar['title']}
                        📊 相似度：{similar['similarity']:.0%}

                        主要差异：
                        {diff_summary}

                        您希望：
                        1. 用新版本替换旧版本
                        2. 保留两个版本
                        3. 取消上传
                    """)

                    if choice == "替换":
                        # 5. 组合原子操作：激活新文档 + 归档旧文档
                        PATCH(f"/api/v3/documents/{doc_id}", {
                            "status": "active"
                        })
                        PATCH(f"/api/v3/documents/{similar['doc_id']}", {
                            "status": "archived",
                            "status_reason": f"被{doc_id}替代"
                        })
                        notify_user("已用新版本替换旧版本")

                    elif choice == "保留":
                        # 6. 只激活新文档，旧文档保持active
                        PATCH(f"/api/v3/documents/{doc_id}", {
                            "status": "active"
                        })
                        notify_user("已保留两个版本")

                    else:
                        # 7. 删除新文档
                        DELETE(f"/api/v3/documents/{doc_id}")
                        notify_user("已取消上传")

            elif doc["status"] == "active":
                notify_user("文档处理完成，可正常检索")

            break

        elif progress["overall_status"] == "failed":
            notify_user("处理失败，请重试")
            break

        sleep(5)
```

---

### 4.3 场景3：自动分类置信度低，需要人工确认

**业务流程**：
1. L3完成后，自动分类置信度<0.7
2. 文档进入pending_review状态
3. 外围系统引导用户确认分类
4. 用户确认后，文档自动激活

```python
# 外围系统（IM Agent）
def handle_low_confidence_category(doc_id):
    # 1. 查询review详情
    review = GET(f"/api/v3/documents/{doc_id}/review")

    for item in review["review_items"]:
        if item["type"] != "low_confidence_category":
            continue

        current = item["details"]["current_category"]

        user_input = ask_user(f"""
            我不太确定这份文档应该归到哪个分类，需要您帮忙确认：

            📋 我的猜测（不确定）：
            • 公司主体：{current['company_entity']}（置信度{current['confidence']:.0%}）
            • 业务领域：{current['business_domain']}

            请确认或修改：
        """)

        PATCH(f"/api/v3/documents/{doc_id}/category", {
            "company_entity": user_input["company_entity"],
            "business_domain": user_input["business_domain"]
        })

        doc = GET(f"/api/v3/documents/{doc_id}")
        notify_user(f"分类已更新，文档现在可以正常检索了（状态：{doc['status']}）")
```

---

### 4.4 场景4：完整的文档处理流程（含QA提取）

**业务流程**：上传 → L1→L2→L3自动执行 → 手动触发QA提取 → 完成

```python
# 外围系统（IM Agent）
def complete_document_workflow(file_path, with_qa=True):
    # 步骤1: 上传文档（带分类）
    doc = POST("/api/v3/documents",
        files={"file": file_path},
        data={
            "metadata": json.dumps({
                "category": {
                    "company_entity": "北京总部",
                    "business_domain": "员工关系/假期管理"
                },
                "tags": {
                    "时间维度": ["2025年"],
                    "主题维度": ["产假"]
                }
            })
        }
    )
    doc_id = doc["doc_id"]
    processing_id = doc["processing"]["processing_id"]

    # 步骤2: 等待L1→L2→L3完成
    wait_for_processing_complete(processing_id)

    # 步骤3: 检查文档状态
    doc = GET(f"/api/v3/documents/{doc_id}")

    if doc["status"] == "pending_review":
        # 处理异常（相似文档/低置信度分类）
        handle_pending_review(doc_id)

    # 步骤4: 手动触发QA提取（可选）
    if with_qa:
        qa_result = POST("/api/v3/qa/extract", {
            "doc_ids": [doc_id]
        })
        wait_for_processing_complete(qa_result["processing_id"])

        # 查看提取的QA对
        qa_pairs = GET(f"/api/v3/qa/pairs?doc_id={doc_id}")
        notify_user(f"QA提取完成，生成了{qa_pairs['total']}个问答对")

    # 步骤5: 查看最终文档详情
    final_doc = GET(f"/api/v3/documents/{doc_id}?include=category,tags,metadata")

    notify_user(f"""
        ✅ 文档处理完成！

        📄 标题：{final_doc['title']}
        📊 状态：{final_doc['status']}
        🏢 主体：{final_doc['category']['company_entity']}
        📂 业务领域：{final_doc['category']['business_domain']}
        📝 摘要：{final_doc['l3_one_sentence']}
        🔢 Chunks数量：{final_doc['l2_chunk_count']}
        {'❓ QA对数量：' + str(qa_pairs['total']) if with_qa else ''}
    """)

    return doc_id


# 辅助函数
def wait_for_processing_complete(processing_id):
    """等待Processing完成"""
    while True:
        progress = GET(f"/api/v3/processings/{processing_id}")
        if progress["overall_status"] in ["completed", "failed"]:
            break
        sleep(5)
```

---

### 4.5 场景5：查找相似文档并决策

**业务流程**：上传文档 → 处理完成 → 主动查找相似文档 → 决策是否需要归档旧文档

> ⚠️ v3.1.1 起，相似度检测改由`similarity_detect`任务自动执行。可以通过 `GET /documents/{doc_id}/review` 查看 `type=similar_document` 的结果。以下代码片段仅保留历史参考意义。

```python
# 外围系统（IM Agent）
def upload_and_check_similarity(file_path):
    # 1. 上传并等待L2完成（L2完成后才能做相似度检索）
    doc_id = upload_document(file_path)
    wait_until_l2_complete(doc_id)

    # 2. 主动查找相似文档
    similar = GET(f"/api/v3/documents/{doc_id}/similar", {
        "min_similarity": 0.85,
        "max_results": 10,
        "include_tags": True
    })

    if similar["total"] > 0:
        # 3. 发现相似文档
        for doc in similar["similar_documents"]:
            if doc["relation_type"] == "version" and doc["similarity"] >= 0.95:
                # 高度相似，可能是版本更新
                choice = ask_user(f"""
                    发现高度相似的文档（相似度{doc['similarity']:.0%}）：
                    📄 {doc['title']}
                    📅 {doc['created_at']}

                    这可能是同一份文档的不同版本，是否归档旧文档？
                """)

                if choice == "是":
                    # 4. 归档旧文档
                    PATCH(f"/api/v3/documents/{doc['doc_id']}", {
                        "status": "archived",
                        "status_reason": f"被{doc_id}替代"
                    })
                    notify_user(f"已归档旧文档：{doc['title']}")

    # 5. 继续完成L3和QA提取
    continue_processing(doc_id)
```

---

### 4.6 场景6：批量文档处理与异常处理

**业务流程**：批量上传 → 并行处理 → 统一处理异常 → 完成

```python
# 外围系统（批量处理脚本）
def batch_upload_and_process(file_list):
    doc_ids = []

    # 步骤1: 批量上传
    for file_path in file_list:
        try:
            doc = POST("/api/v3/documents", files={"file": file_path})
            doc_ids.append(doc["doc_id"])
        except Conflict409:
            # 重复文件，跳过
            print(f"跳过重复文件：{file_path}")
            continue

    # 步骤2: 创建批量处理任务（L1→L2→L3）
    processing = POST("/api/v3/processings", {
        "doc_ids": doc_ids,
        "tasks": ["l1_extract", "l2_vectorize", "l3_knowledge_extract"]
    })
    processing_id = processing["processing_id"]

    # 步骤3: 等待批量处理完成
    wait_for_processing_complete(processing_id)

    # 步骤4: 检查每个文档的状态
    pending_docs = []
    active_docs = []

    for doc_id in doc_ids:
        doc = GET(f"/api/v3/documents/{doc_id}")

        if doc["status"] == "pending_review":
            pending_docs.append(doc_id)
        elif doc["status"] == "active":
            active_docs.append(doc_id)

    # 步骤5: 统一处理pending_review文档
    print(f"✅ 成功处理：{len(active_docs)}个")
    print(f"⚠️ 需要人工处理：{len(pending_docs)}个")

    for doc_id in pending_docs:
        review = GET(f"/api/v3/documents/{doc_id}/review")

        for item in review["review_items"]:
            if item["type"] == "similar_document":
                PATCH(f"/api/v3/documents/{doc_id}", {"status": "active"})
                print(f"已激活相似文档：{doc_id}（review_id={item['review_id']}）")

            elif item["type"] == "low_confidence_category":
                print(f"待确认分类：{doc_id}（review_id={item['review_id']}）")
                # 可以导出Excel让业务人员批量确认

    # 步骤6: 批量触发QA提取（仅对active文档）
    if active_docs:
        qa_processing = POST("/api/v3/qa/extract", {
            "doc_ids": active_docs
        })
        wait_for_processing_complete(qa_processing["processing_id"])
        print(f"✅ QA提取完成：{len(active_docs)}个文档")

    return {
        "total": len(doc_ids),
        "active": len(active_docs),
        "pending": len(pending_docs)
    }
```

---

## 五、附录

### 5.1 文档状态机

```
[上传] → draft → [L3完成且分类确认] → active
                        ↓
                  [异常检测] → pending_review
                                    ↓
              [用户决策] → active/archived/deprecated
```

**状态说明**：

| 状态 | 说明 | 可检索 | 触发条件 |
|-----|------|--------|---------|
| `draft` | 草稿，L1/L2/L3处理中 | ❌ | 文档上传 |
| `active` | 有效，可正常检索 | ✅ | L3完成且分类确认 |
| `pending_review` | 待审核，发现异常 | ❌ | 相似文档/低置信度分类 |
| `archived` | 归档，被新版本替代 | ❌ | 用户决策 |
| `deprecated` | 废弃，内容过时 | ❌ | 手动标记 |

### 5.2 异常检测机制

| 检测类型 | 时机 | 检测方法 | 阈值 |
|---------|------|---------|------|
| 文件去重 | 上传时 | file_hash | 完全相同 |
| 相似文档 | L2完成后 | 向量相似度 | ≥0.85 |
| 分类置信度 | L3完成后 | LLM置信度 | <0.7 |

### 5.3 相似度关系类型

| 关系类型 | 相似度范围 | 说明 | 示例 |
|---------|----------|------|------|
| version | ≥0.95 | 版本更新，内容几乎相同 | 2024版→2025版 |
| variant | 0.85-0.95 | 变体，结构相似但主体不同 | 北京政策vs上海政策 |
| similar | 0.70-0.85 | 一般相似，主题相关 | 产假政策vs陪产假政策 |

### 5.4 核心设计原则

| 原则 | 说明 |
|-----|------|
| **职责边界清晰** | 知识库暴露状态，外围系统负责决策 |
| **以L2为基础完成点** | L0→L1→L2为基础加工，L3/QA为增值加工 |
| **状态语义化** | status表达"能不能用"，processing_jobs表达"处理进度" |
| **分类与标签分离** | 核心分类必填决定文档状态，内容标签可选不阻塞 |
| **pending_review隔离** | pending_review文档不参与检索，避免混淆 |
| **异常早发现** | 上传阶段完成所有检测，L2完成后检测相似度 |

---

## 六、从v3.0迁移指南

### 6.1 API变更清单

| 变更类型 | API端点 | 说明 |
|---------|--------|------|
| **新增** | `GET /documents/{doc_id}/review` | 查询pending_review详情 |
| **新增** | `PATCH /documents/{doc_id}/category` | 更新文档分类 |
| **新增** | `PATCH /documents/{doc_id}/metadata` | 更新文档元数据 |
| **调整** | `POST /documents` | 增加409冲突响应 |
| **调整** | `GET /documents/{doc_id}` | 增加status/status_reason/category字段 |
| **调整** | `PATCH /documents/{doc_id}` | 改为状态更新的原子操作 |
| **调整** | `GET /documents/{doc_id}/similar` | 增加relation_type字段 |

### 6.2 数据模型变更

| 变更 | 说明 |
|-----|------|
| **新表** | `document_category` - 核心分类（公司主体、业务领域） |
| **新表** | `version_relations` - 文档关系（version/variant/similar） |
| **新字段** | `document_content.status` - 状态机字段 |
| **新字段** | `document_content.status_reason` - 状态原因 |
| **字段分离** | 分类（category）与标签（tags）分离 |

### 6.3 行为变更

| 场景 | v3.0 | v3.1 |
|-----|------|------|
| 重复文件上传 | 创建新doc_id | 返回409 Conflict |
| 相似文档处理 | 无检测 | 自动检测并进入pending_review |
| 分类置信度低 | 直接激活 | 进入pending_review等待确认 |
| 文档检索 | 包含所有文档 | 排除pending_review文档 |
| 处理进度 | 存储在document_content | 从processing_jobs实时派生 |

---

**文档版本**: v3.1.0
**最后更新**: 2025-12-03
**维护者**: TaxKB开发团队

**更新日志**:
- v3.1.0 (2025-12-03): 引入文档生命周期管理，新增去重检测、相似度检测、分类确认机制
- v3.0.0 (2025-12-01): 初始版本
