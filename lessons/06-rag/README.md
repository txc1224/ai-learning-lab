# 第 6 课：RAG 知识库与引用

## 目标

让模型回答前先读取外部知识：

```text
文档 → 清洗 → 切分 → 检索 → 上下文 → Provider → 引用
```

## 本课默认实现

使用本地关键词检索，不需要 Embedding API 或向量数据库。它用于理解 RAG 的编排，不代表语义检索质量。

代码：

- `apps/api/src/rag/document-loader.ts`：文本清洗。
- `apps/api/src/rag/chunker.ts`：分片。
- `apps/api/src/rag/retriever.ts`：关键词召回。
- `apps/api/src/rag/citation-builder.ts`：来源引用。

接口：

```text
POST /rag/search
```

请求：

```json
{
  "source": "lesson.md",
  "text": "RAG 是先检索知识再生成回答。",
  "query": "什么是 RAG"
}
```

## 关键区别

- 关键词检索：匹配字面词。
- 向量检索：匹配语义相似度。
- 生成质量：模型如何利用上下文。
- 召回质量：检索是否找到了正确分片。

## 本课边界

不默认安装 LangChain、LlamaIndex、Embedding SDK、pgvector 或托管向量库；真实语义召回作为后续升级。
