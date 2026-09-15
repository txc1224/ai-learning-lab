// 导入 Node.js 内置测试和断言。
import test from "node:test";
import assert from "node:assert/strict";
// 导入 Fake Embedder 和向量库。
import { FakeEmbedder, cosineSimilarity } from "../../../apps/api/src/vector/fake-embedder.js";
import { InMemoryVectorStore } from "../../../apps/api/src/vector/vector-store.js";

// 验证 Fake Embedder 输出固定维度。
test("fake embedder returns fixed dimensions", async () => {
  const embedder = new FakeEmbedder();
  const vector = await embedder.embed("RAG 检索");
  assert.equal(vector.length, embedder.dimensions);
});

// 验证相同文本得到相同向量。
test("fake embedder is deterministic", async () => {
  const embedder = new FakeEmbedder();
  const left = await embedder.embed("向量检索");
  const right = await embedder.embed("向量检索");
  assert.deepEqual(left, right);
});

// 验证余弦相似度的方向性。
test("cosineSimilarity ranks identical text highest", () => {
  const vector = [0.5, 0.5, 0, 0, 0, 0, 0, 0];
  const same = [0.5, 0.5, 0, 0, 0, 0, 0, 0];
  const other = [0, 0, 0.5, 0.5, 0, 0, 0, 0];
  assert.ok(cosineSimilarity(vector, same) > cosineSimilarity(vector, other));
});

// 验证内存向量库的 top-k。
test("in-memory vector store returns top-k", async () => {
  const embedder = new FakeEmbedder();
  const store = new InMemoryVectorStore();
  const records = [
    { id: "1", content: "RAG 检索知识", source: "doc-a", vector: await embedder.embed("RAG 检索知识") },
    { id: "2", content: "Agent 调用工具", source: "doc-b", vector: await embedder.embed("Agent 调用工具") },
  ];
  await store.upsert(records);
  const queryVector = await embedder.embed("RAG 检索");
  const hits = await store.search(queryVector, 1);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "1");
});
