// 定义所有应用都能复用的健康检查响应结构。
export interface HealthResponse {
  // 标识服务当前是否正常运行。
  status: "ok";
  // 返回服务名称，方便多个服务聚合展示。
  service: string;
  // 返回 ISO 格式的服务器时间。
  timestamp: string;
}
