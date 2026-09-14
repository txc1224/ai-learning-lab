# 第 7 课：Agent、Tool Calling、状态和人工确认

## 目标

把 Agent 理解成一个受约束的状态机，而不是让模型执行任意代码：

```text
输入意图 → 选择白名单工具 → 校验参数 → 执行 → 更新状态
```

## 本课实现

- `apps/api/src/agent/tool.ts`：工具契约。
- `apps/api/src/agent/tool-registry.ts`：白名单注册表。
- `apps/api/src/agent/agent-state.ts`：运行状态。
- `apps/api/src/agent/agent-runner.ts`：有限步执行器和 calculator。
- `lessons/07-agent-tools/examples/agent.ts`：独立教学示例。

接口：

```text
POST /agent/run
```

请求：

```json
{"left": 2, "right": 3}
```

## 安全边界

本课不执行 shell、支付、邮件或任意 JavaScript；高风险工具应先进入 `waiting_approval`。最大步数防止循环，参数校验防止错误输入。

## 本课边界

不接真实 LLM 自主选工具，不引入复杂 Agent 框架，不调用外部副作用 API；先理解工具、状态、失败和审批。
