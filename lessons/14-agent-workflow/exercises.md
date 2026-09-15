# 第 14 课练习

1. 设计一个 deterministic planner：数字问题选择 calculator，知识问题选择 RAG。
2. 为工具调用增加 step 记录。
3. 增加需要审批的工具并测试暂停。
4. 设计 approvalId，避免重复审批。
5. 将 tool_started/tool_finished 通过 SSE 推送。
6. 解释为什么不能让 Agent 执行任意 shell。

## 验收

- [ ] 能解释 planner、tool、state、approval。
- [ ] 能实现有限步循环。
- [ ] 能处理工具失败和恢复。
