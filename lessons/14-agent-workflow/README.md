# 第 14 课：Agent 决策循环、审批与运行持久化

## 目标

从“一次执行一个工具”升级为有限步工作流：

```text
planner → tool call → result → state update → next step
```

高风险工具必须进入 `waiting_approval`，不能直接执行。

## 本课边界

默认 deterministic planner 和本地白名单工具，不执行 shell、支付、邮件或生产数据修改；真实 LLM 自主工具选择需要单独 smoke test。
