// 导入 Node.js 内置测试和断言。
import test from "node:test";
import assert from "node:assert/strict";
// 导入结构化输出解析工具。
import { StructuredOutputError, extractJson, isAnswer, parseStructured } from "../../../apps/api/src/structured/output.js";

// 验证可以提取带 code fence 的 JSON。
test("extractJson strips markdown fences", () => {
  const text = '```json\n{"answer":"RAG"}\n```';
  assert.equal(extractJson(text), '{"answer":"RAG"}');
});

// 验证合法结构通过校验。
test("parseStructured validates answer schema", () => {
  const value = parseStructured('{"answer":"RAG","confidence":0.9}', isAnswer);
  assert.equal(value.answer, "RAG");
});

// 验证缺少字段会抛出结构化错误。
test("parseStructured rejects missing answer", () => {
  assert.throws(() => parseStructured('{"confidence":1}', isAnswer), StructuredOutputError);
});

// 验证非 JSON 文本被拒绝。
test("parseStructured rejects plain text", () => {
  assert.throws(() => parseStructured("抱歉我不知道", isAnswer), StructuredOutputError);
});
