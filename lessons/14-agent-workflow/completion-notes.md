# 第 14 课完成笔记

## 本课解决什么

真正的 Agent 不是一次工具调用，而是有限步、有状态、可审批、可恢复的工作流。

## 关键状态

```text
running → waiting_approval → running → completed
                         ↘ failed
```

## 安全边界

ToolRegistry 只允许白名单工具；参数先校验；高风险动作先审批；maxSteps 防无限循环。真实 LLM 自主选工具不属于默认本地验收。

## 与 RAG/SSE 的关系

RAG 可以是只读工具；Agent 状态和工具结果可以通过 SSE 推给前端；但每个工具仍由程序执行和审计。

## 已验证与边界

现有单步白名单 runner 可测试；多步骤 planner、审批持久化和恢复接口是后续实现重点。
