# 第 11 课完成笔记

## 本课解决什么

把后端能力变成真实可操作的聊天界面。前端状态必须对应后端状态，而不是只显示一个 loading。

## 核心链路

```text
加载会话 → 选择会话 → 发送消息 → optimistic UI → 读取 SSE delta → 追加文本 → 刷新历史
```

## 关键状态

- `current`：当前会话和消息。
- `loading`：是否正在生成。
- `controller`：当前请求的取消控制器。
- `error`：可展示错误。

## 与工作台关系

这是第 3～10 课后第一次把数据库、Provider 和 SSE 连接到用户界面。

## 已验证与边界

Vite/TypeScript 构建可验证；真实 PostgreSQL 和 API 运行需要后端依赖可用。当前页面是学习型工作台，不包含登录、复杂 Markdown 和生产级缓存。
