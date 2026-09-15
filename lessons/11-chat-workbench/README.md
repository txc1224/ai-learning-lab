# 第 11 课：React AI 对话工作台

## 目标

把前面课程的 API 变成可操作的前端产品：

- 会话列表。
- 新建和切换会话。
- 消息展示。
- SSE 流式追加。
- 停止生成。
- 错误提示。
- 刷新后恢复历史。

## 代码

- `apps/web/src/main.tsx`：工作台状态与界面。
- `apps/web/src/api-client.ts`：会话和流式 API。
- `apps/web/src/style.css`：响应式布局。

## 本课边界

默认连接本地 API 和 MockProvider，不接登录、复杂组件库、多标签同步和真实模型。
