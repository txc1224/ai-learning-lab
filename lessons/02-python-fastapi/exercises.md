# 第 2 课练习

## 练习 1：运行 Python 服务

完成虚拟环境创建、依赖安装和服务启动。

## 练习 2：修改健康检查

给 `HealthResponse` 增加一个 `runtime` 字段，返回：

```text
python-fastapi
```

## 练习 3：理解两层校验

分别测试：

```json
{}
```

和：

```json
{"message":"   "}
```

观察 FastAPI 的模型校验和业务校验有什么区别。

## 练习 4：对照 Node.js

把 Node.js 和 FastAPI 的 `/echo` 处理步骤写成两列：

```text
请求体读取
JSON 解析
字段类型校验
业务校验
响应序列化
```

## 完成标准

- 能启动 FastAPI 服务。
- 能访问自动接口文档 `/docs`。
- 能解释 Pydantic 负责什么。
- 能说明 FastAPI 没有替你决定业务规则。
