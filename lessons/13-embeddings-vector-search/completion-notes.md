# 第 13 课完成笔记

## 本课解决什么

向量检索的关键不是先选数据库，而是先定义 `Embedder` 和 `VectorStore` 边界。

## 链路

```text
文本 → Embedder → vector → VectorStore → cosine similarity → top-k
```

## Fake Embedder 的边界

确定性字符哈希可以测试维度、写入、查询和排序，但不能证明同义词语义相似。真实语义质量必须使用真实模型和评估集验证。

## 与 RAG 的关系

第 12 课使用 keyword fallback；本课增加可替换向量策略。最终 RAG 应支持 keyword、vector 或 hybrid，而不是把检索实现绑死在 ChatService。

## 已验证与边界

内存向量库和余弦计算可以本地测试；pgvector、真实 Embedding 和大规模索引未验证。
