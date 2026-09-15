# 第 9 课：结构化输出与 Provider 可靠性

## 目标

模型返回文本不等于业务拿到了可信数据。本课学习：

```text
模型文本 → 提取 JSON → 解析 → Schema 校验 → 业务使用
```

同时学习 Provider 的超时、错误分类和有限重试。

## 代码

- `apps/api/src/structured/output.ts`：JSON 提取、解析和类型校验。
- `apps/api/src/structured/provider-policy.ts`：可重试错误和指数退避。
- `apps/api/src/providers/*`：模型适配器。

## 本课边界

默认使用 MockProvider 和本地错误夹具；真实模型 smoke test 需要 API Key，不作为默认验收条件。
