// 导入 Node.js 内置测试和断言模块。
import test from "node:test";
import assert from "node:assert/strict";
// 导入本地 Provider。
import { MockProvider } from "../../../apps/api/src/providers/mock-provider.js";

// 验证 mock provider 会使用系统消息和最后一条用户消息。
test("mock provider builds a deterministic answer", async () => {
  // 创建本地 provider。
  const provider = new MockProvider();
  // 调用完整生成。
  const result = await provider.generate({ model: "mock-model", messages: [
    { role: "system", content: "be concise" },
    { role: "user", content: "What is RAG?" },
  ] });
  // 断言结果带有 mock 标识和用户问题。
  assert.match(result.text, /mock-provider/);
  assert.match(result.text, /What is RAG/);
  assert.ok(result.usage.totalTokens > 0);
});

// 验证已取消的请求不会继续生成。
test("mock provider rejects an aborted request", async () => {
  // 创建已经取消的信号。
  const controller = new AbortController();
  controller.abort();
  // 创建 provider。
  const provider = new MockProvider();
  // 捕获错误，验证稳定的错误码和错误信息。
  await assert.rejects(
    provider.generate({ model: "mock-model", messages: [{ role: "user", content: "hello" }], signal: controller.signal }),
    (error: unknown) => {
      // 用结构字段验证行为，避免依赖跨模块类身份。
      return typeof error === "object" && error !== null && "code" in error && error.code === "cancelled";
    },
  );
});
