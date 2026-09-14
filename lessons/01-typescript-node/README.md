# 第 1 课：TypeScript 异步编程与错误处理

## 为什么现在学习这一课

AI 应用几乎所有关键动作都是异步的：

```text
接收请求
→ 查询数据库
→ 调用模型
→ 等待模型返回
→ 保存消息
→ 返回结果
```

如果你不理解 Promise、`async/await` 和错误处理，后面会遇到：

- 接口一直加载不结束。
- 错误没有被捕获。
- 一个请求失败导致服务崩溃。
- 多个异步任务执行顺序错误。
- 重试时产生重复数据。

## 本课目标

完成本课后，你应该能够：

- 解释同步和异步的区别。
- 解释 Promise 的三种状态。
- 使用 `async/await` 编写异步函数。
- 使用 `try/catch` 处理预期错误。
- 区分“返回错误”和“抛出错误”。
- 理解 `Promise.all` 和串行执行的区别。
- 为外部 API 调用设计超时和重试边界。

## 推荐学习顺序

1. 先读本课概念。
2. 运行 `examples/async-basics.ts`。
3. 运行 `examples/async-basics.test.ts`，确认成功和失败分支都有测试。
4. 阅读“代码对照表”，把每个课程概念对应到代码。
5. 不看代码，自己重写一个异步任务。
6. 完成 `exercises.md`。
7. 再阅读 `common-mistakes.md`。

## 运行示例和测试

在仓库根目录执行：

```bash
# 运行课程示例。
pnpm --filter @ai-learning-lab/api exec tsx ../../lessons/01-typescript-node/examples/async-basics.ts

# 使用 tsx 运行 TypeScript 测试文件。
pnpm --filter @ai-learning-lab/api exec tsx --test ../../lessons/01-typescript-node/examples/async-basics.test.ts
```

为什么测试不能直接使用 `node --test`？因为 Node.js 原生只能直接理解 JavaScript，`tsx` 负责把 TypeScript 文件转换成 Node.js 可以执行的形式。

## 核心心智模型

### Promise 是未来的结果

```ts
const result: Promise<string> = fetchUserName();
```

这不是一个字符串，而是“未来会得到字符串”的承诺。

### `await` 会等待结果

```ts
const name = await fetchUserName();
```

`await` 只能出现在 `async` 函数中，它会等待 Promise 完成，然后拿到最终值。

### `try/catch` 捕获失败

```ts
try {
  const result = await callExternalService();
} catch (error) {
  // 处理失败。
}
```

只有“被抛出的错误”才会进入 `catch`。如果函数只是返回 `{ error: ... }`，它不会自动进入 `catch`。

## 课程完成笔记

- [8 个问题完成笔记](./completion-notes.md)：Promise、`await`、`catch`、并行、超时、重试、计时器清理和 `assert.rejects`。
- [代码对照表](./code-map.md)：把课程概念对应到可运行代码，并标注本课学习边界。

## AI 场景中的对应关系

```ts
try {
  const answer = await llm.generate({ prompt });
  await messageRepository.save(answer);
} catch (error) {
  logger.error(error);
  // 返回可理解的错误，不把内部堆栈暴露给用户。
}
```

实际项目中还要补充：

- 超时。
- 重试次数上限。
- 指数退避。
- 请求取消。
- 幂等处理。
- Token 和耗时记录。

## 本课验收

- 能说明 `Promise` 和普通返回值的区别。
- 能写出一个成功和失败都可观察的异步函数。
- 能说出什么时候可以并行，什么时候必须串行。
- 能解释为什么外部模型调用不能无限等待。
