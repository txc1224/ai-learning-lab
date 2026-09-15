# 第 9 课代码地图

| 概念 | 文件 | 重点 |
|---|---|---|
| JSON 提取 | `apps/api/src/structured/output.ts` | code fence 和前后解释文本 |
| Schema 校验 | `isAnswer` | 运行时不信任模型输出 |
| 重试判断 | `provider-policy.ts` | 只重试 retryable 错误 |
| 指数退避 | `retryProvider` | 有限且可观察 |
| Provider | `apps/api/src/providers` | 配置和上游错误 |

本课不发散到真实模型质量和完整 JSON Schema 框架。
