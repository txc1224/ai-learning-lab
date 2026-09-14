"""第 2 课：用 FastAPI 实现健康检查和 echo 接口。"""

# 导入 FastAPI 应用类和 HTTP 异常类型。
from fastapi import FastAPI
from fastapi import HTTPException
# 导入 Pydantic 基础模型，用于运行时校验请求和响应数据。
from pydantic import BaseModel
# 导入环境变量读取方法。
from os import getenv

# 创建 FastAPI 应用实例。
app = FastAPI(title="AI Learning Lab API")


# 定义健康检查的响应模型。
class HealthResponse(BaseModel):
    # 标识服务正常运行。
    status: str
    # 标识当前服务名称。
    service: str
    # 标识当前服务版本。
    version: str
    # 标识当前运行环境。
    environment: str
    # 返回服务生成响应的时间。
    timestamp: str


# 定义 echo 请求模型，FastAPI 会根据它解析并校验 JSON。
class EchoRequest(BaseModel):
    # 要求客户端提供一个字符串消息。
    message: str


# 定义 echo 响应模型，保证返回结构清晰。
class EchoResponse(BaseModel):
    # 返回客户端提交的消息。
    message: str


# 注册 GET /health 路由。
@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    # 导入标准库时间模块，避免应用启动时固定时间。
    from datetime import datetime, timezone

    # 组装并返回健康检查结果。
    return HealthResponse(
        status="ok",
        service="ai-learning-lab-python-api",
        version=getenv("APP_VERSION", "0.1.0"),
        environment=getenv("APP_ENV", "development"),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# 注册 POST /echo 路由，并声明请求和响应模型。
@app.post("/echo", response_model=EchoResponse)
async def echo(payload: EchoRequest) -> EchoResponse:
    # 去掉首尾空格，防止空白字符串绕过基础业务校验。
    message = payload.message.strip()

    # 空消息属于客户端参数错误，返回 HTTP 400。
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    # 返回经过校验的消息。
    return EchoResponse(message=message)
