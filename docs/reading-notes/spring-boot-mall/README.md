# 延伸阅读笔记：《从前端到全栈：Spring Boot 项目实战通关》专栏蒸馏

> 原专栏：[从前端到全栈：Spring Boot 项目实战通关](https://juejin.cn/column/7665602007940857898)，作者 swipe，共 16 篇。
>
> 面向前端工程师的 Spring Boot 实战系列，借真实商城项目讲解接口、数据库、鉴权、事务与测试。本目录是逐篇蒸馏笔记，细节请读原文；配套实战仓库为 2530622506/fullstack-mall。

## 笔记清单

### 入门与基础（1～4）

| 篇目 | 主题 | 一句话核心 |
|---|---|---|
| [01 第一次打开 Spring Boot 项目](./01-first-look.md) | 工程地图 | pom.xml ↔ package.json，从用户动作顺链路读源码 |
| [02 后端服务怎么跑起来](./02-run-backend.md) | 启动链路 | JDK/Maven/Spring Boot/yml 配置覆盖与分层排查 |
| [03 Controller 如何接住请求](./03-controller-request-response.md) | 请求响应 | 三种入参、DTO/Entity 边界、统一信封、全局异常 |
| [04 从页面数据到 MySQL](./04-persistence-mysql.md) | 持久化 | 前端状态是副本，数据库才是事实；表设计要点 |

### 数据访问与安全（5～8）

| 篇目 | 主题 | 一句话核心 |
|---|---|---|
| [05 MyBatis-Plus 入门](./05-mybatis-plus.md) | ORM | 免手写 SQL 但要保有 SQL 心智模型，防 N+1 |
| [06 JWT 与 Spring Security](./06-jwt-security.md) | 鉴权 | 安全边界永远在后端，前端守卫只是体验层 |
| [07 后端缓存与 Redis](./07-redis-cache.md) | 缓存 | Redis 是性能层不是数据源，必设 TTL |
| [08 商品详情完整链路](./08-product-detail-chain.md) | 全链路 | 从过滤器到缓存到数据库再到 DTO 的链路感 |

### 业务建模与并发（9～12）

| 篇目 | 主题 | 一句话核心 |
|---|---|---|
| [09 商品状态机](./09-state-machine.md) | 状态机 | 状态迁移白名单由后端控制，变更后失效缓存 |
| [10 库存扣减与并发](./10-inventory-concurrency.md) | 并发 | 把条件写进单条 UPDATE 的 WHERE，交给行锁裁决 |
| [11 购物车落库](./11-cart-persistence.md) | 用户数据 | 只存最小事实，身份取自 JWT，唯一索引防重 |
| [12 下单事务](./12-order-transaction.md) | 事务 | 四步一个事务，价格重算不信前端，幂等键防重 |

### 支付与生产实践（13～16）

| 篇目 | 主题 | 一句话核心 |
|---|---|---|
| [13 支付回调与幂等](./13-payment-callback-idempotency.md) | 回调 | 以第三方回调为准，唯一流水号 + 状态条件更新 |
| [14 Cache Aside 实战](./14-cache-aside.md) | 缓存模式 | 读回填、写后删、TTL 抖动，防穿透/击穿/雪崩 |
| [15 一个字段的交付链路](./15-delivery-chain.md) | 交付 | 加字段要贯穿 migration→Entity→DTO→Service→前端 |
| [16 后端问题排查](./16-debug-backend.md) | 排错 | curl 复现、traceId 串链路、日志/SQL/Redis 分层定位 |

## 与 ai-learning-lab 课程的关系

这个专栏补的是**传统全栈后端**能力（Java/Spring Boot 视角），与仓库的 AI 全栈课程互补：

| 专栏主题 | 对应课程 |
|---|---|
| 请求响应、链路（03/08/16） | [第 0 课](../../lessons/00-roadmap/request-lifecycle-and-koa.md) |
| 持久化、事务（04/12） | [第 3 课 PostgreSQL](../../lessons/03-postgres-persistence/README.md) |
| JWT 鉴权（06） | [第 15 课认证与多租户](../../lessons/15-auth-rbac-multitenancy/README.md) |
| 状态机（09/13） | [第 10 课流状态](../../lessons/10-stream-persistence/README.md)、[第 14 课 Agent 状态](../../lessons/14-agent-workflow/README.md) |
| 缓存（07/14） | [第 8 课生产化](../../lessons/08-production/README.md)、[第 16 课部署](../../lessons/16-production-deployment/README.md) |
| 排错（16） | [第 0 课排查章节](../../lessons/00-roadmap/request-lifecycle-and-koa.md) |

## 阅读建议

1. 有 4 年前端经验，读这个专栏的顺序可以按"好奇驱动"：先 03（请求怎么接住）→ 12（事务）→ 06（登录）→ 10（并发）。
2. 每篇末尾的行动清单尽量落到本仓库代码上：概念相通，语言不同。
3. 读完专栏再看 AI 课程里"为什么 AI 应用也要状态机、幂等和事务"，会有双倍收获。
