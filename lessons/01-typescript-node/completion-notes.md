# 第 1 课完成笔记：异步编程与错误处理

这篇笔记回答本课的 8 个验收问题，并把它们和示例代码一一对应。

## 1. Promise 和普通字符串有什么区别？

普通字符串是现在就有的值：

```ts
const name = "mock-model";
```

`Promise<string>` 不是字符串，而是一个“未来会得到字符串”的对象：

```ts
const namePromise: Promise<string> = getModelName();
```

可以这样理解：

```text
string：现在就拿到结果
Promise<string>：以后某个时间拿到结果
```

在本课示例中：

```ts
export function getModelName(): Promise<string> {
  return delay(500).then(() => "mock-model");
}
```

调用 `getModelName()` 时，程序不会马上得到 `"mock-model"`，而是先得到 Promise。等待 500 毫秒后，这个 Promise 才会变成成功状态，并携带字符串结果。

Promise 常见的三种状态：

```text
pending   等待中
fulfilled 成功
rejected  失败
```

Promise 一旦成功或失败，就不会再次改变结果。

### AI 场景

```ts
const answerPromise = callModel(prompt);
```

这表示模型还在生成或网络请求还没有完成。真正拿到答案需要：

```ts
const answer = await callModel(prompt);
```

## 2. `await` 等待的是什么？

`await` 等待的是一个 Promise 完成：

```ts
const modelName = await getModelName();
```

执行过程：

```text
调用 getModelName
  ↓
得到 Promise
  ↓
等待 Promise fulfilled 或 rejected
  ↓
成功：得到字符串
失败：抛出错误
```

`await` 只会暂停当前 `async` 函数的后续代码，不会把整个 Node.js 进程卡死。Node.js 仍然可以处理其他事件和请求。

例如：

```ts
async function load() {
  const user = await loadUser();
  console.log(user);
}
```

这里 `console.log` 会等 `loadUser()` 完成后执行。

如果 Promise 失败：

```ts
await failingTask();
```

就相当于在这一行抛出了错误，需要由 `try/catch` 或上层调用方处理。

## 3. 什么错误会进入 `catch`？

只有“被抛出”的错误才会进入 `catch`：

```ts
try {
  throw new Error("model request failed");
} catch (error) {
  console.log("这里可以处理错误");
}
```

异步函数中的错误也会进入 `catch`：

```ts
try {
  await callModel();
} catch (error) {
  // callModel 抛出的错误会到这里。
}
```

下面这种情况不会自动进入 `catch`：

```ts
const result = { error: "failed" };
```

因为它只是一个普通对象，不是异常。

还要注意 Promise 的失败必须被等待或返回给调用方：

```ts
try {
  // await 能观察到 rejected 状态。
  await failingTask();
} catch (error) {
  // 可以捕获错误。
}
```

如果启动了一个 Promise 却完全不处理它，就可能产生未处理的 Promise rejection：

```ts
// 不推荐：启动任务后没有 await、catch 或返回。
failingTask();
```

### 业务错误和程序异常

不是所有业务失败都一定要 `throw`。例如“用户不存在”可以由服务层转换成明确的业务结果或 HTTP 404。但团队需要约定一致：

```text
可恢复、可预期的业务分支：返回明确结果或业务异常
程序无法继续、外部调用失败：抛出错误并由上层处理
```

## 4. 哪些任务可以并行？

判断标准只有一个：

> 后一个任务是否需要前一个任务的结果？

### 可以并行

两个任务互不依赖：

```ts
const [settings, notifications] = await Promise.all([
  loadSettings(),
  loadNotifications(),
]);
```

执行过程：

```text
同时开始 loadSettings 和 loadNotifications
  ↓
等待两者都完成
  ↓
一次性得到两个结果
```

总耗时通常接近较慢的那个任务，而不是两个任务耗时之和。

### 必须串行

第二个任务依赖第一个任务的结果：

```ts
const user = await loadUser();
const conversations = await loadConversations(user.id);
```

这里必须先拿到 `user.id`，才能查询会话。

### AI 场景

可以并行：

```text
同时读取用户设置和模型配置
```

必须串行：

```text
先检索知识库
→ 再把检索结果放进 Prompt
→ 再调用模型
```

## 5. 为什么模型请求需要超时？

外部模型请求可能因为这些原因迟迟不返回：

- 网络异常。
- 模型服务繁忙。
- 请求内容太大。
- 服务端故障。
- 连接没有正常关闭。
- 流式响应中途卡住。

如果没有超时，用户请求可能一直处于加载状态：

```text
用户一直等待
→ HTTP 连接占用
→ 服务资源不释放
→ 并发请求越来越多
→ 系统变慢
```

本课使用：

```ts
await withTimeout(callModel, 10_000);
```

表示最多等待 10 秒。

超时不是让底层任务一定停止，而是让当前调用方停止等待并得到明确失败。真实项目还应该结合 `AbortController` 取消底层 HTTP 请求，避免“外层超时了，内层仍然继续消耗资源”。

## 6. 为什么重试必须限制次数？

重试适合处理短暂性故障：

- 临时网络抖动。
- 连接重置。
- 服务短暂过载。
- 429 限流（需要遵守服务端提示）。

但如果无限重试：

```ts
while (true) {
  await callModel();
}
```

就会出现：

- 请求永远不结束。
- 消耗 CPU、连接和费用。
- 外部服务压力更大。
- 用户无法得到最终结果。
- 写入操作可能重复。

本课使用：

```ts
withRetry(task, { maxAttempts: 3, delayMs: 200 });
```

`maxAttempts` 是安全边界，保证任务最多执行 3 次。

### 指数退避

本课等待时间是：

```text
第一次失败后：200ms
第二次失败后：400ms
第三次失败后：不再重试
```

这是为了避免所有客户端同时立即重试，把外部服务再次压垮。

### 不是所有错误都应该重试

通常不应该重试：

- 参数校验错误。
- 权限错误。
- 资源不存在。
- 明确的业务拒绝。
- 会造成重复写入且没有幂等保障的操作。

## 7. 为什么成功或失败后都要 `clearTimeout`？

`setTimeout` 会创建一个计时器。即使任务已经成功，如果不清除计时器，它仍然会在未来触发。

本课的逻辑是：

```ts
const timer = setTimeout(() => reject(new Error("operation timed out")), timeoutMs);

void task().then(
  (value) => {
    clearTimeout(timer);
    resolve(value);
  },
  (error) => {
    clearTimeout(timer);
    reject(error);
  },
);
```

### 任务先成功

```text
任务成功
  ↓
clearTimeout
  ↓
resolve 结果
  ↓
计时器不会再触发
```

### 任务先失败

```text
任务失败
  ↓
clearTimeout
  ↓
reject 错误
  ↓
计时器不会再触发
```

如果不清除计时器，可能导致：

- 不必要的回调执行。
- 长时间任务积累很多计时器。
- 测试进程无法及时退出。
- 代码出现“任务已经成功但又触发超时”的混乱日志。

`clearTimeout` 是资源清理的一部分。类似的清理还有：

```text
关闭数据库连接
取消订阅
清理事件监听器
关闭文件
取消 HTTP 请求
```

## 8. `assert.rejects` 在测试什么？

`assert.rejects` 用来验证一个 Promise 应该失败：

```ts
await assert.rejects(
  withTimeout(slowTask, 5),
  { message: "operation timed out" },
);
```

它检查两件事：

1. 传入的异步操作确实 rejected。
2. 错误信息符合预期。

如果任务没有失败：

```text
测试失败：本来应该报错，但任务成功了
```

如果任务失败但错误信息不对：

```text
测试失败：错误原因不符合接口约定
```

它和 `assert.equal` 的区别是：

```ts
assert.equal(result, "success"); // 检查成功结果
await assert.rejects(task()); // 检查失败结果
```

### 为什么测试错误很重要

AI 应用不能只测试成功场景，还要测试：

- 模型超时。
- API Key 无效。
- 429 限流。
- 网络断开。
- 参数缺失。
- 重试次数耗尽。

如果只测试成功分支，系统上线后最容易出问题的部分反而没有保障。

---

## 本课最终记忆卡片

```text
Promise：未来的结果
await：等待 Promise 完成
throw：把失败抛给上层
catch：处理被抛出的失败
Promise.all：等待多个互不依赖的任务
Timeout：防止无限等待
Retry：有限次数恢复临时失败
clearTimeout：清理已经不需要的计时器
assert.rejects：验证异步操作应该失败
```

## 本课没有发散到什么

本课只学习异步基础和错误边界，没有进入：

- RAG。
- Agent。
- 向量数据库。
- 模型微调。
- GPU 推理。
- 消息队列。
- 复杂分布式系统。

这些内容会在后续阶段出现。本课的目的，是让你能安全地调用数据库、模型和其他外部服务。
