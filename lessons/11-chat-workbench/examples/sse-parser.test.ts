// 导入 Node.js 内置测试和断言。
import test from "node:test";
import assert from "node:assert/strict";
// 导入 SSE 解析纯函数，测试文件位于课程目录，避免污染浏览器项目的类型环境。
import { drainCompleteFrames, parseSseFrame } from "../../../apps/web/src/sse-parser.js";

// 验证完整帧解析。
test("parseSseFrame reads id, event and data", () => {
  const frame = 'id: 3\nevent: delta\ndata: {"type":"delta","text":"hi"}\n';
  const parsed = parseSseFrame(frame);
  assert.equal(parsed.id, 3);
  assert.equal(parsed.event, "delta");
  assert.equal(parsed.data, '{"type":"delta","text":"hi"}');
});

// 验证半帧会保留在缓冲区，完整帧被取出。
test("drainCompleteFrames keeps partial frames", () => {
  const { frames, rest } = drainCompleteFrames('id: 1\nevent: start\ndata: {}\n\nid: 2\nev');
  assert.equal(frames.length, 1);
  assert.equal(rest, "id: 2\nev");
});
