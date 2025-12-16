# 事件驱动架构文档

## 概述

本系统采用事件驱动架构（Event-Driven Architecture, EDA），通过领域事件实现松耦合的跨聚合通信。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       表现层 (UI)                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Conversation│  │   Customer   │  │  Requirement    │   │
│  │ Controller  │  │ Controller   │  │  Controller     │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      应用服务层                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │Conversation │  │  Customer    │  │  Requirement    │   │
│  │   Service   │  │   Service    │  │    Service      │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                 │                   │             │
│         └────────┬────────┴───────────────────┘             │
│                  │ 发布事件                                 │
└──────────────────┼──────────────────────────────────────────┘
                   ▼
          ┌────────────────┐
          │    EventBus    │ ← 单例，全局事件总线
          └────────┬───────┘
                   │ 分发事件
          ┌────────┴───────┐
          │                │
          ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│ Event Handler 1  │  │ Event Handler 2  │
│ (订阅者)         │  │ (订阅者)         │
└──────────────────┘  └──────────────────┘
```

## 事件处理器列表

### 1. MessageSentEventHandler
**触发条件**：客户发送消息后
**处理逻辑**：
- 使用RequirementDetectorService检测需求关键词
- 如果置信度≥0.7，自动创建需求卡片
- 映射置信度到优先级（高/中/低）

**事件流**：
```
MessageSent → 需求检测 → [置信度≥0.7] → RequirementCreated → UI刷新
```

### 2. ConversationClosedEventHandler
**触发条件**：对话关闭后
**处理逻辑**：
- 为客户添加互动记录
- 判断对话结果（已解决/已升级/进行中）
- 如果SLA违规，标记需要质检

**事件流**：
```
ConversationClosed → 添加互动记录 → ProfileRefreshed → UI刷新
                  └→ [SLA违规] → 创建质检任务
```

### 3. SLAViolatedEventHandler
**触发条件**：对话响应时间超过SLA阈值
**处理逻辑**：
- 发送浏览器通知
- 控制台显示警报
- 更新客户风险洞察
- 触发ProfileRefreshed事件

**事件流**：
```
SLAViolated → 发送通知 + 更新客户画像 → RiskLevelChanged → 风险警报
```

### 4. ProfileRefreshedEventHandler
**触发条件**：客户画像刷新后
**处理逻辑**：
- 发送自定义DOM事件`customer-profile-updated`
- UI监听该事件并刷新显示
- 显示更新字段列表

**UI监听示例**：
```javascript
document.addEventListener('customer-profile-updated', (e) => {
  const { customerId, updatedFields } = e.detail;
  refreshProfileUI(customerId);
});
```

### 5. RiskLevelChangedEventHandler
**触发条件**：客户风险等级变化
**处理逻辑**：
- 判断是否升级风险（isEscalated）
- 发送风险警报（控制台 + 浏览器通知）
- 更新UI风险指示器
- 高风险客户自动采取措施（标记VIP、创建任务）

**事件流**：
```
RiskLevelChanged → [isEscalated] → 发送警报
                → [isCritical] → 自动标记VIP + 创建跟进任务
                → 更新UI
```

### 6. RequirementCreatedEventHandler
**触发条件**：需求创建后
**处理逻辑**：
- 发送自定义DOM事件`requirement-created`
- 如果是AI检测的需求，显示置信度通知
- 高优先级需求发送浏览器通知

**事件流**：
```
RequirementCreated → 刷新需求列表UI
                  → [source=auto-detected] → 显示AI检测通知
                  → [priority=high] → 发送高优先级警报
```

## 典型事件流场景

### 场景1：客户咨询 → 自动检测需求

```
┌─────────┐   发送消息   ┌──────────────┐
│  客户   │ ──────────→ │ Conversation │
└─────────┘              │   Service    │
                         └──────┬───────┘
                                │ MessageSent
                                ▼
                    ┌───────────────────────┐
                    │ MessageSentEventHandler│
                    │ - 检测需求关键词       │
                    │ - 置信度0.85          │
                    └──────┬────────────────┘
                           │ CreateRequirement
                           ▼
                  ┌─────────────────┐
                  │ Requirement     │
                  │   Service       │
                  └────────┬────────┘
                           │ RequirementCreated
                           ▼
              ┌────────────────────────────┐
              │RequirementCreatedEventHandler│
              │ - 刷新需求列表              │
              │ - 显示AI检测通知            │
              └────────────────────────────┘
```

### 场景2：对话关闭 → 更新客户画像

```
┌─────────┐   关闭对话   ┌──────────────┐
│ 客服    │ ──────────→ │ Conversation │
└─────────┘              │   Service    │
                         └──────┬───────┘
                                │ ConversationClosed
                                ▼
                ┌────────────────────────────┐
                │ConversationClosedEventHandler│
                │ - 添加互动记录              │
                └──────┬─────────────────────┘
                       │ AddInteraction
                       ▼
              ┌─────────────────┐
              │ Customer        │
              │   Service       │
              └────────┬────────┘
                       │ InteractionAdded
                       ▼
                    [UI刷新]
```

### 场景3：SLA违规 → 风险升级 → 警报

```
┌─────────┐   超时检测   ┌──────────────┐
│ SLA监控 │ ──────────→ │ Conversation │
└─────────┘              │   Service    │
                         └──────┬───────┘
                                │ SLAViolated
                                ▼
                  ┌─────────────────────────┐
                  │ SLAViolatedEventHandler │
                  │ - 发送通知              │
                  │ - 更新客户画像          │
                  └──────┬──────────────────┘
                         │ RefreshProfile
                         ▼
                ┌─────────────────┐
                │ Customer        │
                │   Service       │
                └────────┬────────┘
                         │ RiskLevelChanged
                         ▼
            ┌────────────────────────────┐
            │RiskLevelChangedEventHandler │
            │ - 风险升级警报              │
            │ - 自动标记VIP               │
            └────────────────────────────┘
```

## 事件订阅管理

### EventSubscriptionManager

集中管理所有事件订阅关系：

```javascript
class EventSubscriptionManager {
  initialize() {
    // Conversation事件 (3个)
    this.eventBus.subscribe('MessageSent', handler);
    this.eventBus.subscribe('ConversationClosed', handler);
    this.eventBus.subscribe('SLAViolated', handler);

    // Customer事件 (6个)
    this.eventBus.subscribe('ProfileRefreshed', handler);
    this.eventBus.subscribe('RiskLevelChanged', handler);
    this.eventBus.subscribe('ServiceRecordAdded', handler);
    this.eventBus.subscribe('CommitmentProgressUpdated', handler);
    this.eventBus.subscribe('InteractionAdded', handler);
    this.eventBus.subscribe('CustomerMarkedAsVIP', handler);

    // Requirement事件 (2个)
    this.eventBus.subscribe('RequirementCreated', handler);
    this.eventBus.subscribe('RequirementStatusChanged', handler);
  }
}
```

### 初始化顺序

在`main.js`中的初始化顺序至关重要：

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // 1️⃣ 初始化DI容器（创建服务实例）
  await initializeContainer();

  // 2️⃣ 初始化事件订阅（注册事件处理器）
  const eventSubscriptionManager = new EventSubscriptionManager();
  eventSubscriptionManager.initialize();

  // 3️⃣ 初始化UI组件（渲染界面）
  initChat();
  initCustomerProfile();
  initRequirementsTab();
  // ...
});
```

## 事件总线实现

### EventBus特性

- **单例模式**：全局唯一实例
- **异步发布**：支持Promise处理器
- **错误隔离**：单个处理器失败不影响其他
- **订阅管理**：支持取消订阅

### 使用示例

```javascript
// 发布事件
const event = new MessageSentEvent({ ... });
await eventBus.publish(event);

// 订阅事件
eventBus.subscribe('MessageSent', async (event) => {
  await handleMessageSent(event);
});
```

## 扩展指南

### 添加新的事件处理器

1. 创建处理器类：
```javascript
// assets/js/application/eventHandlers/xxx/NewEventHandler.js
export class NewEventHandler {
  async handle(event) {
    // 处理逻辑
  }
}
```

2. 注册到EventSubscriptionManager：
```javascript
// EventSubscriptionManager.js
import { NewEventHandler } from './xxx/NewEventHandler.js';

initialize() {
  this.handlers.set('newEvent', new NewEventHandler());
  this.eventBus.subscribe('NewEvent', async (event) => {
    await this.handlers.get('newEvent').handle(event);
  });
}
```

### 最佳实践

1. **事件处理器职责单一**：一个处理器只处理一种事件
2. **异步处理**：所有处理器方法使用async/await
3. **错误捕获**：处理器内部捕获异常，避免影响事件总线
4. **日志记录**：记录事件ID和处理过程，便于调试
5. **UI解耦**：通过自定义DOM事件更新UI，而非直接操作DOM

## 性能监控

### 事件处理时间跟踪

```javascript
async handle(event) {
  const startTime = performance.now();
  try {
    // 处理逻辑
  } finally {
    const duration = performance.now() - startTime;
    console.log(`[Handler] 处理耗时: ${duration.toFixed(2)}ms`);
  }
}
```

### 事件队列监控

EventBus可扩展添加事件队列监控：
- 待处理事件数量
- 平均处理时间
- 失败率统计

## 测试策略

### 单元测试

测试单个事件处理器：
```javascript
it('应该检测需求', async () => {
  const handler = new MessageSentEventHandler();
  const event = { ... };
  await handler.handle(event);
  expect(requirementService.createRequirement).toHaveBeenCalled();
});
```

### 集成测试

测试事件流：
```javascript
it('消息发送应触发需求创建', async () => {
  await conversationService.sendMessage(command);
  // 等待事件处理
  await waitForEvent('RequirementCreated');
  expect(需求已创建).toBe(true);
});
```

## 总结

事件驱动架构带来的优势：
- ✅ **松耦合**：聚合根之间通过事件通信，无直接依赖
- ✅ **可扩展**：新增事件处理器无需修改现有代码
- ✅ **可维护**：职责清晰，易于理解和维护
- ✅ **可测试**：可独立测试事件处理器
- ✅ **可观测**：事件日志记录完整流程

当前实现的事件流：
- 3个Conversation事件流
- 6个Customer事件流
- 2个Requirement事件流
- **共11个事件订阅，6个活跃处理器**
