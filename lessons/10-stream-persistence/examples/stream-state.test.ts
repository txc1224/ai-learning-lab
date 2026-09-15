// 导入 Node.js 内置测试和断言。
import test from "node:test";
import assert from "node:assert/strict";
// 导入流状态存储。
import { StreamStateStore } from "../../../apps/api/src/streaming/stream-state.js";

// 验证幂等键返回同一条记录。
test("stream store is idempotent", () => {
  const store = new StreamStateStore();
  const base = { idempotencyKey: "k1", conversationId: "c1", messageId: "m1", state: "pending" as const, content: "", lastEventId: 0 };
  const first = store.create(base);
  const second = store.create({ ...base, messageId: "m2" });
  assert.equal(first, second);
  assert.equal(first.messageId, "m1");
});

// 验证 delta 追加内容并推进状态和序号。
test("stream store appends deltas", () => {
  const store = new StreamStateStore();
  store.create({ idempotencyKey: "k2", conversationId: "c1", messageId: "m1", state: "pending" as const, content: "", lastEventId: 0 });
  const record = store.append("k2", "你好", 1);
  assert.equal(record.state, "streaming");
  assert.equal(record.content, "你好");
  assert.equal(record.lastEventId, 1);
});

// 验证完成状态。
test("stream store completes a record", () => {
  const store = new StreamStateStore();
  store.create({ idempotencyKey: "k3", conversationId: "c1", messageId: "m1", state: "pending" as const, content: "", lastEventId: 0 });
  store.append("k3", "答案", 2);
  const record = store.complete("k3");
  assert.equal(record.state, "completed");
});
