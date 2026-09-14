# 第 0 课补充：HTTP 请求进入 API，以及原生 Node.js 与 Koa 对比

## 学习目标

完成本课后，你应该可以回答：

1. 请求是如何进入 API 的？
2. `response.writeHead` 做了什么？
3. `response.end` 做了什么？
4. `interface HealthResponse` 的作用是什么？
5. 接口报错时，应该从哪里开始排查？
6. Koa 为什么可以直接使用 `ctx.request.body`？

---

## 一、先建立完整请求链路

用户在浏览器中访问：

```text
http://localhost:3001/health
```

一次请求大致经过下面这些步骤：

```text
浏览器
  ↓
DNS / IP / TCP 连接
  ↓
发送 HTTP 请求
  ↓
Node.js HTTP Server
  ↓
createServer 回调
  ↓
根据 method + url 匹配路由
  ↓
执行业务逻辑
  ↓
设置状态码和响应头
  ↓
写入响应体
  ↓
结束响应
  ↓
浏览器收到结果
```

在当前项目中，最关键的入口是：

```ts
const server = createServer(async (request, response) => {
  // 每收到一个 HTTP 请求，Node.js 就会调用这里。
});
```

可以把它理解成：

> `createServer` 创建一个服务；每当有请求到达，Node.js 就把请求对象和响应对象交给这个回调函数。

---

## 二、问题 1：请求是如何进入 API 的？

### 1. `server.listen` 开始监听端口

```ts
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
```

如果 `port` 是 `3001`，Node.js 就会监听：

```text
127.0.0.1:3001
```

这表示操作系统会把发往 3001 端口的请求交给这个 Node.js 进程。

### 2. 客户端发送 HTTP 请求

执行：

```bash
curl http://127.0.0.1:3001/health
```

可以抽象成：

```http
GET /health HTTP/1.1
Host: 127.0.0.1:3001
```

这里有几个重要部分：

- `GET`：请求方法。
- `/health`：请求路径。
- `Host`：请求的目标主机和端口。

### 3. Node.js 创建两个对象

Node.js 收到请求后，会把信息放进两个对象：

```ts
(request, response) => {
  // request：客户端发来的请求。
  // response：服务器要返回给客户端的响应。
}
```

`request` 中包含：

```ts
request.method; // GET、POST 等
request.url; // /health、/echo 等
request.headers; // Content-Type、Authorization 等
```

`response` 用来控制：

```ts
response.statusCode; // 状态码
response.setHeader(...); // 响应头
response.write(...); // 写响应内容
response.end(...); // 结束响应
```

### 4. 代码判断路由

当前项目使用最基础的条件判断：

```ts
if (request.method === "GET" && request.url === "/health") {
  // 处理 GET /health。
}
```

这句话只有在下面两个条件同时满足时才进入：

```text
请求方法是 GET
请求路径是 /health
```

如果访问：

```text
POST /health
```

或者：

```text
GET /unknown
```

都不会进入这个分支。

---

## 三、问题 2：`response.writeHead` 做了什么？

代码：

```ts
response.writeHead(200);
```

它主要用于发送 HTTP 响应头，其中包括：

- HTTP 状态码。
- 响应头字段。
- 响应头发送时机。

### 1. 状态码是什么？

`200` 的意思是：

```text
请求成功
```

常见状态码：

| 状态码  | 含义       | 常见场景              |
| ------- | ---------- | --------------------- |
| `200` | 成功       | 查询或处理成功        |
| `201` | 创建成功   | 新增用户、创建会话    |
| `400` | 请求错误   | 参数缺失、JSON 错误   |
| `401` | 未认证     | 没有登录或 Token 无效 |
| `403` | 无权限     | 已登录但没有权限      |
| `404` | 不存在     | 路径或资源不存在      |
| `500` | 服务端错误 | 未处理的代码异常      |

### 2. 也可以同时设置响应头

当前代码先设置了 JSON 响应头：

```ts
response.setHeader("Content-Type", "application/json; charset=utf-8");
```

也可以写成：

```ts
response.writeHead(200, {
  "Content-Type": "application/json; charset=utf-8",
});
```

两种方式都可以。当前代码拆开写，是为了更容易看到“先设置响应头，再发送响应”的过程。

### 3. 响应头为什么重要？

如果返回的是 JSON，却没有声明：

```http
Content-Type: application/json
```

客户端可能无法正确判断响应内容是什么格式。

常见 Content-Type：

```text
application/json       JSON
text/plain             普通文本
text/html              HTML
text/event-stream      SSE 流式响应
multipart/form-data    文件上传
```

### 4. 注意：响应头只能发送一次

下面这样是错误思路：

```ts
response.writeHead(200);
response.writeHead(400);
```

响应头一旦发送，就不能再次修改状态码。实际项目中要确保：

- 一个请求只返回一次。
- `response.end` 后不要继续写响应。
- 每个分支返回后及时 `return`。

---

## 四、问题 3：`response.end` 做了什么？

代码：

```ts
response.end(JSON.stringify(body));
```

它做两件事：

1. 把最后一段响应内容写给客户端。
2. 告诉 Node.js：这个响应已经结束。

### 1. `JSON.stringify` 做了什么？

JavaScript 对象：

```ts
const body = {
  status: "ok",
  version: "0.1.0",
};
```

HTTP 响应体通常需要字符串或 Buffer，所以要转换：

```ts
JSON.stringify(body);
```

结果是：

```json
{"status":"ok","version":"0.1.0"}
```

### 2. `end` 和 `write` 的区别

可以先写，再结束：

```ts
response.write("第一段");
response.write("第二段");
response.end("最后一段");
```

客户端最终收到：

```text
第一段第二段最后一段
```

也可以直接结束并携带内容：

```ts
response.end("完整响应");
```

### 3. 为什么不能只调用 `write`？

如果只写：

```ts
response.write("hello");
```

但不调用：

```ts
response.end();
```

客户端可能会一直等待，因为它不知道响应是否已经完整结束。

所以普通接口必须最终调用：

```ts
response.end(...);
```

### 4. `end` 和 AI 流式输出的关系

普通接口：

```text
准备完整结果
  ↓
response.end(完整结果)
```

流式接口：

```text
response.write(第一段)
response.write(第二段)
response.write(第三段)
response.end()
```

这也是 AI 对话中“边生成边展示”的底层基础之一。

---

## 五、问题 4：`interface HealthResponse` 的作用是什么？

代码：

```ts
export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}
```

它是 TypeScript 的接口定义，用于描述一个对象应该有哪些字段、每个字段是什么类型。

### 1. 它约束了 API 返回对象

```ts
const body: HealthResponse = {
  status: "ok",
  service: "ai-learning-lab-api",
  version,
  environment,
  timestamp: new Date().toISOString(),
};
```

如果漏掉字段：

```ts
const body: HealthResponse = {
  status: "ok",
};
```

TypeScript 会报错，因为缺少：

```text
service
version
environment
timestamp
```

如果字段类型错误：

```ts
const body: HealthResponse = {
  status: "error",
  service: "ai-learning-lab-api",
  version,
  environment,
  timestamp: new Date().toISOString(),
};
```

TypeScript 也会报错，因为 `status` 只能是：

```ts
"ok"
```

### 2. 它解决前后端字段漂移

没有共享类型时，后端可能返回：

```json
{
  "service_name": "api"
}
```

前端却按照：

```ts
health.service
```

来读取，最终得到 `undefined`。

共享类型可以让前后端使用同一份契约：

```text
packages/shared/src/index.ts
        ↓
apps/api 使用
        ↓
apps/web 使用
```

### 3. 它只在编译阶段生效

非常重要：`interface` 不会在运行时自动校验请求数据。

例如：

```ts
interface User {
  name: string;
}

const data: User = JSON.parse(input);
```

这并不代表外部输入真的有 `name`，因为 `JSON.parse` 的结果可能是任意数据。

对于外部输入，仍然要做运行时校验：

```ts
const parsedBody: unknown = JSON.parse(rawBody);

if (typeof parsedBody !== "object" || parsedBody === null) {
  // 拒绝不符合格式的数据。
}
```

可以记住：

```text
interface：保护我们写代码时的类型一致性
运行时校验：保护服务运行时面对的不可信输入
```

---

## 六、问题 5：接口报错时从哪里开始排查？

不要一看到错误就直接改代码。按照请求链路逐层排查。

### 第 1 层：服务有没有启动

检查进程输出：

```bash
pnpm --filter @ai-learning-lab/api dev
```

应该看到：

```text
API listening on http://localhost:3001
```

如果没有，常见原因：

- 依赖没有安装。
- TypeScript 编译失败。
- 端口已经被占用。
- 启动命令写错。

检查端口：

```bash
lsof -i :3001
```

### 第 2 层：请求地址是否正确

当前接口地址是：

```text
http://127.0.0.1:3001/health
```

常见错误：

```text
3000 和 3001 端口写错
/health 和 /api/health 路径写错
localhost 和远程服务器地址混淆
```

### 第 3 层：请求方法是否正确

健康检查要求：

```text
GET /health
```

如果发送：

```text
POST /health
```

就不会匹配当前分支。

Echo 要求：

```text
POST /echo
```

### 第 4 层：请求头是否正确

JSON 请求应该带：

```http
Content-Type: application/json
```

curl 示例：

```bash
curl -X POST http://127.0.0.1:3001/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'
```

### 第 5 层：请求体是否是合法 JSON

合法：

```json
{"message":"你好"}
```

非法：

```text
{message: 你好}
```

JSON 要求：

- 字段名使用双引号。
- 字符串使用双引号。
- 不能出现多余逗号。

### 第 6 层：看 HTTP 状态码

```bash
curl -i http://127.0.0.1:3001/health
```

`-i` 会把响应头也打印出来。

重点看：

```text
HTTP/1.1 200 OK
HTTP/1.1 400 Bad Request
HTTP/1.1 404 Not Found
HTTP/1.1 500 Internal Server Error
```

### 第 7 层：看服务端日志

可以临时在路由入口打印：

```ts
console.log({ method: request.method, url: request.url });
```

在 echo 解析前打印：

```ts
console.log({ rawBody });
```

排查结束后，要删除无用日志，或者改成正式日志。

### 第 8 层：确认是否重复返回

下面的代码可能导致问题：

```ts
if (someError) {
  response.writeHead(400);
  response.end(JSON.stringify({ error: "bad request" }));
}

response.writeHead(200);
response.end(JSON.stringify({ ok: true }));
```

错误分支返回后必须：

```ts
return;
```

### 推荐排查顺序

```text
服务启动
→ 地址和端口
→ method 和 path
→ headers
→ body
→ status code
→ 服务端日志
→ 数据库 / 外部服务
```

---

## 七、Koa 是如何处理同一个请求的？

Koa 不是完全替代 Node.js，它是在 Node.js HTTP 能力之上提供了：

- 中间件机制。
- `ctx` 上下文对象。
- 更简单的响应设置方式。
- 更清晰的异步控制流程。

Koa 底层仍然需要创建 HTTP Server，核心关系可以理解为：

```ts
http.createServer(app.callback());
```

你平时写：

```ts
app.listen(3000);
```

Koa 内部会帮你完成类似的事情。

---

## 八、原生 Node.js 实现 `/echo`

当前项目中的核心写法是：

```ts
const server = createServer(async (request, response) => {
  // 设置返回 JSON 的响应头。
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  // 判断请求方法和路径。
  if (request.method === "POST" && request.url === "/echo") {
    try {
      // 手动读取请求流。
      const rawBody = await readRequestBody(request);
      // 手动解析 JSON。
      const parsedBody: unknown = JSON.parse(rawBody || "{}");
      // 从未知数据中安全地取出 message。
      const message = typeof parsedBody === "object" && parsedBody !== null && "message" in parsedBody
        ? parsedBody.message
        : undefined;

      // 手动进行业务校验。
      if (typeof message !== "string" || message.trim().length === 0) {
        response.writeHead(400);
        response.end(JSON.stringify({ error: "message is required" }));
        return;
      }

      // 手动返回 JSON 响应。
      response.writeHead(200);
      response.end(JSON.stringify({ message }));
    } catch {
      // 手动处理非法 JSON。
      response.writeHead(400);
      response.end(JSON.stringify({ error: "request body must be valid JSON" }));
    }
    return;
  }
});
```

你需要自己完成：

```text
读取流
→ 合并 Buffer
→ 转字符串
→ JSON.parse
→ 运行时校验
→ 设置状态码
→ 序列化响应
→ 结束响应
```

---

## 九、Koa + `koa-bodyparser` 实现 `/echo`

安装依赖：

```bash
pnpm add koa @koa/router koa-bodyparser
```

示例代码：

```ts
// 导入 Koa 应用对象。
import Koa from "koa";
// 导入 Koa 路由器。
import Router from "@koa/router";
// 导入请求体解析中间件。
import bodyParser from "koa-bodyparser";

// 创建 Koa 应用。
const app = new Koa();
// 创建路由器。
const router = new Router();

// 先注册 bodyParser，让后面的路由可以使用 ctx.request.body。
app.use(bodyParser());

// 注册 POST /echo 路由。
router.post("/echo", (ctx) => {
  // bodyParser 已经读取并解析了 JSON 请求体。
  const body = ctx.request.body as { message?: unknown };

  // 进行业务字段校验。
  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    // 设置 HTTP 状态码。
    ctx.status = 400;
    // 设置响应对象，Koa 会自动序列化成 JSON。
    ctx.body = { error: "message is required" };
    return;
  }

  // 设置成功响应，Koa 默认会返回 200。
  ctx.body = { message: body.message };
});

// 把路由器挂到应用上。
app.use(router.routes());
// 启动 Koa 服务。
app.listen(3001, () => {
  console.log("Koa API listening on http://localhost:3001");
});
```

Koa 版本把底层流程封装成了：

```ts
const body = ctx.request.body;
ctx.status = 400;
ctx.body = { error: "message is required" };
```

---

## 十、Koa 的 bodyparser 到底替你做了什么？

执行顺序大致是：

```text
请求进入 Koa
  ↓
bodyParser 中间件开始执行
  ↓
监听 Node.js request 的 data 事件
  ↓
收集请求体数据
  ↓
等待 end 事件
  ↓
解析 JSON
  ↓
把结果放进 ctx.request.body
  ↓
继续执行下一个中间件
  ↓
进入 router.post
```

所以，下面两种写法本质上对应同一件事：

| 原生 Node.js                           | Koa                          |
| -------------------------------------- | ---------------------------- |
| `request.on("data", ...)`            | bodyParser 内部完成          |
| `request.on("end", ...)`             | bodyParser 内部完成          |
| `Buffer.concat(chunks)`              | bodyParser 内部完成          |
| `JSON.parse(rawBody)`                | bodyParser 内部完成          |
| `parsedBody.message`                 | `ctx.request.body.message` |
| `response.writeHead(400)`            | `ctx.status = 400`         |
| `response.end(JSON.stringify(body))` | `ctx.body = body`          |

重要结论：

> Koa 没有改变 HTTP 的底层原理，只是把重复的底层操作封装成中间件和上下文 API。

---

## 十一、Koa 中间件顺序为什么重要？

正确顺序：

```ts
app.use(bodyParser());
app.use(router.routes());
```

执行过程：

```text
bodyParser 先执行
  ↓
ctx.request.body 已经准备好
  ↓
router 再执行
  ↓
路由读取 ctx.request.body
```

如果先注册路由：

```ts
app.use(router.routes());
app.use(bodyParser());
```

路由可能在 bodyParser 之前执行，导致：

```ts
ctx.request.body === undefined
```

可以记忆为：

```text
先解析，再使用
```

---

## 十二、Koa 的 `ctx.body` 和原生 `response.end` 的关系

Koa 中：

```ts
ctx.body = { message: "你好" };
```

框架会在请求处理结束时，帮你完成类似：

```ts
response.setHeader("Content-Type", "application/json");
response.end(JSON.stringify({ message: "你好" }));
```

Koa 还会根据 `ctx.body` 自动处理：

- 对象序列化。
- Content-Type。
- Content-Length。
- 空响应。
- 字符串和 Buffer。
- 一些常见状态码。

一般业务代码不应该直接操作：

```ts
ctx.res.writeHead(...);
ctx.res.end(...);
```

因为这样会绕过 Koa 的响应管理，容易造成：

- Koa 状态和真实响应不一致。
- 中间件无法正确处理响应。
- 重复发送响应。
- 错误处理失效。

推荐使用：

```ts
ctx.status = 200;
ctx.body = data;
```

---

## 十三、AI 接口中的对应关系

未来的：

```text
POST /chat
```

请求可能是：

```json
{
  "conversationId": "conversation-001",
  "message": "什么是 RAG？"
}
```

原生 Node.js 流程：

```text
读取 request
  ↓
解析 JSON
  ↓
校验 conversationId 和 message
  ↓
查询历史消息
  ↓
调用模型
  ↓
response.write 多次输出模型片段
  ↓
response.end 结束响应
```

Koa 流程：

```ts
router.post("/chat", async (ctx) => {
  // bodyParser 负责读取和解析 JSON。
  const body = ctx.request.body;

  // 业务代码负责校验字段。
  // 业务代码负责查询历史消息。
  // 业务代码负责调用模型。
  // 业务代码负责返回结果。
});
```

框架替你处理的是通用 HTTP 工作，不会替你决定：

- Prompt 怎么设计。
- 历史消息保留多少。
- 模型超时如何处理。
- 用户是否有权限访问会话。
- RAG 检索哪些资料。
- AI 结果是否需要人工确认。

---

## 十四、本课验收题

### 理论题

1. 为什么 HTTP 请求体可能分成多个 chunk？
2. `data` 和 `end` 事件分别表示什么？
3. 为什么 `response.end` 不能省略？
4. `writeHead(400)` 和 `writeHead(200)` 有什么区别？
5. `interface` 能不能校验用户传来的 JSON？为什么？
6. 为什么 `bodyParser` 要注册在路由之前？
7. Koa 中应该优先使用 `ctx.body` 还是 `ctx.res.end`？为什么？

### 实践题

1. 给 `/health` 增加 `requestId` 字段。
2. 给 `/echo` 增加最大消息长度限制，例如 500 个字符。
3. 为非法 JSON 增加日志，但不要把请求中的敏感信息完整打印出来。
4. 用 Koa 实现等价的 `/health` 和 `/echo`。
5. 画出原生 Node.js 和 Koa 的请求链路。

### 掌握标准

你不需要背诵每个 API，但应该能够：

- 从零写出一个最小 GET 接口。
- 从零写出一个接收 JSON 的 POST 接口。
- 解释请求体为什么需要解析。
- 根据状态码判断问题大概在哪一层。
- 说清楚 Koa 帮你封装了什么，以及业务代码仍然要负责什么。
