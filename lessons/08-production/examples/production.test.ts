// 导入 Node.js 内置测试和断言模块。
import test from "node:test";
import assert from "node:assert/strict";
// 导入生产化基础能力。
import { createRequestContext, RateLimiter, UsageMeter } from "../../../apps/api/src/production/production.js";

// 验证请求上下文会生成可追踪 ID。
test("request context creates a request id", () => {
  // 传入空白 ID，应该生成新 ID。
  const context = createRequestContext("   ");
  // 断言结果是非空字符串。
  assert.equal(typeof context.requestId, "string");
  assert.ok(context.requestId.length > 0);
});

// 验证固定窗口限流。
test("rate limiter blocks requests after the limit", () => {
  // 创建每秒最多两个请求的限流器。
  const limiter = new RateLimiter(2, 1000);
  // 前两个请求通过。
  assert.equal(limiter.allow("tenant-1", 100), true);
  assert.equal(limiter.allow("tenant-1", 200), true);
  // 第三个请求被拒绝。
  assert.equal(limiter.allow("tenant-1", 300), false);
  // 新窗口重新允许请求。
  assert.equal(limiter.allow("tenant-1", 1200), true);
});

// 验证不同租户的 usage 相互隔离。
test("usage meter keeps tenant totals separate", () => {
  // 创建计量器。
  const meter = new UsageMeter();
  // 为两个租户分别记录 token。
  meter.record("tenant-a", 100, 1);
  meter.record("tenant-b", 200, 1);
  // 断言累计值没有串租户。
  assert.deepEqual(meter.get("tenant-a"), { tokens: 100, cost: 0.1 });
  assert.deepEqual(meter.get("tenant-b"), { tokens: 200, cost: 0.2 });
});
