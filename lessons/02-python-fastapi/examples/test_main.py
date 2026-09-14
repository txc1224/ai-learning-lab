"""第 2 课：FastAPI 接口测试。"""

# 导入 FastAPI 官方测试客户端。
from fastapi.testclient import TestClient
# 导入当前课程的 app 实例。
from main import app

# 创建同步测试客户端，内部会调用 ASGI 应用。
client = TestClient(app)


def test_health_contains_runtime() -> None:
    """健康检查应该返回 Python 运行时标识。"""
    # 发起 GET 请求。
    response = client.get("/health")
    # 断言请求成功。
    assert response.status_code == 200
    # 断言响应包含课程要求的字段。
    assert response.json()["runtime"] == "python-fastapi"


def test_echo_returns_trimmed_message() -> None:
    """合法消息应该去掉首尾空格后返回。"""
    # 发起带空格的 JSON 请求。
    response = client.post("/echo", json={"message": "  hello  "})
    # 断言业务处理成功。
    assert response.status_code == 200
    # 断言业务代码完成了 trim。
    assert response.json() == {"message": "hello"}


def test_echo_rejects_missing_message() -> None:
    """缺少 message 时应该由 Pydantic 返回 422。"""
    # 发起缺少字段的请求。
    response = client.post("/echo", json={})
    # 断言模型层校验失败。
    assert response.status_code == 422


def test_echo_rejects_blank_message() -> None:
    """空白字符串应该通过模型层后被业务层拒绝。"""
    # 发起类型正确但业务无效的请求。
    response = client.post("/echo", json={"message": "   "})
    # 断言业务层返回 400。
    assert response.status_code == 400
    # 断言错误原因清晰可读。
    assert response.json()["detail"] == "message is required"


def test_unknown_route_returns_not_found() -> None:
    """不存在的路径应该返回 404。"""
    # 请求一个未注册的路径。
    response = client.get("/unknown")
    # 断言资源不存在。
    assert response.status_code == 404
