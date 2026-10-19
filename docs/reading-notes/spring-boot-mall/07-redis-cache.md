# 第 7 篇：为什么后端也要缓存？从前端缓存思维理解 Redis

> 原文：[为什么后端也要缓存？从前端缓存思维理解 Redis](https://juejin.cn/post/7666453566625873947)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端同学熟悉 localStorage、内存缓存和状态管理，但 Redis 不是"服务端版 localStorage"：它是独立进程、跨请求/用户/实例共享，缓存错了影响所有用户。这篇文章讲清后端为什么需要缓存，以及 key、TTL、命中/空值/降级、Cache Aside 该怎么设计。

## 关键要点

### 心智模型

- MySQL 是真实数据源（强一致、持久化）；Redis 是性能层（可短暂旧值、可丢失、必须能重建）。
- 命中快速返回，未命中回源 MySQL；写库成功后删缓存；Redis 故障时核心接口 fail-open 降级查库——性能层故障不应放大为业务故障。
- 前端缓存只影响当前用户，后端缓存影响所有用户，必须克制设计。

### key 与 TTL

- key 规范：`mall:product:detail:v1:{id}` = 系统:模块:对象:版本:业务ID；共享服务不能用 `product:1` 这种随意命名。
- value 存 JSON；TTL 必须设置：正常详情 10m，空值 30s。不设 TTL = 永久占内存 + 长期展示旧数据。

### 五种缓存状态

| 状态 | 含义 | 行为 |
| --- | --- | --- |
| HIT | 命中 | 直接返回 |
| MISS | 未命中 | 回源 MySQL 后回填 |
| NULL_HIT | 空值命中 | 恢复 404（不查库） |
| DEGRADED | Redis 异常 | 记日志，降级查 MySQL |
| BYPASS | 配置关闭 | 直查 MySQL |

空值缓存：对稳定 404 写 `__NULL__:XXX` 标记，缓解**缓存穿透**（缓存和库里都没有的数据被反复打穿到 DB）。用 TS 判别联合类比：

```ts
type CacheLookup =
  | { status: 'HIT'; response: ProductDetail }
  | { status: 'NULL_HIT'; code: 'PRODUCT_NOT_FOUND' | 'CATEGORY_NOT_FOUND' }
  | { status: 'MISS' } | { status: 'DEGRADED' } | { status: 'BYPASS' }
```

不要用 null 表达所有状态——用对象 + 枚举才能区分 MISS/异常/空值/关闭。

### Cache Aside 与代码分层

- 读：先查缓存 → MISS 查库 → 应用层写回（`setEx` 强制带 TTL）。
- 写：先更新数据库，成功后 `evict` 删缓存；删除失败不回滚数据库（TTL 兜底）。顺序不能反——先删缓存再写库，写库失败会把旧数据写回。
- 分层：`RedisOperatorClient` 封装 get/setEx/delete，业务层不直接碰 StringRedisTemplate，便于统一日志/监控/异常处理；`@ConfigurationProperties` 绑定 `enabled/valueTtl/nullTtl`。

```yaml
mall:
  cache:
    product-detail:
      enabled: ${MALL_PRODUCT_CACHE_ENABLED:true}
      value-ttl: ${MALL_PRODUCT_CACHE_VALUE_TTL:10m}
      null-ttl: ${MALL_PRODUCT_CACHE_NULL_TTL:30s}
```

### 三个经典问题（进阶初解）

- 穿透：查不存在的数据反复打 DB → 空值缓存。
- 击穿：热点 key 过期瞬间大量并发同时回源。
- 雪崩：大量 key 同时过期或 Redis 整体挂 → 降级 DEGRADED、错开 TTL、生产加随机抖动。

### 易错点（节选）

1. 把 Redis 当真实数据源——MISS/DEGRADED/BYPASS 都必须回源 MySQL。
2. 写库后忘删缓存——用户继续看到旧数据。
3. 先删缓存再写库——顺序反了。
4. Redis 异常直接让接口失败——应降级而非 500。
5. 空值缓存设太长——新数据可能被误判不存在（本项目 30s + 创建后 evict）。
6. 生产用 `keys` 扫描会阻塞 Redis，应改用 `scan`。
7. 清 localStorage 清不掉后端缓存——Redis 只能由后端删。
8. 订单金额、库存、支付状态等强一致数据不能搬进缓存做判断。
9. 排障靠日志证据（event=HIT/MISS/PUT/EVICT），不能靠猜。

## 与 ai-learning-lab 课程的对应

| 本篇概念 | 课程对应 |
| --- | --- |
| 缓存分层、降级与生产行为 | `lessons/08-production`、`lessons/16-production-deployment` |
| 缓存状态建模（判别联合/结果对象） | `lessons/01-typescript-node`（TS 类型建模） |
| 缓存与幂等/一致性的边界 | `lessons/10-stream-persistence`（状态与幂等思维） |
| key 设计与失效策略对 RAG/Agent 场景的迁移 | `lessons/06-rag`、`lessons/07-agent-tools`（检索结果/工具结果缓存） |

- 仓库中 `apps/api/src/production/production.ts` 里有生产化防护（超时、降级、重试）思路，与 fail-open 降级同一套心智：附属依赖故障不拖垮主链路。
- Node 侧若接 Redis（ioredis），可直接复用本篇的 key 规范、TTL 策略与五种状态枚举。

## 行动清单

- [ ] 读 `apps/api/src/production/production.ts`，找出其中的降级/兜底逻辑，与 DEGRADED fail-open 对照，写一句注释说明"什么是主链路、什么是性能层"。
- [ ] 给 `apps/api/src/conversation-repository.ts` 中一条高频只读查询设计缓存：写出 key（含版本段）、TTL、写后 evict 的调用点，不必真的接 Redis。
- [ ] 用 TS 判别联合类型定义一个 `CacheLookup` 结果类型（HIT/NULL_HIT/MISS/DEGRADED/BYPASS），并在 `lessons/01-typescript-node` 里练习收窄分支。
- [ ] 列出自己项目里"绝对不能进缓存"的数据（金额、库存、权限判断），写进设计说明。
