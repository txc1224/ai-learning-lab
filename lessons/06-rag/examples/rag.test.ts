// 导入 Node.js 内置测试和断言模块。
import test from "node:test";
import assert from "node:assert/strict";
// 导入本课的切分和检索函数。
import { chunkDocument } from "./chunker.js";
import { buildContext, retrieveByKeyword } from "./keyword-retriever.js";

// 验证长文档会被切成多个带元数据的分片。
test("chunkDocument keeps source metadata", () => {
  // 构造超过单分片长度的文本。
  const chunks = chunkDocument("doc-1", "lesson.md", "RAG retrieves knowledge.\n\nRAG builds context.", 20);
  // 断言确实产生了多个分片。
  assert.ok(chunks.length > 1);
  // 断言来源和顺序被保留。
  assert.equal(chunks[0].source, "lesson.md");
  assert.equal(chunks[0].index, 0);
});

// 验证关键词检索会优先返回命中结果。
test("retrieveByKeyword ranks matching chunks", () => {
  // 准备两个不同主题的分片。
  const chunks = chunkDocument("doc-1", "lesson.md", "RAG retrieves knowledge.\n\nAgent calls tools.", 200);
  // 查询 RAG 主题。
  const hits = retrieveByKeyword(chunks, "RAG knowledge");
  // 断言只命中相关内容。
  assert.equal(hits.length, 1);
  assert.ok(hits[0].score > 0);
});

// 验证无命中时上下文为空。
test("buildContext returns empty text without hits", () => {
  // 传入空命中列表。
  assert.equal(buildContext([]), "");
});
