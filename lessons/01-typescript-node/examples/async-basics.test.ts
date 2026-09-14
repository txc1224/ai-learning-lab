// 导入 Node.js 内置测试能力，不需要额外测试框架。
import test from "node:test";
// 导入 Node.js 内置断言能力。
import assert from "node:assert/strict";
// 导入本课要验证的异步工具。
import { createDelayedTask, getModelName, withRetry, withTimeout } from "./async-basics.js";

// 验证异步任务最终能够返回结果。
test("getModelName resolves the mock model name", async () => {
  // 等待模拟模型配置读取完成。
  const modelName = await getModelName();
  // 断言返回值符合约定。
  assert.equal(modelName, "mock-model");
});

// 验证超时工具会拒绝执行过慢的任务。
test("withTimeout rejects a slow task", async () => {
  // 创建一个 40 毫秒后才完成的任务。
  const slowTask = createDelayedTask("slow task", 40);
  // 断言调用会因 5 毫秒超时而失败。
  await assert.rejects(withTimeout(slowTask, 5), { message: "operation timed out" });
});

// 验证超时工具不会改变正常任务的结果。
test("withTimeout returns a fast task result", async () => {
  // 创建一个 1 毫秒后完成的任务。
  const fastTask = createDelayedTask("fast task", 1);
  // 等待任务在超时之前完成。
  const result = await withTimeout(fastTask, 100);
  // 断言原始结果被正确保留。
  assert.equal(result, "fast task completed");
});

// 验证重试会在临时失败后继续尝试。
test("withRetry retries a temporary failure", async () => {
  // 记录任务被调用的次数。
  let attempts = 0;

  // 定义第二次执行才成功的任务。
  const task = async (): Promise<string> => {
    // 每调用一次就增加次数。
    attempts += 1;
    // 第一次执行模拟临时错误。
    if (attempts === 1) {
      throw new Error("temporary failure");
    }
    // 第二次执行返回正常结果。
    return "success";
  };

  // 使用最多三次尝试执行任务。
  const result = await withRetry(task, { maxAttempts: 3, delayMs: 1 });
  // 断言最终成功。
  assert.equal(result, "success");
  // 断言确实只执行了两次。
  assert.equal(attempts, 2);
});

// 验证达到最大次数后会停止重试并抛出错误。
test("withRetry stops after max attempts", async () => {
  // 记录任务执行次数。
  let attempts = 0;
  // 定义一个永远失败的任务。
  const task = async (): Promise<string> => {
    // 每次执行增加次数。
    attempts += 1;
    // 始终抛出失败。
    throw new Error("permanent failure");
  };

  // 断言三次失败后抛出最后一个错误。
  await assert.rejects(withRetry(task, { maxAttempts: 3, delayMs: 1 }), { message: "permanent failure" });
  // 断言没有进行第四次尝试。
  assert.equal(attempts, 3);
});
