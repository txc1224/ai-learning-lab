# 第 14 篇：商品详情高频访问怎么扛？Redis Cache Aside 实战

> 原文：[商品详情高频访问怎么扛？Redis Cache Aside 实战](https://juejin.cn/post/7668191994554761270)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

商品详情页是电商里访问量最大的页面，每个请求都打 MySQL 扛不住。这篇文章回答：如何用 Redis 给数据库挡读流量（Cache Aside 模式），以及缓存引入之后必须防住哪三类经典事故？

## 关键要点

- **Cache Aside（旁路缓存）的读写规则**
  - 读：先查 Redis，命中直接返回；未命中查 DB，把结果写入 Redis 再返回。
  - 写：先更新 DB，再删除缓存。
  - 应用层自己维护缓存逻辑，不依赖 Redis 自动同步，这是最常用、最不容易出错的模式。

- **为什么"写后删缓存"而不是"写后更新缓存"**
  - 并发写时，写库顺序和写缓存顺序可能错位，缓存会长期停留在旧值。
  - 删除是幂等操作，下次读取自然回填，最终一致。

- **缓存必须设 TTL（过期时间）**
  - 没有 TTL 的缓存等于把 DB 复制一份，脏数据和内存问题都会出现。
  - TTL 长度 = 业务能容忍的数据旧程度，商品详情常见几十秒到几分钟。

- **三大经典事故与对策**

  | 事故 | 场景 | 对策 |
  | --- | --- | --- |
  | 缓存穿透 | 查不存在的 ID，永远不命中，全打到 DB | 缓存空值（短 TTL）；入口校验参数 |
  | 缓存击穿 | 热点 key 过期瞬间，大量请求同时压到 DB | 回填 DB 加互斥锁，只放一个请求去查库 |
  | 缓存雪崩 | 大量 key 同一时刻过期 | TTL 加随机抖动，打散过期时间 |

- **实现层要点**
  - Spring Boot 中常用 `StringRedisTemplate`，以 JSON 字符串存取对象。
  - 缓存层要捕获 Redis 异常并降级：Redis 挂了就退回直查 DB，可用性优先于性能。
  - 读路径伪代码：

  ```java
  String json = redis.get(key);
  if (json != null) return deserialize(json);   // 命中
  Product p = productMapper.findById(id);       // 未命中查库
  if (p == null) { redis.set(key, "", 30s); return null; } // 空值防穿透
  redis.set(key, serialize(p), ttlWithJitter());
  return p;
  ```

- **对前端的启示**
  - 缓存适合"读多写少"的场景；商品改完前端短时间内仍看到旧值，不是 bug 而是缓存窗口期。
  - 排查时先分清：请求"没进缓存"（未命中路径有问题）还是"缓存里是旧值"（写后没删 key）。

## 与 ai-learning-lab 课程的对应

| 本文概念 | 仓库对应 |
| --- | --- |
| 缓存层、依赖健康检查、降级路径 | `lessons/16-production-deployment` |
| requestId 串起命中/未命中的观测 | `lessons/08-production`、`lessons/16-production-deployment` |
| 高频读慢在哪一层的定位方法 | `lessons/00-roadmap` 的排查章节 |
| TTL/超时/异步回填的基础思想 | `lessons/01-typescript-node` |

## 行动清单

- [ ] 本机起 Redis，给 `apps/api/src/server.ts` 的某个 GET 接口加 Cache Aside：先查缓存、未命中查数据源并回填 TTL，压测对比前后 QPS 与响应时间。
- [ ] 依次演练穿透/击穿/雪崩：请求不存在的 ID、手动删热点 key、批量写同 TTL 的 key 后等集体过期，再分别用空值缓存、互斥回填、TTL 抖动验证效果。
- [ ] 在 `apps/api/src/production/production.ts` 给 Redis 加健康检查与降级：Redis 不可用时接口仍能直查返回。
- [ ] 在日志里记录每次缓存命中/未命中（带 requestId），统计一段时间的命中率。
