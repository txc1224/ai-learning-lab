# 第 16 篇：前端人排查后端问题：curl、traceId、日志、MySQL、Redis 怎么用？

> 原文：[前端人排查后端问题：curl、traceId、日志、MySQL、Redis 怎么用？](https://juejin.cn/post/7669696162708570166)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端遇到"接口 500 / 数据不对"时，常常只能把问题原样抛给后端然后干等。这篇文章回答：前端人如何用一套工具链（curl、traceId、日志、MySQL、Redis）独立定位问题，把"我觉得接口坏了"升级为"我知道问题在哪一层"。

## 关键要点

- **分层排查思想（先定位层，再读代码）**
  - 接口层：参数、路由、状态码对不对？
  - 应用层：逻辑、异常、依赖调用错在哪？
  - 数据层：DB 数据本身、缓存旧值？
  - 环境层：配置、版本、部署环境差异？
  - 一层层排除，避免上来就通读代码。

- **curl：脱离浏览器复现请求**
  - 用 curl 原样重放请求，立刻分清是"前端传参问题"还是"服务端问题"。

  ```bash
  curl -v -X POST 'https://api.example.com/orders' \
    -H 'Authorization: Bearer <token>' \
    -H 'Content-Type: application/json' \
    -d '{"skuId":1,"count":2}'
  ```

  - `-v` 看请求/响应头；浏览器能过而 curl 失败，多半是 cookie/token/header 差异。

- **traceId：一条请求的身份证**
  - 请求进来时生成（或从前端 header 透传）唯一 traceId，链路上所有日志都带它。
  - 前端报障时先给 traceId，后端 grep 一次就能看到这条请求的完整生命周期。
  - 前端可以在网关层把自己的 requestId 注入 header，方便两端对照。

- **日志怎么看**
  - 顺序：先按 traceId 过滤 → 看级别（ERROR/WARN）→ 看时间点 → 读异常堆栈。
  - 堆栈重点：第一行的异常类型 + 最后一处自己代码的帧。
  - 日志要带上下文（入参、关键中间值），否则事后无据可查。

- **MySQL：核对数据本身**
  - "接口返回不对"经常是数据本身如此，先用 SQL 按业务键查最新记录：
  - 看状态字段、时间戳、更新人，判断是代码逻辑错，还是数据被别处改了。
  - 慢查询用 EXPLAIN 看索引是否命中。

  ```sql
  SELECT order_no, status, updated_at, updated_by
  FROM orders WHERE order_no = 'xxx' ORDER BY id DESC;
  ```

- **Redis：缓存排查三板斧**
  - 看值：`GET key`，缓存里到底是什么？
  - 看 TTL：`TTL key`，还有多久过期？
  - 删了再试：删 key（或等过期）后重新请求，问题消失即缓存脏数据。

- **报障的正确姿势**
  - 一次合格报障 = 环境（测试/生产）+ 完整 curl 命令 + 期望结果 vs 实际结果 + traceId + 已排除的假设。
  - 这与提 bug 的纪律完全一致，也是前端转全栈最直接的协作货币。

## 与 ai-learning-lab 课程的对应

| 本文概念 | 仓库对应 |
| --- | --- |
| 分层排查、接口排错方法论 | `lessons/00-roadmap` 的排查章节 |
| requestId/traceId、结构化日志、限流 | `lessons/08-production`、`lessons/16-production-deployment` |
| 缓存旧值、依赖健康检查 | `lessons/16-production-deployment` |
| curl、异步请求、超时重试基础 | `lessons/01-typescript-node` |

## 行动清单

- [ ] 给 `apps/api/src/server.ts` 加 requestId 中间件：生成/透传 requestId 并打进所有日志，用 curl 带自定义 header 验证两端能对上同一条请求。
- [ ] 做一次完整排错演练：人为制造"缓存旧值"故障，按 curl 复现 → 查日志 → 查 Redis → 查数据的顺序定位，记录每步证据。
- [ ] 整理自己的报障模板（环境、curl、期望/实际、traceId、已排除项），下一次报障直接套用。
- [ ] 在 `apps/api/src/production/production.ts` 确认日志输出结构化字段（时间、级别、requestId、路径），并练习用 grep 按 requestId 抽取一次请求的完整日志。
