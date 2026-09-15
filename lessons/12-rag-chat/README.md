# 第 12 课：RAG 接入聊天与文档管理

## 目标

把第 6 课的检索结果真正放进聊天上下文：

```text
文档输入 → 清洗/切分 → 检索 → 上下文预算 → Provider → 引用
```

当前仓库已有 `apps/api/src/rag` 纯函数和 `/rag/search` 演示；本课重点是理解检索和 ChatService 的边界，以及文档索引需要持久化。

## 本课边界

默认接受 Markdown/纯文本，不默认支持 PDF/OCR，不接真实 Embedding；文档数据库迁移和权限在后续课程继续扩展。
