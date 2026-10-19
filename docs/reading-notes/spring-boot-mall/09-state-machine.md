# 第 9 篇：商品为什么不能随便上下架？后端状态机思维入门

> 原文：[商品为什么不能随便上下架？后端状态机思维入门](https://juejin.cn/post/7667062321656365098)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端按钮只能"防误点"，防不了 DevTools/curl 手动构造的请求。这篇文章以后台商品管理页的后端源码走读为主线，回答六个疑问：

- 商品为什么创建时是 DRAFT 草稿，而不是创建即上架；
- DRAFT、ON_SALE、OFF_SHELF 三个状态各自的含义和边界；
- 状态流转为什么必须由后端状态机控制；
- 创建/上架/下架分别经过哪些代码文件（Controller → Facade → DB/缓存服务 → 测试，共 14 个关键文件）；
- 上架前为什么要校验分类启用和至少一个可售 SKU；
- 状态变化后为什么必须删除商品详情缓存。

核心结论：前端按钮只是体验层，"真正的业务规则必须落在后端"。

## 关键要点

- **三状态生命周期**：
  - `DRAFT`：草稿，匿名用户不可见；
  - `ON_SALE`：已上架，公开可查；
  - `OFF_SHELF`：已下架，保留历史数据。不物理删除，因为订单/购物车/支付会引用商品，需要软删除或状态下架来保留审计。
- **状态机 = 状态 + 允许的转换规则**，采用"默认拒绝，明确允许"的白名单策略：
  - DRAFT → ON_SALE ✓
  - ON_SALE → OFF_SHELF ✓
  - OFF_SHELF → ON_SALE ✓
  - 其余全部拒绝：`ON_SALE→ON_SALE` 无业务意义；`DRAFT→OFF_SHELF` 草稿谈不上下架。
- **前端 state ≠ 后端 state**：
  - 前端按钮控制类似表单校验，可被 DevTools/curl 绕过；
  - 商品状态是持久化到 MySQL 的业务 state，不是临时 UI state；
  - 前端 `nextStatusMap` 可以与后端一致，但冲突以后端为准，前端按错误 code 修正提示。
- **权限与状态机是两层规则**：权限问"有没有资格"（401 未登录 → 403 非管理员），状态机问"该操作是否合法"（400 参数校验 → 业务错误码）。二者不能互相替代。
- **服务端可信字段**：`status`、`createdBy`、`createdAt` 由后端生成，创建请求 DTO 故意只有 `categoryId`（`@NotNull + @Positive`）、`title`（`@NotBlank + max 100`）、`description`（max 2000），不含 status/createdBy/时间字段。
- **创建逻辑 createProduct**：先 `requireEnabledCategory` 校验分类存在且启用 → 服务端取 `LocalDateTime.now()` → `setStatusCode(ProductStatus.DRAFT.name())` → `requireCurrentUserId()` 取创建人 → save → `evict(product.getId())` 清掉"提前猜 ID"的空值缓存。标题 trim，纯空白描述归一为 null。
- **状态变更 changeStatus 七步**：
  1. `requireById` 读取当前状态；
  2. 字符串转枚举；
  3. `validateTransition(current, target)` 校验流转边；
  4. 目标为 ON_SALE 时用 `requireEnabledCategory`，否则只 `requireCategory`（下架只要求分类记录存在）；
  5. ON_SALE 还需 `requireSaleableSku`；
  6. 更新 status_code 和 updated_at；
  7. `evict(productId)` 删缓存。
- **状态机白名单写法**：

  ```java
  boolean allowed = (DRAFT && ON_SALE) || (ON_SALE && OFF_SHELF) || (OFF_SHELF && ON_SALE);
  if (!allowed) throw new BusinessException(INVALID_PRODUCT_STATUS_TRANSITION, ...);
  ```

- **SKU 可售校验（MyBatis-Plus lambdaQuery）**：`eq(productId).gt(salePrice, 0).gt(availableStock, 0).count() > 0`，否则抛 `PRODUCT_NOT_READY_FOR_SALE`——要求至少一条价格大于 0 且可售库存大于 0 的 SKU。
- **表结构支撑**：`mall_product.status_code VARCHAR(20) DEFAULT 'DRAFT'` + 索引 `idx_mall_product_status_created_at(status_code, created_at)` 支撑公开列表只查 ON_SALE。
- **缓存不是事实来源**：MySQL 是事实，Redis 缓存必须在写库成功后 evict；创建时也要 evict 掉提前写入的空值缓存，否则旧详情或空值缓存导致可见性错误。
- **HTTP 语义**：`POST /api/admin/products` 返回 201 Created（前端按 2xx 判断而非只认 200）；`PATCH /{id}/status` 表示局部更新；Controller 只接参数、调 Facade、包响应。
- **本地验证思路（原文 8 个 curl 实验）**：登录 → 创建 → 验证 401/403 → 验证草稿公开访问 404 → 上架 → 验证非法转换被拒 → 下架 → redis-cli 验证缓存失效。
- **易错点（原文 10 条反模式精选）**：
  - 只判断目标状态是合法枚举，不看当前状态（漏掉 `ON_SALE→ON_SALE` 非法）；
  - 上架前不查 SKU（用户看得到买不了）或不查分类启用（前端下拉框不可信）；
  - 状态变更后忘删缓存；
  - 把 createdBy 交给前端提交；
  - 用物理删除代替下架，破坏订单历史关联和审计；
  - 不用测试保护状态机——`shouldAllowDraftToGoOnSale`、`shouldRejectIllegalStatusTransition`、`shouldRejectPublishingWithoutSaleableSku` 这些测试方法名本身就是业务文档和护栏。
- **扩展与架构位置**：新增状态（如 ARCHIVED、PENDING_REVIEW）必须回到后端状态机定义进出边、前置条件和测试；状态机放 Facade（用例编排层）即可，"不要为了架构感过早抽象"。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
| --- | --- |
| 状态机白名单、非法流转拒绝 | lessons/10-stream-persistence（流状态机/幂等） |
| Agent 生命周期状态、审批/人工确认 | lessons/07-agent-tools、lessons/14-agent-workflow（Agent 状态机/审批） |
| 状态 + 允许转换的显式定义 | apps/api/src/agent 中的运行状态管理 |
| 写后失效缓存（MySQL 为事实来源） | lessons/03-postgres-persistence 的持久化事实来源讨论 |

## 行动清单

- [ ] 在 lessons/10 或 lessons/14 中找出"状态 + 转换规则"的定义位置，对比本文 `validateTransition` 的白名单写法。
- [ ] 给 apps/api/src/agent 的会话/运行状态画一张状态转换图，标出"默认拒绝"的非法边。
- [ ] 练习：为一个新业务对象（如草稿文章）设计三状态机，写清每个转换的前置条件，并仿照原文给测试方法命名（名字即业务文档）。
- [ ] 思考：课程里哪条链路写库后没有清理缓存/旧状态？写一条 evict 策略说明。
