# 第 10 课完成笔记

## 本课解决什么

流式回答必须可追踪、可恢复和不重复写入。状态机是比单个布尔 loading 更可靠的模型。

## 状态链路

```text
pending → streaming → completed
                 ↘ failed / cancelled
```

`idempotencyKey` 保证客户端重复提交不会创建两条任务；`lastEventId` 为恢复提供位置线索。

## 与工作台的关系

第 5 课只把 delta 发到浏览器，本课补充“生成过程本身也要有持久化状态”的思路。真实实现应把内存 store 替换成 PostgreSQL Repository。

## 已验证

内存状态创建、幂等、增量和完成状态可本地验证；真实数据库迁移、断线恢复和多实例一致性需要额外环境。

## 不发散

不实现分布式事件总线、复杂代理缓冲和跨区域恢复。
