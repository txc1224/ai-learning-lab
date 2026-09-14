// 导入 Node.js 内置测试和断言模块。
import test from "node:test";
import assert from "node:assert/strict";
// 导入课程中的工具注册表和执行器。
import { AgentRunner, calculatorTool } from "../../../apps/api/src/agent/agent-runner.js";
import { ToolRegistry } from "../../../apps/api/src/agent/tool-registry.js";

// 验证注册的计算工具可以成功执行。
test("agent runs a registered calculator tool", async () => {
  // 创建注册表并加入白名单工具。
  const registry = new ToolRegistry();
  registry.register(calculatorTool);
  // 创建有限步执行器。
  const runner = new AgentRunner(registry, 2);
  // 执行一次合法调用。
  const state = await runner.run({ runId: "run-1", status: "running", step: 0 }, "calculator", { left: 2, right: 3 });
  // 断言状态和结果。
  assert.equal(state.status, "completed");
  assert.deepEqual(state.result, { value: 5 });
});

// 验证未注册工具不会被执行。
test("agent rejects an unregistered tool", async () => {
  // 使用空注册表创建执行器。
  const runner = new AgentRunner(new ToolRegistry());
  // 尝试调用未知工具。
  const state = await runner.run({ runId: "run-2", status: "running", step: 0 }, "shell", {});
  // 断言执行失败且错误信息明确。
  assert.equal(state.status, "failed");
  assert.equal(state.result, "tool not found: shell");
});
