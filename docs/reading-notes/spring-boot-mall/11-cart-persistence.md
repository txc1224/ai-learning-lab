# 第 11 篇：购物车不能只存在前端：用户维度数据如何在后端落库

> 原文：[购物车不能只存在前端：用户维度数据如何在后端落库](https://juejin.cn/post/7667504178421006390)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端购物车只是页面内存里的数组，刷新即丢且不可信；在后端它是"和登录用户绑定、落到 MySQL、每次查询重新组装商品/SKU 当前状态"的业务模块。这篇文章回答八个疑问，其中核心几个：

- 前端状态与后端表的区别是什么；
- 为什么 userId 必须来自登录态，请求体传 `userId=2` 为什么无效；
- 购物车为什么存 skuId 而非 productId；
- `CartAddRequest` 为什么只有 skuId 和 quantity 两个字段；
- 如何校验商品/SKU/价格/库存；
- 同用户同 SKU 如何防重复，唯一索引如何兜底；
- 批量查询如何避免 N+1；
- 为什么购物车金额只是预估而非订单金额。

## 关键要点

- **用户维度落库**：购物车是登录用户的持久化数据，换设备/刷新不丢；前端内存数组只是展示态，不可信。
- **登录态决定身份**：
  - userId 只来自 `CurrentUserService.requireCurrentUserId()`（JWT）；
  - 路径设计为 `POST/GET /api/cart/items`，不含 userId——URL 表达"我的资源"，身份由令牌决定；
  - 请求体里的 userId 一律不接收、不信任。
- **存 skuId 不存 productId**：用户买的是具体规格，规格决定价格与库存。表只存最小事实：`user_id、sku_id、quantity、checked、created_at、updated_at`；标题/价格/库存全部查询时动态组装，避免冗余副本与真实数据不一致。
- **表结构关键点（mall_cart_item）**：
  - `UNIQUE KEY uk_mall_cart_item_user_sku (user_id, sku_id)` 兜底防重复加入；
  - `idx_mall_cart_item_user_updated_at` 支撑按用户 + 更新时间查询排序；
  - CHECK 约束限定 quantity 1–99、checked 0/1。
- **CartAddRequest 只有两个字段**：`skuId` + `quantity`（`@Min(1)`、`@Max(99)`）。价格、标题一律不让前端传，后端查询组装。
- **addItem 流程（伪代码顺序）**：
  1. 取当前 userId；
  2. `requireById(skuId)` 查 SKU、`requireById(productId)` 查商品；
  3. 可售校验：上架、价格>0、库存>0；
  4. 数量 ≤ availableStock，否则库存不足；
  5. `existsByUserIdAndSkuId` 防重（提前提示）；
  6. save 并 catch `DataIntegrityViolationException` 转 `CART_ITEM_ALREADY_EXISTS`（唯一索引兜底并发重复）。
- **防重三层**：前端提示 + 后端 exists 查询 + 数据库唯一索引。查询只是体验优化，约束才是兜底。
- **查询组装避免 N+1**：`queryMyCart` 收集全部 skuId 一次批量查 SKU，再批量查商品，用 Map 组装；循环里单查是典型反模式。
- **saleable 动态判定**：
  - 需同时满足 SKU 存在、商品存在、上架、价格有效、库存 ≥ 数量；
  - 不可售时不删行，标记 `saleable=false` 保留上下文，让用户理解为什么买不了；
  - SKU 被删则保留 skuId、其余字段为空。
- **金额只是预估**：
  - `totalQuantity` 统计全部行；`estimatedTotal` 只统计 `checked && saleable` 行的 lineAmount 之和；
  - checked 是落库的业务状态，不是前端临时变量，未勾选行不计入预估总额；
  - 购物车是"意向"，订单是"承诺"——下单必须重算价格、锁库存、保存快照，绝不能拿 estimatedTotal 提交。
- **用户隔离**：所有用户资源的查询/更新/删除 SQL 最终都要带 `user_id` 条件，防止越权；DbService 的 `listByUserId`、`getByUserIdAndSkuId` 都带 userId，并为订单链路预留 `listCheckedByUserId`、`removeCheckedByUserIdAndIds`。
- **排查顺序**：先查 Authorization 头 → 再看业务 code → 查库时务必带 user_id，避免把"数据存在却查不到"误判为 bug。
- **易错点（原文 11 条精选）**：请求体接收 userId；只存 productId；信任前端价格/标题；加购只看 SKU 存在不校验状态/价格/库存；防重只做前端提示；循环单查造成 N+1；不可售时直接删行；把 estimatedTotal 当订单金额；用户资源 SQL 漏带 user_id 造成越权。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
| --- | --- |
| 用户维度数据落库、最小事实存储 | lessons/03-postgres-persistence（数据库事务持久化、schema 设计） |
| 身份来自登录态、请求体 userId 不可信、用户隔离防越权 | lessons/15-auth-rbac-multitenancy（认证/多租户） |
| 服务端持久化的用户会话数据 | apps/api/src/conversation-repository.ts（会话按用户落库） |
| 批量查询避免 N+1 | lessons/03 中批量查询与组装的实践 |

## 行动清单

- [ ] 对照 apps/api/src/conversation-repository.ts：会话数据绑定的是哪个用户标识？查询条件是否始终带该标识？
- [ ] 在 lessons/03 的 schema.sql 中为"收藏夹"设计一张用户维度表：最小事实字段 + 唯一索引 + CHECK 约束。
- [ ] 复习 lessons/15：写一段说明"为什么 userId 只能来自认证层，不能来自请求体"，并检查课程 API 是否有遗漏。
- [ ] 练习：把一个循环单查的接口改写为批量 IN 查询 + Map 组装，对比生成的 SQL 条数。
