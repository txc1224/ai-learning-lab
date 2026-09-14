# 第 2 课复盘

> 这是一份完成后的参考复盘。你再次运行服务后，可以把“已验证”改成自己的实际结果，并补充个人卡点。

## 我能解释什么

- [x] Python 类型提示和 Pydantic 校验的区别
- [x] FastAPI 路由如何声明
- [x] `async def` 的作用
- [x] 422 和 400 的区别
- [x] Node.js 与 FastAPI 的职责边界

## 我能独立实现什么

- [x] GET 健康检查接口
- [x] POST JSON 接口
- [x] 请求模型和响应模型
- [x] 空字符串业务校验
- [x] 启动 `/docs` 自动文档

## 本课完成结果

- 已在 `examples/main.py` 中完成 `/health`、`/echo` 和 `runtime` 字段。
- Python 语法检查通过。
- FastAPI 真实启动需要先安装 `requirements.txt` 中的依赖。
- Node.js monorepo 类型检查和构建通过。

## 本次卡点

- 当前环境如果无法访问 PyPI，FastAPI 依赖无法安装。

## 我如何解决

- 使用项目级 `.venv` 和 `requirements.txt`。
- 优先使用 `uv` 或 `python -m pip` 安装，确认 `python` 与 `pip` 属于同一个虚拟环境。
- 网络恢复后再执行真实接口验证，不把语法检查当成服务启动验证。

## 我如何把它应用到 AI 服务

- [x] 能理解 Python/FastAPI 可以作为独立 AI 数据处理服务。
- [x] 能说明 Pydantic 可用于校验模型调用接口的请求结构。
- [ ] 还不能独立接入真实模型 API

## 下一步

- 学习 PostgreSQL、Docker、会话和消息持久化。
- 将 `projects/01-chat-workbench` 从 mock 设计推进为可保存历史消息的应用。
