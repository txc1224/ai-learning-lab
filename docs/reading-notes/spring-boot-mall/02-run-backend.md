# 第 2 篇：从 pnpm dev 到 Spring Boot 启动：后端服务到底怎么跑起来？

> 原文：[从 pnpm dev 到 Spring Boot 启动：后端服务到底怎么跑起来？](https://juejin.cn/post/7665643279287910442)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端同学熟悉 `pnpm install` / `pnpm dev`，但只会背 `mvn spring-boot:run`，一旦编译失败、依赖找不到、端口冲突、连不上数据库就无从排查。本篇讲清一个 Java 后端如何从源码变成监听 HTTP 的进程：JDK/JVM 运行模型、Maven 多模块、Spring Boot 启动链、yml 与 profile、启动验证方法。

## 关键要点

- 运行模型差异：.java 先编译成字节码由 JVM 执行；后端是一个常驻 JVM 进程，所有用户共享同一服务进程与同一 MySQL/Redis；前端则是各自浏览器里相互隔离。
- Maven ≈ pnpm 但更偏"工程构建"：坐标 groupId:artifactId:version（类比 npm 包名+版本）；父工程 properties 统一版本管理；依赖 scope 类比 dependencies/devDependencies（MySQL 驱动是 runtime，测试库是 test）。
- 多模块：contract 放契约、service 放实现，依赖方向 service → contract（类比 api-types 包不能反向依赖页面组件）。
- Spring Boot 三句话：帮你启动应用、帮你创建管理 Bean、把 HTTP 请求分发给 Controller；内嵌 Web 服务器监听 server.port。
- 启动链：Maven 读 POM → 编译模块 → Spring Boot 插件 → JVM 跑 main → SpringApplication.run → 读 yml/profile → 创建 Bean → 监听端口。
- 配置体系：application.yml 默认 + application-local.yml（H2 内存库、关缓存）+ application-debug.yml（端口 8081）；profile 后加载覆盖默认；`${ENV:default}` 环境变量优先、缺省兜底。前端环境变量是构建期注入，后端是运行时读取。
- 常用命令：

```bash
cd backend
mvn -pl service -am spring-boot:run        # -pl 指定模块，-am 连带构建依赖 contract
mvn -pl service -am spring-boot:run -Dspring-boot.run.profiles=local   # 无 Docker 用 H2
mvn -pl service -am spring-boot:run -Dspring-boot.run.profiles=debug   # 端口 8081
SERVER_PORT=8090 mvn -pl service -am spring-boot:run                   # 临时换端口
docker compose -f docker-compose.dev.yml up -d mysql redis             # 先起依赖
curl -i http://localhost:8080/api/products/1001                        # 验证接口
```

- 启动类：`@SpringBootApplication` 包扫描默认覆盖启动类所在包及子包；exclude 掉 Security 默认用户配置；`@EnableScheduling` 为支付超时关单铺垫。
- 启动失败分层排查（固定顺序）：Maven 阶段（依赖/编译）→ JVM 阶段（Java 21 版本）→ Spring 容器（BeanCreationException）→ Web 服务器（端口占用）→ 外部资源（MySQL/Redis 连接）→ 业务初始化；从第一条异常读日志，不要只看最后一行。
- 验证分三层：进程活着 → 端口在监听 → 接口返回预期 JSON。
- 易错点：必须在 backend 目录执行 Maven；默认配置需先起 MySQL(3308)/Redis；改 yml 要重启，后端没有前端式热更新；别把 H2 当真 MySQL（方言、事务、锁行为不同）；同一 Controller 在不同 profile 连不同数据源，是"改了数据接口没变"的常见根源。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
|---|---|
| dev server 与后端服务进程、请求分发总览 | lessons/00-roadmap（HTTP 路由/请求响应） |
| 服务启动、配置读取、profile/环境变量 | lessons/02（Python/FastAPI 对照：uvicorn 启动与配置） |
| 分层排查、日志读法、端口与部署 | lessons/08、16（生产化/日志/部署） |

## 行动清单

- [ ] 对照 ai-learning-lab 的启动方式（apps/api 的 npm script / tsx / uvicorn），写一张与 `mvn spring-boot:run` 的逐环节对应表：安装依赖、编译检查、启动、热重载差异。
- [ ] 在 apps/api/src/server.ts 找端口读取逻辑，模仿 `${ENV:default}` 写法补默认值兜底，并验证不设环境变量时服务能以默认端口启动。
- [ ] 故意制造一次启动失败（占用端口或写错环境变量），按本文六层排查顺序记录每层现象与日志首条异常。
- [ ] 体验一次 profile 式配置切换：为本地和"模拟生产"准备两份配置，确认切换后数据源/端口确实改变。
