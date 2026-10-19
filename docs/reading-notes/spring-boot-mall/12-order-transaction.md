# 第 12 篇：点击提交订单后，后端如何用事务守住价格、库存和订单？

> 原文：[点击提交订单后，后端如何用事务守住价格、库存和订单？](https://juejin.cn/post/7668078403464085547)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

下单瞬间要同时"写订单、锁库存、写订单项、清购物车"多件事，任何一步失败都不能留下脏数据。这篇文章回答：后端如何用事务把这些动作绑成原子操作、价格为什么必须重算而不是信前端、幂等键如何防止重复下单，以及事务的边界与局限在哪里。

## 关键要点

- **事务保证原子性（四步一个事务）**：
  - 全部放在 `OrderCreateTransactionService`，标注 `@Transactional(rollbackFor = Exception.class)`；
  - 顺序：写订单主表 → 锁库存 → 写订单项快照 → 删除已勾选购物车；
  - 任意一步失败整体回滚，避免"订单有了但库存没锁"这类半成功状态；
  - 关键设计：事务只保护"创建待支付订单"这个短动作，绝不在事务里等待用户支付或调用第三方（锁持有过久）。
- **价格重算，不信任前端**：
  - `POST /api/orders` 没有 `@RequestBody`，只从请求头取 `Idempotency-Key`；
  - userId 来自 JWT；价格、库存、上架状态全部从数据库重新读取校验；
  - 金额用 `BigDecimal` 计算，总额由各订单项 lineAmount 累加，绝不接受前端传的 totalAmount（购物车的 estimatedTotal 只是预估）。
- **库存锁定（两阶段，复用第 10 篇条件更新）**：
  - `available_stock`（可售）与 `locked_stock`（待支付占用）两个字段；
  - 核心是一条条件原子更新：`UPDATE ... SET available_stock = available_stock - #{quantity}, locked_stock = locked_stock + #{quantity} WHERE id = #{skuId} AND available_stock >= #{quantity}`；
  - 影响行数 ≠ 1 即库存不足、事务回滚——检查与更新在数据库一次完成，避免并发超卖；
  - 流转：可售 → 锁定（下单）→ 售出（支付）或释放（取消/超时）；加入购物车不锁库存——购物车只是意向。
- **订单表设计（快照）**：
  - 主表 `mall_order`：orderNo、userId、状态、totalAmount、idempotencyKey、expiresAt（15 分钟支付截止）；
  - 明细表 `mall_order_item` 保存下单时的标题、规格、单价、数量、行金额快照——商品后续改价改名不影响历史订单；
  - 唯一索引 `uk_mall_order_user_idempotency (user_id, idempotency_key)` 兜底幂等。
- **幂等设计（双层保护）**：
  - 格式校验：8–64 位，限字母数字和 `._:-`；
  - 业务层先查已有订单直接返回；并发时靠数据库唯一索引兜底，捕获 `DataIntegrityViolationException` 后查询胜出订单返回；
  - 关键提示：请求超时结果不明时必须复用同一个 key 重试，换新 key 会产生第二笔订单。
- **用户隔离与购物车删除**：查询/取消订单都带 orderId + userId 防越权；删购物车的 SQL 同时限定 user_id、checked=1 和 ID 集合，删除行数不符则抛 `ORDER_CART_CHANGED` 回滚（下单期间购物车被用户改动）。
- **易错点（原文 9 条）**：
  - 让前端提交总金额或 userId（可被篡改）；
  - 不加事务导致脏数据（订单无明细、库存被占）；
  - 先查库存再普通更新——并发下都会看到"库存充足"；
  - 把购物车预估金额当订单金额；
  - 订单详情动态读商品表，历史订单被改价影响；
  - 重试时换新幂等键；
  - 创建订单时直接永久扣库存，取消无法恢复；
  - 事务里等待支付或调用第三方；
  - 忽略并发和回滚测试用例。
- **核心思想一句话**：前端数据只是"用户意图"，交易事实必须来自服务端数据库，并用事务、条件更新、唯一索引三层机制保证一致性。
- **原文结构提示**：13 个部分，含逐段读源码、本地 curl 验证、事务局限性讨论与排查顺序；并发与回滚都有专门测试用例。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
| --- | --- |
| 事务把多表写入绑成原子操作、rollbackFor | lessons/03-postgres-persistence（数据库事务持久化） |
| 幂等键 + 唯一索引双层防重 | lessons/10-stream-persistence（流状态机/幂等） |
| 订单状态流转 + 前置条件（待支付/支付/取消） | lessons/07-agent-tools、lessons/14-agent-workflow（Agent 状态机/审批） |
| 事务内的条件更新、删除行数校验与回滚 | apps/api/src/conversation-repository.ts 的事务写法 |
| 事务不等待外部调用（锁持有时间） | lessons/08-production、lessons/16-production-deployment（生产化） |

## 行动清单

- [ ] 阅读 apps/api/src/conversation-repository.ts 的事务方法，标注事务边界起止，确认事务内没有外部 API 调用。
- [ ] 在 lessons/03 的 schema.sql 基础上设计 order + order_item 两张表：含价格快照字段与 `(user_id, idempotency_key)` 唯一索引，并写明理由。
- [ ] 用 lessons/03 的环境复现：事务内锁库存失败后，验证订单写入被回滚、库存保持不变。
- [ ] 实践幂等：用同一个 Idempotency-Key 连续发两次创建请求，验证只产生一条记录；再换新 key 观察产生第二笔。
