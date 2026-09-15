// 导入 Node.js 内置测试和断言。
import test from "node:test";
import assert from "node:assert/strict";
// 导入 mock 认证工具。
import { can, parseMockAuth } from "../../../apps/api/src/runtime-auth/auth-context.js";

// 验证默认开发身份。
test("parseMockAuth falls back to dev identity", () => {
  const context = parseMockAuth(undefined);
  assert.equal(context.tenantId, "dev-tenant");
  assert.equal(context.role, "owner");
});

// 验证合法 header 解析。
test("parseMockAuth reads mock header", () => {
  const context = parseMockAuth("mock u1 t1 member");
  assert.deepEqual(context, { userId: "u1", tenantId: "t1", role: "member" });
});

// 验证非法 header 抛出错误。
test("parseMockAuth rejects invalid header", () => {
  assert.throws(() => parseMockAuth("Bearer token"), /invalid mock authorization/);
});

// 验证角色权限边界。
test("can enforces role actions", () => {
  assert.equal(can({ userId: "u", tenantId: "t", role: "viewer" }, "read"), true);
  assert.equal(can({ userId: "u", tenantId: "t", role: "viewer" }, "write"), false);
  assert.equal(can({ userId: "u", tenantId: "t", role: "member" }, "write"), true);
  assert.equal(can({ userId: "u", tenantId: "t", role: "member" }, "admin"), false);
  assert.equal(can({ userId: "u", tenantId: "t", role: "owner" }, "admin"), true);
});
