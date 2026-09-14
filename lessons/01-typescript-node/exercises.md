# 第 1 课练习

## 练习 1：自己写一个异步任务

实现：

```ts
function getModelName(): Promise<string>
```

要求 500 毫秒后返回：

```text
mock-model
```

## 练习 2：增加失败分支

增加参数：

```ts
shouldFail: boolean
```

当参数为 `true` 时抛出错误。

## 练习 3：实现超时（已完成示例）

完整实现见 `examples/async-basics.ts` 中的 `withTimeout`：

```ts
withTimeout(task, 1000)
```

如果任务超过 1 秒没有完成，就抛出：

```text
operation timed out
```

学习时先阅读实现，再删除实现，尝试自己重写；不要只复制答案。

## 练习 4：判断串行还是并行

下面两个任务分别属于哪种情况？

1. 先查询用户，再根据用户 ID 查询用户的会话：串行。
2. 同时查询用户设置和通知数量：并行。

## 练习 5：有限重试（已完成示例）

完整实现见 `examples/async-basics.ts` 中的 `withRetry`：

```ts
withRetry(task, { maxAttempts: 3, delayMs: 200 })
```

要求任务最多执行 3 次，不能无限重试。

学习时尝试修改示例，让任务第三次才成功，并观察执行次数。

## 练习 6：修改 API

把 `/echo` 的请求体读取改成一个独立的异步函数，并在读取失败时返回明确的错误。

## 完成标准

- 能独立写出 Promise。
- 能使用 `await` 等待结果。
- 能使用 `try/catch` 捕获异常。
- 能解释 `Promise.all` 为什么适合并行任务。
- 能说明什么情况下不能并行。
