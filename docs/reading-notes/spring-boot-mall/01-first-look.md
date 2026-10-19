# 第 1 篇：前端人第一次打开 Spring Boot 项目，应该先看哪里？

> 原文：[前端人第一次打开 Spring Boot 项目，应该先看哪里？](https://juejin.cn/post/7665607110682918918)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端第一次打开 Java 后端项目，面对 pom.xml、contract/service 双模块、Controller→Facade→DbService→Mapper 多层结构，不知道从哪里读起。本篇只做一件事：建立后端工程的整体地图，先看清职责边界，不深入细节。

## 关键要点

- 前后端概念对照：
  - package.json ↔ pom.xml（Maven 还负责编译、测试、打包、多模块关系）
  - main.ts ↔ 启动类 FullstackMallApplication.java（后端常驻运行、监听 HTTP）
  - Vue Router ↔ Controller（服务器的 HTTP 入口，不是页面路由）
  - Axios 的 request/response type ↔ Request/Response DTO（DTO 是运行时真实对象，参与参数绑定、校验、序列化）
  - api/product.ts ↔ IProductFacade 契约；composable/service ↔ Facade 实现
  - store 状态 ↔ MySQL/Redis；mock 数据 ↔ seed SQL
- 工程结构：backend/pom.xml 父工程（Java 21、Spring Boot 3.5.16）+ contract 模块（放 Request/Response/enum/IFacade 对外契约）+ service 模块（Controller、Facade 实现、Entity、Mapper、配置、启动类），依赖方向 service → contract。
- 分层职责：Controller 只做接参数、调 Facade、包统一响应，不写业务；Facade 做业务编排（取当前用户、查缓存/数据库、Entity 转 Response、调事务）；Entity/Mapper/DbService 分别对应数据库行、CRUD、业务语义方法。
- 关键链路示例：`GET /api/products/{id}` → `ProductController.detail(@PathVariable Long id)` → `IProductFacade.getPublishedProduct(id)` → `ApiResponse.success(data, traceId)`。
- `@Resource` 注入而不是自己 new：统一生命周期，并享受事务/安全代理。
- Redis 是性能优化层不是业务真相（挂了要降级回 MySQL）；Security/JWT 由前端携带 Token、后端验证可信。
- 思维转变：前端关心"用户此刻看到什么"，后端关心"所有用户、并发和失败场景下是否仍然正确"。
- 读源码规则："永远从用户动作开始，不要从框架名词开始"——从一个 GET 请求出发顺链路找代码；遇到陌生概念问三个问题：解决什么问题？在哪个文件？出错时前端看到什么？
- 建议阅读顺序：README → 三个 pom.xml → ProductController → IProductFacade → ProductFacade → 按需看 Entity/Mapper/sql/01_schema.sql。
- 常见错误精选：一上来啃订单/支付等最复杂业务（应从简单公开 GET 入手）；混淆 DTO/Entity/表（字段像但职责不同，created_by 不进公开响应）；以为前端校验就安全（用户可绕过页面直接调接口）；把 Redis 当数据库；只测成功路径不定义失败返回。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
|---|---|
| 请求链路图、分层职责总览、路由入口 | lessons/00-roadmap（HTTP 路由/请求响应） |
| 统一响应、traceId、日志与排错定位 | lessons/08、16（生产化/requestId/日志/部署） |
| Security/JWT、公开接口与管理接口分离 | lessons/15（认证权限多租户） |
| 只定义成功不定义失败的失败路径思维 | lessons/01（异步与错误处理） |

## 行动清单

- [ ] 读 apps/api/src/server.ts，列出全部路由注册，画出"请求 → handler → 数据来源"的链路图，对照本文 Controller→Facade→数据层。
- [ ] 对比 apps/api 目录与 fullstack-mall 的 contract/service 分层：哪些文件承担"契约"（DTO/类型定义），哪些承担业务编排，写 5 行对照表。
- [ ] 挑一个公开 GET 接口从路由读到数据来源，记录每层输入输出类型，对照 Request/Response DTO 与 Entity 的边界。
- [ ] 检查 ai-learning-lab 是否有类似 ApiResponse 的统一响应信封与 requestId/traceId；没有就记下来，学到 lessons/08/16 时补上。
