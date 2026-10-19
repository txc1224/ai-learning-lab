# 第 4 篇：前端状态为什么不够用？从页面数据到 MySQL 持久化

> 原文：[前端状态为什么不够用？从页面数据到 MySQL 持久化](https://juejin.cn/post/7665943714632826920)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

把数据只理解为 JavaScript 对象是误区：接口返回的商品、购物车、订单数据最终来自数据库。前端状态只是局部副本，MySQL 才是服务端业务事实的长期权威来源。朴素判断标准：凡是"刷新页面不能丢、换浏览器不能丢、服务重启不能丢、多人同时访问要一致"的数据，都应进入持久化数据库。

## 关键要点

- 前端存储对照：组件 state ≈ 方法局部变量；Pinia/Vuex ≈ 进程内缓存（不可靠持久）；localStorage ≈ 不可信客户端存储；Axios 缓存 ≈ Redis；MySQL ≈ 事实来源。Redis 只是缓存，可丢、可过期、可重建，不是事实来源。
- 持久化价值：服务重启数据仍在、结构化约束、可查询、事务一致性、约束防脏数据、并发控制（锁、隔离级别、乐观锁版本号）。
- 主键：AUTO_INCREMENT 由数据库生成，前端不应传 id；唯一索引是防重复的最终保证——如用户名唯一、`(user_id, idempotency_key)` 防重复下单、`(user_id, sku_id)` 购物车不重复；并发请求会绕过前端防连点校验。
- 普通索引服务查询性能（类比"给大数组建 Map"），但占空间且增加写成本，须按真实查询场景设计。
- CHECK 约束是数据底线：价格 > 0、库存 ≥ 0、数量 1–99。
- 项目无显式 FOREIGN KEY，表关系靠字段命名（product_id、user_id）和业务代码维护，是工程取舍。
- SPU/SKU 区分：商品表存标题/状态/分类，价格和库存在 SKU 表，避免字段重复和结构僵硬。
- 快照概念：订单项保存下单时的 product_title、spec_text、unit_price——商品会改名改价下架，历史订单是交易凭证。"有些数据是当前状态，有些数据是历史事实"。
- 字段类型红线：建库用 utf8mb4 防中文/emoji 乱码；金额必须 `DECIMAL(12,2)` / Java BigDecimal，绝不用浮点（0.1+0.2 精度问题）；时间用 `DATETIME(3)` 精确到毫秒。

```sql
CREATE TABLE mall_product (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  status_code VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
);
```

- 8 张表速览：mall_user（password_hash 存 BCrypt，绝不存明文；role_code 区分 USER/ADMIN）、mall_category（name 唯一 + sort_order）、mall_product、mall_product_sku（sale_price、available_stock、locked_stock、version 乐观锁）、mall_cart_item、mall_order（order_no 不暴露主键、idempotency_key、expires_at 等生命周期时间）、mall_order_item（快照字段）、mall_payment（callback_id 防回调重复处理）。
- SQL 先会查再会改：WHERE ≈ filter、ORDER BY ≈ sort、LIMIT ≈ slice，但数据库由优化器基于索引执行，不是内存数组处理。
- 闭环验证方法：SQL 查数据 → 请求接口对比 → 不一致则查缓存/profile/查询条件；写 SQL 从单表最小查询开始逐步加 JOIN。
- 易错点精选：金额用浮点；相信前端传来的 user_id 和金额（必须由后端根据登录上下文与数据库生成/校验）；列表不分页（项目默认 pageSize=10 且 ≤ 100）；只在代码里防重复不建唯一索引；local profile 连 H2 导致"改了 MySQL 接口不变"；生产环境 UPDATE/DELETE 先确认 WHERE，最好先 SELECT 同条件。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
|---|---|
| 持久化、表设计、约束、索引、事务 | lessons/03（数据库事务持久化） |
| 不信任前端 user_id、由登录上下文决定数据归属 | lessons/15（认证权限多租户） |
| idempotency_key 防重复下单、回调去重 | lessons/10（流状态幂等） |

## 行动清单

- [ ] 检查 apps/api 现在把数据存在哪里（内存/文件/数据库），找出满足"刷新不丢、多人一致"却尚未持久化的数据，列出改造清单并对照 lessons/03。
- [ ] 给一个实体补唯一索引和 CHECK 约束，再用并发请求验证"仅靠代码防重复"确实会失效。
- [ ] 做一次"SQL 与接口闭环验证"：手工查一条数据，再请求对应接口，对比结果是否一致，不一致时排查缓存与查询条件。
- [ ] 审查一遍写入路径：确认没有信任前端传来的 user_id / 金额 / id 等应由服务端生成的字段。
