# 增强 Aura Grounding Context 实现计划

## Context (背景)

Aura 是一个"现实浏览器" PWA,使用 Gemini AI 在相机画面上叠加智能信息。当前系统使用 Google Search Grounding 来增强 AI 分析结果,但传递给 Grounding 的上下文信息非常有限(仅有简单的查询字符串如 "Starbucks Reserve Coffee Shop")。

**问题**: 缺少位置、时间等上下文导致 Grounding 结果不够精准和本地化。比如:
- 无法判断"现在"是否营业(没有时区信息)
- 搜索结果不够本地化(没有城市/国家信息)
- 无法提供本地化价格(没有地理位置)

**目标**: 增强 Grounding Prompt,加入更多可用的上下文信息(地址、时间、语言等),让 AI 返回更精准、更本地化的结果。

## 实现方案概述

### 核心改进

创建一个结构化的 `GroundingContext` 对象,包含:
- **用户上下文**: 本地时间、时区、语言偏好 (浏览器 API 获取,即时可用)
- **位置上下文**: GPS 坐标 + 反向地理编码的地址 (Google Geocoding API,带缓存)
- **视觉上下文**: AI 识别的标题、副标题、置信度

### 数据流增强

**原有流程**:
```
相机画面 → Gemini 视觉分析 → "商家名称" 字符串 → Grounding → 结果
```

**增强后流程**:
```
相机画面 → Gemini 视觉分析
                ↓
         获取用户上下文 (时区、语言)
                ↓
       反向地理编码 GPS → 地址 (有缓存)
                ↓
       组装 GroundingContext 对象
                ↓
       增强的 Grounding Prompt
       "For Starbucks Reserve, in San Francisco CA,
        as of Fri Mar 7 3:45 PM PST, provide: ..."
                ↓
       更精准的 Grounding 结果
```

## 关键文件

### 需要创建的新文件

1. **`lib/user-context.ts`** - 获取浏览器用户上下文
   - 功能: 提取时区、语言、本地时间
   - 依赖: 浏览器 API (无需异步调用)

2. **`lib/geocoding.ts`** - GPS 反向地理编码
   - 功能: GPS 坐标 → 地址 (城市、国家)
   - 依赖: Google Geocoding API
   - 缓存: 60秒 TTL + 100米距离阈值

3. **`types/grounding.ts`** - 新的类型定义
   - `GroundingContext` 接口
   - `UserContext`, `LocationContext` 接口

### 需要修改的现有文件

4. **`lib/gemini.ts`** - 更新 Grounding 函数
   - 修改 `enrichWithGrounding()` 签名: `(query, mode)` → `(context, mode)`
   - 增强 `GROUNDING_PROMPTS` 模板,动态插入上下文信息

5. **`modes/building/enrichment.ts`** - Building 模式增强
   - 在调用 Grounding 前收集上下文
   - 组装 `GroundingContext` 对象

6. **`modes/product/enrichment.ts`** - Product 模式增强
   - 类似 Building 模式,但可选使用 GPS

## 实现步骤 (由底层到高层)

### Step 1: 创建用户上下文工具 (10 分钟)

**文件**: `lib/user-context.ts`

```typescript
export interface UserContext {
  localTime: string;
  timezone: string;
  language: string;
}

export function getUserContext(): UserContext {
  return {
    localTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || 'en-US',
  };
}

export function formatLocalTime(timezone: string): string {
  return new Date().toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
```

**特点**:
- 纯前端,无 API 调用,即时返回
- 有默认值降级

### Step 2: 创建类型定义 (5 分钟)

**文件**: `types/grounding.ts`

```typescript
export interface UserContext {
  localTime: string;
  timezone: string;
  language: string;
}

export interface LocationContext {
  coordinates: { lat: number; lng: number };
  address?: {
    formatted: string;
    city?: string;
    country?: string;
  };
}

export interface GroundingContext {
  query: string;
  mode: 'building' | 'product';
  visualContext?: {
    title: string;
    subtitle: string;
    confidence: number;
  };
  location?: LocationContext;
  user: UserContext;
}
```

### Step 3: 创建反向地理编码工具 (30 分钟)

**文件**: `lib/geocoding.ts`

**核心功能**:
- 调用 Google Geocoding API (GPS → 地址)
- 智能缓存: 60秒 TTL + 100米距离阈值
- 错误时返回 `null` (降级处理)

**缓存策略**:
```typescript
interface CacheEntry {
  coordinates: { lat: number; lng: number };
  result: ReverseGeocodeResult;
  timestamp: number;
}

const CACHE_DURATION_MS = 60_000;  // 匹配 GPS 缓存
const CACHE_DISTANCE_THRESHOLD_M = 100;  // 移动超过 100米 失效

// 使用 Haversine 公式计算距离
function haversineDistance(lat1, lng1, lat2, lng2): number {
  // ... 实现
}

// 检查缓存:时间有效 AND 距离有效
if (cachedGeocode) {
  const timeFresh = Date.now() - cachedGeocode.timestamp < CACHE_DURATION_MS;
  const distanceFresh = haversineDistance(...) < CACHE_DISTANCE_THRESHOLD_M;
  if (timeFresh && distanceFresh) {
    return cachedGeocode.result;  // 缓存命中
  }
}
```

**API 成本控制**:
- 免费额度: 40,000 请求/月
- 预计使用: 最多 1次/分钟 = ~43,200/月
- 结论: 在免费额度内

### Step 4: 更新 Grounding 函数 (20 分钟)

**文件**: `lib/gemini.ts`

**修改 1**: 更新函数签名
```typescript
// 旧版
export async function enrichWithGrounding(
  query: string,
  mode: 'building' | 'product'
): Promise<GroundedResult>

// 新版
export async function enrichWithGrounding(
  context: GroundingContext
): Promise<GroundedResult>
```

**修改 2**: 增强 Prompt 模板
```typescript
const GROUNDING_PROMPTS = {
  building: (ctx: GroundingContext) => {
    const parts = [
      `You are a local business expert.`,
      `For the business/building "${ctx.query}",`
    ];

    // 动态添加位置信息
    if (ctx.location?.address?.city) {
      parts.push(`located in ${ctx.location.address.city}, ${ctx.location.address.country},`);
    } else if (ctx.location) {
      parts.push(`at coordinates (${ctx.location.coordinates.lat}, ${ctx.location.coordinates.lng}),`);
    }

    // 添加时间上下文
    parts.push(`as of ${formatLocalTime(ctx.user.timezone)},`);

    // 任务描述
    parts.push(
      `provide: current reviews, opening hours, busy times, neighborhood vibe, recent news.`,
      `Be concise and localized for ${ctx.user.language}.`
    );

    return parts.join(' ');
  },

  product: (ctx: GroundingContext) => {
    // 类似逻辑,强调价格本地化和可持续性
  }
};
```

**关键**: Prompt 会根据可用数据自适应:
- 最佳: 包含城市名
- 降级: 使用 GPS 坐标
- 最低: 不包含位置 (仍可工作)

### Step 5: 更新 Building 模式 (20 分钟)

**文件**: `modes/building/enrichment.ts`

**修改位置**: 在 `enrichBuildingData()` 函数中,`analyzeFrame` 之后、`enrichWithGrounding` 之前

```typescript
export async function enrichBuildingData(
  frameBase64: string,
  lat: number | null,
  lng: number | null,
): Promise<EnrichmentResult> {
  // Step 1: 视觉分析 (已有)
  const overlayData = await analyzeFrame(frameBase64, 'building');

  if (overlayData.confidence < CONFIDENCE_THRESHOLD) {
    return NO_BUILDING_FALLBACK;
  }

  // ===== 新增代码开始 =====

  // 组装查询
  const query = `${overlayData.title} ${overlayData.subtitle}`.trim();

  // 获取用户上下文 (即时)
  const userContext = getUserContext();

  // 获取位置上下文 (异步,有缓存)
  let locationContext: LocationContext | undefined;
  if (lat !== null && lng !== null) {
    const address = await reverseGeocode(lat, lng);
    locationContext = {
      coordinates: { lat, lng },
      address: address || undefined,  // null 时降级
    };
  }

  // 组装 Grounding Context
  const groundingContext: GroundingContext = {
    query,
    mode: 'building',
    visualContext: {
      title: overlayData.title,
      subtitle: overlayData.subtitle,
      confidence: overlayData.confidence,
    },
    location: locationContext,
    user: userContext,
  };

  // 调用增强的 Grounding
  const grounded = await enrichWithGrounding(groundingContext);

  // ===== 新增代码结束 =====

  // Step 3-5: Places API、Voice Summary (不变)
  // ...
}
```

### Step 6: 更新 Product 模式 (15 分钟)

**文件**: `modes/product/enrichment.ts`

**简化版本**: Product 不需要反向地理编码 (节省成本),只用国家级别定位

```typescript
export async function enrichProductData(
  frameBase64: string,
  lat?: number | null,
  lng?: number | null
): Promise<ProductData> {
  const overlayData = await analyzeFrame(frameBase64, 'product');

  const query = `${product.title} price sustainability alternatives`;
  const userContext = getUserContext();

  // 可选: 只用坐标,不调用 geocoding
  let locationContext: LocationContext | undefined;
  if (lat && lng) {
    locationContext = {
      coordinates: { lat, lng },
      // 不调用 reverseGeocode,节省 API 成本
    };
  }

  const groundingContext: GroundingContext = {
    query,
    mode: 'product',
    location: locationContext,
    user: userContext,
  };

  const grounded = await enrichWithGrounding(groundingContext);

  // 合并结果 (不变)
  // ...
}
```

### Step 7 (可选): 传递 GPS 给 Product (5 分钟)

**文件**: `app/page.tsx`

```typescript
// 第 65 行,原代码:
result = await enrichProductData(frame);

// 改为:
result = await enrichProductData(frame, lat, lng);
```

这样 Product 模式也能获得国家级别的价格本地化。

## 降级策略

每一层都有优雅降级:

```
反向地理编码失败 → 使用 GPS 坐标字符串
        ↓
   GPS 不可用 → 不包含位置上下文
        ↓
getUserContext 失败 → 使用默认值 (UTC, en-US)
        ↓
  Grounding API 失败 → 返回空结果 (现有行为)
```

**关键**: 任何一层失败都不影响整体功能,只是结果精度下降。

## 验证方法

### 单元测试

1. **用户上下文**
   - 浏览器控制台: `getUserContext()`
   - 验证时区正确
   - 验证语言正确

2. **反向地理编码**
   - 测试坐标: `40.6892, -74.0445` (自由女神像)
   - 期望结果: "New York, NY"
   - 验证缓存: 第二次调用应该即时返回
   - 验证距离失效: 移动 150米后应该触发新调用

3. **Prompt 生成**
   - 打印带位置和不带位置的 prompt
   - 验证格式正确
   - 检查降级逻辑

### 集成测试

1. **Building 模式**
   - 对准 Starbucks,开启 GPS → 验证 prompt 包含城市名
   - 关闭 GPS → 验证仍正常工作
   - 检查 grounding sources 是否更本地化

2. **Product 模式**
   - 对准商品,开启 GPS → 检查是否有国家信息
   - 关闭 GPS → 验证仍正常工作

3. **缓存验证**
   - 60秒内扫描两次 → Network 标签应该没有 geocoding 调用
   - 移动 150米后扫描 → 应该触发新调用
   - 等待 65秒后扫描 → 应该触发新调用

### 验证清单

- [ ] Prompt 包含时区信息
- [ ] Prompt 包含城市/国家 (geocoding 成功时)
- [ ] GPS 不可用时 prompt 优雅降级
- [ ] 用户语言出现在 prompt 中
- [ ] Geocoding 缓存有效减少 API 调用
- [ ] 距离失效逻辑正常工作
- [ ] Product 模式在有/无 GPS 时都正常
- [ ] Building 模式 Places API 仍然正确
- [ ] 没有 UI 破坏性改动
- [ ] Grounding 结果更本地化 (人工验证)

## 性能影响

**当前耗时**:
```
视觉分析 (1-3秒)
    ↓
Grounding (2-4秒)
    ↓
Places API (1-2秒)
─────────────
总计: 4-9秒
```

**增强后耗时**:
```
视觉分析 (1-3秒)
    ↓
getUserContext (0毫秒) + reverseGeocode (首次 200-800ms, 缓存命中 0ms)
    ↓
Grounding (2-4秒)
    ↓
Places API (1-2秒)
─────────────
总计: 首次 4-10秒 (最差 +1秒), 后续 4-9秒 (无影响)
```

**结论**: 缓存使性能影响最小化,首次扫描略慢,后续扫描无影响。

## 复用现有模式

- **缓存机制**: 复用 `useLocation()` 的 60秒 TTL 模式
- **错误处理**: 遵循现有的"静默失败,返回降级结果"模式
- **API 调用**: 遵循 `lib/places.ts` 的 REST API 模式
- **类型安全**: 扩展现有的 `types/` 架构

## 预计工作量

| 步骤 | 文件 | 时间 |
|------|------|------|
| 1 | `lib/user-context.ts` | 10分钟 |
| 2 | `types/grounding.ts` | 5分钟 |
| 3 | `lib/geocoding.ts` | 30分钟 |
| 4 | `lib/gemini.ts` | 20分钟 |
| 5 | `modes/building/enrichment.ts` | 20分钟 |
| 6 | `modes/product/enrichment.ts` | 15分钟 |
| 7 | `app/page.tsx` (可选) | 5分钟 |
| **总计** | | **~2小时** |

## 风险评估

**低风险**:
- 所有改动都是增量式的
- 内置优雅降级
- 不影响现有功能

**无破坏性改动**:
- 如果新功能失败,现有流程完全正常
- UI 无改动
- Places API 集成不变

**易于回滚**:
- 10分钟可以回滚到旧版本
- 只需恢复 3 个文件的旧签名

**成本可控**:
- Geocoding API 在免费额度内
- 缓存大幅减少 API 调用

---

*实施建议*: 按顺序逐步实现,每一步完成后测试,确保稳定后再进行下一步。
