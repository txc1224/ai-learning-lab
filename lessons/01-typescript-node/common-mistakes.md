# 常见错误

## 1. 忘记 await

错误：

```ts
const result = loadUser();
console.log(result);
```

这里打印的是 Promise，不是用户数据。

正确：

```ts
const result = await loadUser();
console.log(result);
```

## 2. 忘记 async

错误：

```ts
function load() {
  const result = await loadUser();
}
```

`await` 所在函数需要声明为 `async`。

## 3. catch 不会捕获普通错误对象

下面的代码不会进入 catch：

```ts
const result = { error: "failed" };
```

只有下面这种抛出才会进入 catch：

```ts
throw new Error("failed");
```

## 4. 不要无上限重试

错误做法：

```ts
while (true) {
  await callModel();
}
```

外部服务持续失败时，这会让请求永远不结束。

推荐设置：

- 最大重试次数。
- 每次重试等待时间。
- 总超时时间。
- 不可重试的错误类型。

## 5. 不要无脑使用 Promise.all

如果第二个任务依赖第一个任务的结果，就不能并行：

```ts
const user = await loadUser();
const conversations = await loadConversations(user.id);
```

只有任务之间互不依赖时，才适合：

```ts
const [settings, notices] = await Promise.all([
  loadSettings(),
  loadNotices(),
]);
```

## 6. 不要把内部错误原样返回给用户

错误堆栈可能包含：

- 文件路径。
- 数据库地址。
- API Key 片段。
- 内部服务名称。

日志可以保留详细错误，响应应该返回安全的业务提示。
