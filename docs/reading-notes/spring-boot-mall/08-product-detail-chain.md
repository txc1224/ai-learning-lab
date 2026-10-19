# 第 8 篇：一个商品详情接口背后的完整链路：HTTP、Redis、MySQL 与 JSON

> 原文：[一个商品详情接口背后的完整链路：HTTP、Redis、MySQL 与 JSON](https://juejin.cn/post/7666373286323306538)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

把公开接口 `GET /api/products/{id}` 从请求进来到 JSON 返回的完整链路拆开：请求如何进入 Controller、为什么允许匿名访问、缓存命中/未命中/空值/Redis 故障分别怎么处理、MySQL 怎么查、DTO 怎么组装、业务异常怎么变成统一 JSON。目标是建立"链路感"——拿到接口路径能定位各层代码，并按层排查 404/500/旧数据问题。

## 关键要点

### 完整链路（15 步的核心骨架）

```
TraceIdFilter（生成/透传 X-Trace-Id）
→ Spring Security（白名单 permitAll）
→ Controller（参数绑定 @PathVariable）
→ Facade（先查 Redis：HIT 直接返回）
→ MISS/DEGRADED/BYPASS 回源 MySQL（强制 ON_SALE + 分类启用）
→ 组装 DTO（Entity + 分类表 → ProductDetailResponse）
→ 回填缓存 / 空值缓存
→ ApiResponse 信封包装（GlobalExceptionHandler 处理异常）
```

### 关键代码

```java
// Controller 只做三件事：接参数、调 Facade、包装响应
@GetMapping("/{id}")
public ApiResponse<ProductDetailResponse> detail(@PathVariable Long id, HttpServletRequest req) {
    return ApiResponse.success(productFacade.getPublishedProduct(id), TraceIdContext.get(req));
}

// 公开可见性由服务端强制：WHERE id = ? AND status_code = 'ON_SALE' LIMIT 1
.eq(ProductEntity::getId, productId)
.eq(ProductEntity::getStatusCode, ProductStatus.ON_SALE.name())
```

- 缓存分支：HIT 直接返回；NULL_HIT 抛 `BusinessException(apiCode, ..., 404)`；MISS/DEGRADED/BYPASS 查库后 `put` 回填；catch 中只对 PRODUCT_NOT_FOUND/CATEGORY_NOT_FOUND 调 `putNull` 再重抛。
- 缓存 key：`mall:product:detail:v1:{id}`，空值标记 `__NULL__:PRODUCT_NOT_FOUND`；正常 TTL 10 分钟、空值短 TTL，坏缓存自动删除。
- DTO 组装：`categoryName` 来自分类表（`categoryDbService.requireEnabledCategory`），`statusCode` 用 `ProductStatus.valueOf(...)` 转枚举——Entity ≠ DTO。
- 统一异常：`@ExceptionHandler(BusinessException.class)` 把业务 code + httpStatus 转成统一错误 JSON；成功响应信封含 `code/message/data/traceId/timestamp`。

### 核心结论

- 接口是一条链路，Controller 只是 HTTP 入口；权限边界、可见性、缓存策略都在链路的其他层。
- 匿名可访问 ≠ 可见所有商品：草稿（DRAFT）和下架（OFF_SHELF）商品对公开接口一律 404，商品 ON_SALE 但分类停用也 404。
- 业务 code 与 HTTP 状态码对应但不是一回事；前端逻辑应依赖稳定 code 而非 message。
- traceId 同时出现在请求头、响应头、响应体和日志里，是前后端共同排查编号，不能丢。
- 列表接口未加缓存（key 复杂），且用批量查分类 Map 避免 N+1。

### 易错点（节选）

1. 以为详情接口返回任何状态商品——实际只返回 ON_SALE。
2. 把 Redis MISS 当商品不存在——MISS 只是回源信号。
3. Redis 故障直接 500——应 DEGRADED 降级回源，Redis 是性能层非硬依赖。
4. 改商品后忘删缓存——用户看到旧数据。
5. Controller 堆业务逻辑——只该接参数、调 Facade、包装响应。
6. `/api/products/abc`（参数绑定失败）与 `/api/products/999999`（业务 404）是不同位置的错误，排查要区分。
7. 直接返回 Entity 泄露表结构；DTO 才是接口契约。
8. 调试方法论：按"入口 → 权限 → code/traceId → 缓存 → 数据库 → DTO → 日志"逐层取证，不凭感觉跳步。

## 与 ai-learning-lab 课程的对应

| 本篇概念 | 课程对应 |
| --- | --- |
| HTTP 路由、请求响应契约、统一信封 | `lessons/00-roadmap` |
| 异步流程与错误处理（BusinessException → 统一 JSON） | `lessons/01-typescript-node` |
| 数据库查询与关联组装（防 N+1） | `lessons/03-postgres-persistence` |
| 缓存五种状态、降级与可观测（traceId/日志） | `lessons/08-production`、`lessons/16-production-deployment` |
| traceId 贯穿日志的排查方式 | `lessons/08-production` |

- 仓库中 `apps/api/src/server.ts`（路由入口与中间件编排）对应本篇的 Controller + Filter 链；`apps/api/src/conversation-repository.ts` 对应 DbService 层。
- `apps/api/src/production/production.ts` 的生产化防护与"DEGRADED 降级 + 日志证据"是同一套方法论。

## 行动清单

- [ ] 选 `apps/api/src/server.ts` 里一个真实接口，画出它的完整链路图（入口 → 鉴权 → 业务层 → 存储 → 响应包装），对照本篇 15 步骨架查漏。
- [ ] 在 `lessons/08-production` 练习中给一个接口接入 traceId：生成/透传 `X-Trace-Id`，并保证它同时出现在响应头、响应体和日志行里。
- [ ] 复现两类 404 并区分：路径参数类型错误（绑定失败）与业务资源不存在（稳定 code），验证各自的错误响应结构。
- [ ] 审查 `apps/api/src/conversation-repository.ts` 的列表查询是否存在循环内逐条查关联数据，改为批量 `IN` 查询 + Map 组装。
