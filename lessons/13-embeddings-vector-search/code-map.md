# 第 13 课代码地图

| 概念 | 文件 | 重点 |
|---|---|---|
| Embedder | `apps/api/src/vector/fake-embedder.ts` | 可替换接口 |
| 向量 | `FakeEmbedder.embed` | 固定维度教学向量 |
| 相似度 | `cosineSimilarity` / store 内部 cosine | 维度和零向量边界 |
| VectorStore | `apps/api/src/vector/vector-store.ts` | upsert/search |
| Top-k | `InMemoryVectorStore.search` | 排序和数量限制 |

Fake embedding 只验证接口和算法，不代表语义召回质量。
