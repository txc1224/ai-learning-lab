# 第 12 课完成笔记

## 本课解决什么

RAG 不是单独的搜索页面，而是聊天请求的一部分：检索结果必须进入模型上下文，并带回可追溯引用。

## 链路

```text
文档 → chunk → retriever → context budget → ChatService → Provider
```

## 已验证与边界

现有本地清洗、切分、关键词检索和引用可运行；文档持久化、复杂格式、权限和真实 Embedding 需要后续实现。

## 不发散

不把 keyword 检索称为语义检索，不默认支持 PDF/OCR。
