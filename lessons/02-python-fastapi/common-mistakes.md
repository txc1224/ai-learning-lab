# 第 2 课常见错误

## 1. 没有激活虚拟环境

如果依赖安装到了别的 Python 环境，启动时可能找不到 FastAPI：

```bash
source .venv/bin/activate
python -m pip install fastapi uvicorn
```

## 2. 把类型提示当成运行时校验

Python 的类型提示：

```py
message: str
```

本身不会自动校验输入。FastAPI 使用 Pydantic 模型后，才会把请求 JSON 转换并校验成模型对象。

## 3. 混淆 HTTP 400 和 422

Pydantic 无法解析请求结构时，FastAPI 通常返回 `422`。

业务规则不满足时，可以主动返回 `400`。

## 4. 把 Node.js 环境变量名直接照搬

本示例使用：

```text
APP_VERSION
APP_ENV
```

Node 示例使用 `NODE_ENV`。真实项目应统一团队约定，不要在不同服务中随意使用多个名字。

## 5. 路径模块导入失败

如果从仓库根目录启动，使用完整模块路径：

```bash
uvicorn main:app --app-dir lessons/02-python-fastapi/examples --reload --port 8001
```

如果先进入 examples 目录启动，则使用：

```bash
cd lessons/02-python-fastapi/examples
uvicorn main:app --reload --port 8001
```
