// 导入 Node.js 内置测试和断言模块。
import test from "node:test";
import assert from "node:assert/strict";
// 导入 SSE 编码函数。
import { encodeSseEvent } from "../../../apps/api/src/sse.js";

// 验证 SSE 事件包含标准字段和空行分隔符。
test("encodeSseEvent creates a valid frame", () => {
  // 编码一个 delta 事件。
  const frame = encodeSseEvent({ type: "delta", text: "hello" }, 7);
  // 断言序号、事件名和 JSON 数据都存在。
  assert.match(frame, /^id: 7\nevent: delta\ndata: \{"type":"delta","text":"hello"\}\n\n$/);
});
