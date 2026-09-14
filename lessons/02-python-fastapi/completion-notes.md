# 第 2 课完成笔记：Python 与 FastAPI

## 本课结论

Python/FastAPI 不是用来替代所有 Node.js 业务代码，而是为 AI 应用提供一个适合数据处理、模型生态和实验验证的服务边界。

本课完成了：

- FastAPI 应用实例。
- `GET /health` 健康检查。
- `POST /echo` JSON 接口。
- Pydantic 请求和响应模型。
- 基础校验与业务校验分层。
- `runtime: "python-fastapi"` 标识。
- 自动 `/docs` 和 OpenAPI 入口说明。

## 1. Python 类型提示和 Pydantic 运行时校验有什么区别？

Python 类型提示：

```py
message: str
```

主要帮助开发工具理解代码，但单独存在时不会自动检查外部请求。

Pydantic 模型：

```py
class EchoRequest(BaseModel):
    message: str
```

会参与 FastAPI 的请求解析和运行时校验。缺少字段或结构不符合模型时，框架会在进入业务函数前拒绝请求。

可以记住：

```text
类型提示：告诉开发者“应该是什么类型”
Pydantic：运行时检查“实际数据是否符合模型”
```

## 2. FastAPI 路由如何声明？

```py
@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    ...
```

装饰器声明了：

- HTTP 方法：`GET`。
- 请求路径：`/health`。
- 响应模型：`HealthResponse`。

POST 接口：

```py
@app.post("/echo", response_model=EchoResponse)
async def echo(payload: EchoRequest) -> EchoResponse:
    ...
```

FastAPI 会根据函数参数中的 `EchoRequest` 知道请求体结构，并根据 `response_model` 生成文档和序列化响应。

## 3. `async def` 在本示例中表示什么？

```py
async def echo(payload: EchoRequest) -> EchoResponse:
```

它表示这是一个异步函数，可以在内部使用 `await` 等待数据库、模型或网络操作。

重要的是：

```text
async def 不等于自动并行
```

如果函数内部没有异步等待，它仍然只是一个可以异步调用的函数。后续接入模型 API 时，异步函数可以在等待外部服务期间让事件循环处理其他任务。

## 4. 请求模型和响应模型解决什么问题？

请求模型：

```py
class EchoRequest(BaseModel):
    message: str
```

描述客户端必须提交什么。

响应模型：

```py
class EchoResponse(BaseModel):
    message: str
```

描述服务承诺返回什么。

它们能带来：

- 运行时校验。
- 自动 OpenAPI 文档。
- 统一接口契约。
- 更少的字段漂移。
- 更清晰的编辑器提示。

## 5. 422 和 400 分别对应哪一层问题？

### 422：模型层请求结构问题

例如：

```json
{}
```

请求缺少 `message`，通常在进入 `echo` 函数前就被 FastAPI/Pydantic 拒绝。

### 400：业务层规则问题

例如：

```json
{"message":"   "}
```

它的类型是字符串，模型层可以接受；但业务上不允许空白消息，所以代码主动返回 400。

```py
if not message:
    raise HTTPException(status_code=400, detail="message is required")
```

边界是：

```text
模型不认识请求结构 → Pydantic/422
业务不接受合法结构 → 业务代码/400
```

实际项目应以团队统一错误契约为准，并通过测试固定行为。

## 6. `/docs` 和 `/openapi.json` 有什么作用？

启动 FastAPI 后：

```text
http://127.0.0.1:8001/docs
```

`/docs` 是可交互的 Swagger UI，可以查看接口、请求模型、响应模型并直接发送测试请求。

```text
http://127.0.0.1:8001/openapi.json
```

这是机器可读的 OpenAPI 描述，前端、测试工具或代码生成工具可以据此理解接口契约。

它们不是额外业务接口，而是 FastAPI 根据路由声明自动生成的开发辅助能力。

## 7. Node.js 与 FastAPI 如何分工？

| 关注点 | Node.js 原生/业务 API | Python/FastAPI AI 服务 |
|---|---|---|
| 前端 BFF 和业务聚合 | 擅长 | 可以做，但不一定优先 |
| TypeScript 全栈共享类型 | 擅长 | 需要额外契约同步 |
| 文本处理和 AI 生态 | 可以调用 | 生态通常更丰富 |
| 模型实验和数据脚本 | 可以做 | Python 更常见 |
| 高并发 I/O | 擅长 | FastAPI 也支持异步 I/O |
| 业务权限和商城逻辑 | 复用现有 Node 体系 | 作为独立 AI 服务更清晰 |

不要为了使用 Python 而拆服务。只有当 AI 数据处理、模型依赖或团队边界确实需要时，才增加 Python 服务。

## 8. `APP_VERSION`、`APP_ENV` 如何配置？

启动时设置：

```bash
APP_VERSION=0.2.0 APP_ENV=production \
uvicorn main:app --app-dir lessons/02-python-fastapi/examples --port 8001
```

`/health` 会返回：

```json
{
  "version": "0.2.0",
  "environment": "production",
  "runtime": "python-fastapi"
}
```

配置来自环境变量，而不是写死在业务逻辑中。真实项目还应使用 `.env.example` 记录变量名称，但不能提交真实密钥。

## 9. 本课实际验证了什么？

已完成：

- Python 示例语法检查。
- FastAPI 路由和模型代码编写。
- `runtime` 字段加入响应模型和返回值。
- Node.js 项目类型检查和构建。
- 依赖清单 `requirements.txt`。

如果当前环境无法访问 PyPI，应准确记录：

```text
Python 语法检查通过；FastAPI 依赖安装和真实服务启动需要网络可用后再验证。
```

不能把静态语法检查描述成接口启动成功。

## 10. 下一节为什么先学习 PostgreSQL，而不是直接学习 RAG？

RAG 也需要：

- 文档元数据。
- 文件记录。
- 分段记录。
- 向量与文档的关联。
- 用户问题和回答历史。

如果没有数据库基础，后面的 RAG 很容易只停留在脚本 Demo，无法形成可持久化、可查询、可排错的应用。因此下一节先学习 PostgreSQL、Docker、会话和消息持久化。

## 本课记忆卡片

```text
FastAPI：Python 的 Web API 框架
Pydantic：请求/响应模型和运行时校验
async def：声明异步函数，不等于自动并行
422：请求结构或模型校验失败
400：业务规则拒绝请求
/docs：人可以交互查看接口
/openapi.json：机器可读的接口契约
Node.js：业务 API 和前端协作强
Python：AI 数据处理和模型生态强
```

## 本课没有发散到什么

本课不学习：

- PyTorch。
- NumPy 深入计算。
- RAG。
- LangChain。
- Agent。
- 向量数据库。
- 模型训练。
- GPU 推理。

本课的完成标准是能看懂、运行和解释一个 Python/FastAPI 服务，并知道它如何与 Node.js 全栈系统协作。
