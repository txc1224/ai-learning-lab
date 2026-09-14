# 第 2 课：Python 与 FastAPI 在 AI 应用中的作用

## 为什么前端/Node.js 开发者要学 Python

Node.js 很适合：

- Web 页面和 API。
- 实时通信。
- 用户、权限和业务系统。
- 前后端都使用 TypeScript 的团队。

Python 很适合：

- 数据清洗和文本处理。
- Embedding、RAG 和模型推理生态。
- Jupyter、NumPy、PyTorch、Transformers。
- 快速验证 AI 算法和实验。

实际 AI 全栈项目中，常见组合是：

```text
React / Vue
  ↓
Node.js 业务 API
  ↓
Python AI 服务
  ↓
模型、向量数据库或数据处理任务
```

这不是说 Python 一定比 Node.js 好，而是不同语言擅长的边界不同。本课只学习如何看懂和编写一个 FastAPI 服务，不学习机器学习算法。

## 本课目标

- 看懂 Python 函数、类型提示和异步函数。
- 理解 FastAPI 路由和请求体模型。
- 用 Pydantic 做运行时参数校验。
- 理解 Python 服务与 Node.js 服务的对应关系。
- 完成同一个 `/health` 和 `/echo` 接口。
- 知道什么时候使用 Node.js，什么时候拆出 Python 服务。

## 运行方式

本机已有 Python 3，但如果还没有依赖，可以创建虚拟环境：

```bash
cd /Users/m/projects/github/ai-learning-lab
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn
```

启动服务：

```bash
uvicorn main:app --app-dir lessons/02-python-fastapi/examples --reload --port 8001
```

测试健康检查：

```bash
curl http://127.0.0.1:8001/health
```

测试 echo：

```bash
curl -X POST http://127.0.0.1:8001/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，FastAPI"}'
```

## 本课和上一课的关系

上一课的原生 Node.js：

```ts
const rawBody = await readRequestBody(request);
const body = JSON.parse(rawBody);
```

本课的 FastAPI：

```py
@app.post("/echo")
async def echo(payload: EchoRequest) -> EchoResponse:
    return EchoResponse(message=payload.message)
```

FastAPI + Pydantic 把请求体读取、JSON 解析和基础校验封装了，但业务校验和错误设计仍然需要你负责。

## 本课不发散到什么

本课暂时不学习：

- NumPy 和复杂数学。
- PyTorch 训练模型。
- LangChain。
- RAG。
- Agent。
- 向量数据库。

这些主题会在后续课程出现。当前只建立 Python AI 服务的基础。
