# Mock Data Directory

此目录包含开发和测试环境使用的模拟数据。

## 注意事项

1. **仅用于开发/测试**：生产环境不应依赖这些数据
2. **数据隔离**：Mock数据与业务代码完全分离
3. **可维护性**：统一管理测试数据，便于更新和维护

## 文件说明

- `customer-profiles.json` - 客户画像完整数据（JSON格式，便于编辑）
- `MockDataProvider.js` - Mock数据提供者，统一访问接口
-` index.js` - 导出所有Mock数据

## 使用方式

```javascript
import { MockDataProvider } from './mock-data/MockDataProvider.js';

const mockProvider = new MockDataProvider();
const profile = mockProvider.getProfile('conv-001');
```
