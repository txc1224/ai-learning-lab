# 第 13 课：Embedding 与向量检索

## 目标

理解向量检索的抽象，而不是先绑定某一个向量数据库：

```text
Embedder → VectorStore → cosine similarity → top-k
```

代码：

- `apps/api/src/vector/fake-embedder.ts`：确定性 Fake Embedder。
- `apps/api/src/vector/vector-store.ts`：内存 VectorStore 和余弦检索。

## 边界

Fake embedding 只验证接口、维度和相似度计算，不代表真实语义质量；pgvector、托管向量库和真实 Embedding 作为可选 smoke test。
