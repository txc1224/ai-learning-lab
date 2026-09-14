# 第 6 课代码地图

| 概念 | 文件 | 重点 |
|---|---|---|
| 文本清洗 | `rag/document-loader.ts` | 统一换行和空白 |
| Chunk | `rag/chunker.ts` | 保留 documentId/source/index |
| 关键词召回 | `rag/retriever.ts` | score、排序、limit |
| 上下文拼装 | `buildContext` | 来源标记进入 Prompt |
| 引用 | `rag/citation-builder.ts` | 返回 source 与 chunkIndex |
| API | `server.ts:/rag/search` | 本地 JSON 输入输出 |

## 链路

```text
输入文本 → loadDocument → chunkDocument → retrieveByKeyword → buildContext
```

## 不发散

本课不把关键词 mock 说成向量检索；不默认接真实 Embedding、云向量库或复杂文档格式。
