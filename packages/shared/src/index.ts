// 定义所有应用都能复用的健康检查响应结构。
export interface HealthResponse {
  // 标识服务当前是否正常运行。
  status: "ok";
  // 返回服务名称，方便多个服务聚合展示。
  service: string;
  // 返回当前服务版本，方便排查部署版本问题。
  version: string;
  // 返回当前运行环境，例如 development 或 production。
  environment: string;
  // 返回 ISO 格式的服务器时间。
  timestamp: string;
}

// 定义 echo 接口成功响应的数据结构。
export interface EchoResponse {
  // 返回客户端提交的原始消息。
  message: string;
}

// 定义 API 统一错误响应的数据结构。
export interface ErrorResponse {
  // 返回便于前端展示和日志排查的错误信息。
  error: string;
}
