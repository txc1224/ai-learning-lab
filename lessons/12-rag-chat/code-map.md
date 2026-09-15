# 第 12 课代码地图

| 概念 | 现有代码 | 重点 |
|---|---|---|
| 文档清洗 | `apps/api/src/rag/document-loader.ts` | 输入标准化 |
| 切分 | `apps/api/src/rag/chunker.ts` | chunk 元数据 |
| 检索 | `apps/api/src/rag/retriever.ts` | keyword fallback |
| 引用 | `citation-builder.ts` | source/chunk |
| 聊天编排 | `apps/api/src/chat-service.ts` | 可注入上下文 |

本课重点是把 RAG 作为 ChatService 的前置步骤，不把检索逻辑写到 Provider 内。
