# 第 7 课代码地图

| 概念 | 文件 | 重点 |
|---|---|---|
| 工具契约 | `agent/tool.ts` | validate + execute |
| 白名单 | `agent/tool-registry.ts` | 未注册工具拒绝 |
| 状态 | `agent/agent-state.ts` | running/approval/completed/failed |
| 执行器 | `agent/agent-runner.ts` | 最大步数和错误边界 |
| 安全工具 | `calculatorTool` | 不执行任意代码 |
| API | `server.ts:/agent/run` | 确定性本地调用 |

## 执行链路

```text
请求 → 查找工具 → 校验参数 → 需要审批？ → 执行 → 状态结果
```

## 不发散

本课不等于自主 Agent 产品；真实 LLM 工具选择、第三方副作用和多 Agent 编排是后续主题。
