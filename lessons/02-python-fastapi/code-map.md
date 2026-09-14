# 第 2 课代码对照表

| 知识点 | 文件/代码 | 观察重点 |
|---|---|---|
| FastAPI 应用 | `examples/main.py:app` | 应用实例是路由的容器 |
| 请求模型 | `EchoRequest` | Pydantic 负责结构和类型校验 |
| 响应模型 | `EchoResponse` | 约束返回结构并生成文档 |
| 路由声明 | `@app.get` / `@app.post` | 方法、路径和模型的契约 |
| 异步函数 | `async def health/echo` | 可以等待 I/O，不等于自动并行 |
| 环境配置 | `getenv` | 配置与代码分离 |
| 模型校验 | 缺少 `message` | 业务函数可能尚未执行 |
| 业务校验 | `if not message` | 类型正确但业务不接受 |
| HTTP 400 | `HTTPException(400)` | 主动返回业务错误 |
| 自动文档 | `/docs`、`/openapi.json` | 从类型和路由生成契约 |

## 与 Node.js 原生 API 的对应

| 处理步骤 | Node.js 原生 | FastAPI |
|---|---|---|
| 创建服务 | `createServer` | `FastAPI()` |
| 匹配路由 | `method + url` 判断 | `@app.get` / `@app.post` |
| 读取 JSON | 手动读取 `request` 流 | FastAPI 自动处理 |
| 基础校验 | 手动 `typeof` | Pydantic `BaseModel` |
| 业务校验 | 手动 `if` | 仍然手动 `if` |
| 设置状态 | `response.writeHead` | `HTTPException` 或框架默认值 |
| 返回 JSON | `JSON.stringify` + `end` | `return` 模型对象 |

## 学习边界

本课只对照 Web API 基础，不扩展到：

- RAG。
- Agent。
- LangChain。
- PyTorch。
- 数据库。
- 真实模型调用。
