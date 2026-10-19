# 第 10 篇：库存扣减为什么最容易出事故？SKU、并发与原子更新

> 原文：[库存扣减为什么最容易出事故？SKU、并发与原子更新](https://juejin.cn/post/7667459437696073782)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

库存展示永远是"旧快照"，前端禁用按钮防不住旧数据和多用户并发。这篇文章回答七个疑问：

- SPU 与 SKU 是什么，分别落到哪张表；
- 金额为什么用 BigDecimal 而非 JS number；
- SKU 创建时哪些字段前端可传、哪些必须后端维护；
- 为什么已上架（ON_SALE）商品不能新增 SKU；
- 乐观锁 version 与 expectedVersion 的作用；
- 库存调整为什么必须单条 SQL 原子更新，不能"先查库存再更新"；
- `available_stock`、`locked_stock`、`version` 三字段如何为订单/支付做准备。

核心观点："库存足够"的判断和"扣减库存"的写入必须放进同一条 SQL，由数据库保证原子性。

## 关键要点

- **SPU/SKU 分表**：
  - SPU 是商品大类，落 `mall_product`；SKU 是可售规格，落 `mall_product_sku`；
  - SKU 表字段含 `sale_price DECIMAL`、`available_stock`、`locked_stock`、`version`；
  - 上架条件（呼应第 9 篇）：至少一条 `sale_price > 0 AND available_stock > 0` 的 SKU。
- **金额精度**：后端用 `BigDecimal` + `DECIMAL(12,2)`，避免 JS number 的 `0.1+0.2` 浮点误差；`price.setScale(2, RoundingMode.UNNECESSARY)`——遇到 12.345 这类需舍入的值直接抛 `VALIDATION_ERROR`，而不是悄悄舍入。
- **库存三态流转**：可售 → 锁定（创建订单 lockStock）→ 锁定减为售出（支付成功 confirmLockedStock）或释放回可售（取消/超时 releaseLockedStock）。
- **两种并发保护场景，接口设计要表达业务动作，不要混用一个接口**：
  - 管理员调库存：`delta + expectedVersion`（版本乐观锁保护）；
  - 下单锁库存：`quantity + available_stock >= quantity`（现量条件保护），不依赖前端版本号。
- **改价 SQL（版本乐观锁）**：

  ```sql
  UPDATE mall_product_sku
  SET sale_price = #{salePrice}, version = version + 1, updated_at = CURRENT_TIMESTAMP(3)
  WHERE id = #{skuId} AND version = #{expectedVersion}
  ```

- **调库存 SQL（版本 + 非负双重条件）**：

  ```sql
  UPDATE mall_product_sku
  SET available_stock = available_stock + #{delta}, version = version + 1, ...
  WHERE id = #{skuId} AND version = #{expectedVersion}
    AND available_stock + #{delta} >= 0
  ```

- **影响 0 行不是成功**：
  - 更新失败时 `explainStockUpdateFailure` 重读当前行，只为"解释原因"：版本变了抛 `INVENTORY_VERSION_CONFLICT`；`availableStock + delta < 0` 抛 `INSUFFICIENT_STOCK`；
  - 安全性由 SQL 条件本身保证，二次读取不参与安全性判断。
- **Entity 与框架**：`@TableName("mall_product_sku")` + `@Version private Integer version`，注册 MyBatis-Plus `OptimisticLockerInnerInterceptor`；但关键库存语义（非负条件）用手写 SQL 精确表达，不依赖插件。
- **核心心智转变**：把并发敏感、与某一行强绑定的规则（版本一致、库存非负）写进 SQL 的 WHERE，交给数据库在更新瞬间用行锁检查；状态机、权限、DTO 组装仍留在 Java 业务层。
- **创建 SKU 流程 createSku**：查商品 → 拒绝对 ON_SALE 商品新增 SKU（`PRODUCT_SKU_NOT_EDITABLE`）→ trim skuCode 查重 → `lockedStock=0、version=0` 初始化 → 插入并捕获 `DuplicateKeyException`（数据库唯一索引兜底并发重名）。
- **并发测试**：`SkuConcurrencyTest` 用两个线程同时执行 `adjustAvailableStockByVersion(skuId, -1, 0)`，断言影响行数之和为 1、库存为 0、版本为 1。
- **易错点（原文 14 条精选）**：
  - 别用 JS number 思维理解后端金额；前端不该传 `lockedStock`、`version`、时间字段；
  - 只靠前端防重复点击防不住多用户/多实例并发；
  - "先查库存再更新"在并发下会超卖或负库存；
  - 必须检查 update 影响行数，0 行不是成功；
  - `expectedVersion` 必须来自上次查询响应，不能写死为 0；
  - 收到 `INVENTORY_VERSION_CONFLICT` 应刷新重拉数据，而非原样重试；返回 `INSUFFICIENT_STOCK` 时前端必须回滚乐观 UI；
  - 提交成功后用后端返回的新响应替换本地行，不要自己推导下一版本；
  - 本阶段用 MySQL 条件更新而非 Redis 扣库存：MySQL 是最终事实来源，先理解"库存不变量必须被可靠保护"，Redis 预扣引入的一致性/补偿问题留待后续；
  - 排查顺序：接口路径 → HTTP 状态与业务 code → 请求体 → 数据库当前行 → 测试定义的规则。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
| --- | --- |
| 条件更新、原子性、影响行数检查 | lessons/03-postgres-persistence（数据库事务与持久化） |
| 生产环境并发、冲突处理与限流 | lessons/08-production、lessons/16-production-deployment（生产化并发限流） |
| "把判断靠近数据"的思路 | apps/api/src/conversation-repository.ts 中的事务与条件写操作 |
| 版本冲突后的客户端行为（刷新重拉、回滚乐观 UI） | lessons/11-chat-workbench 的前端状态同步 |

## 行动清单

- [ ] 在 lessons/03 的 schema.sql 里找出带唯一约束/CHECK 的表，类比 `uk` 唯一索引兜底并发的思路。
- [ ] 阅读 apps/api/src/conversation-repository.ts 的事务写法，找出哪段"先查后写"在并发下会出问题，能否改成单条条件 UPDATE。
- [ ] 用两个并发请求复现一次"先查库存再更新"的超卖，再改写为条件更新验证修复，并检查影响行数。
- [ ] 给一条 UPDATE 补影响行数检查：0 行时区分"版本冲突"和"条件不满足"两种错误码。
