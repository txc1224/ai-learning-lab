# 第 1 课代码对照表

这份对照表的作用是防止学习内容发散。每一个知识点都能在示例代码里找到对应位置。

| 课程知识点 | 示例代码 | 你要观察什么 |
|---|---|---|
| Promise 是未来的结果 | `delay` | 定时器结束后才 resolve |
| `async/await` | `runSequentially` | 后一个任务等待前一个任务 |
| 串行执行 | `runSequentially` | 两次 `await` 写在前后两行 |
| 并行执行 | `runInParallel` | 任务先调用，再交给 `Promise.all` |
| 抛出错误 | `createDelayedTask` | `throw new Error(...)` |
| 捕获错误 | `runWithErrorHandling` | `try/catch` 包住 `await` |
| 超时 | `withTimeout` | 任务和计时器谁先完成 |
| 清理计时器 | `withTimeout` | 成功或失败后都 `clearTimeout` |
| 有限重试 | `withRetry` | `maxAttempts` 保证循环结束 |
| 指数退避 | `withRetry` | 等待时间按 1、2、4 倍增长 |
| 测试成功分支 | `async-basics.test.ts` | `assert.equal` |
| 测试失败分支 | `async-basics.test.ts` | `assert.rejects` |

## 学习路线没有发散到哪里

本课明确不学习：

- RAG。
- Agent。
- 向量数据库。
- 模型微调。
- GPU 推理。
- 复杂消息队列。

这些内容会在后续课程出现。本课只建立调用这些能力必须具备的异步基础。

## 推荐阅读顺序

```text
README.md
  ↓
examples/async-basics.ts
  ↓
code-map.md
  ↓
examples/async-basics.test.ts
  ↓
exercises.md
  ↓
common-mistakes.md
  ↓
review.md
```

## 如何看代码

不要从第一行一直读到最后一行。每次只追踪一条链路：

### 链路 1：超时

```text
withTimeout
→ setTimeout
→ task().then
→ clearTimeout
→ resolve / reject
```

### 链路 2：重试

```text
withRetry
→ 第一次 task
→ catch
→ delay
→ 第二次 task
→ 成功 return
```

### 链路 3：AI 调用类比

```text
withTimeout(callModel, 10_000)
→ 模型正常返回
→ 保存消息
```

或者：

```text
withRetry(callModel, { maxAttempts: 3, delayMs: 200 })
→ 临时网络错误
→ 等待
→ 再次调用
```

## 最小记忆卡片

```text
Promise：未来结果
await：等待结果
throw：主动失败
catch：处理失败
Promise.all：等待多个独立任务
timeout：防止无限等待
retry：有限次数恢复临时失败
```
