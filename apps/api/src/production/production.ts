// 导入随机 ID 生成器，为每个请求建立可追踪标识。
import { randomUUID } from "node:crypto";

// 定义结构化日志字段。
export interface LogFields {
  // 日志级别。
  level: "info" | "warn" | "error";
  // 日志事件名称。
  event: string;
  // 可选请求标识。
  requestId?: string;
  // 允许扩展其他安全字段。
  [key: string]: unknown;
}

// 创建请求上下文，避免依赖全局可变变量。
export function createRequestContext(inputRequestId?: string): { requestId: string } {
  // 复用可信的上游 requestId，否则生成新 ID。
  return { requestId: inputRequestId?.trim() || randomUUID() };
}

// 输出一行 JSON 结构化日志。
export function log(fields: LogFields): void {
  // JSON 日志方便日志平台按字段检索。
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...fields }));
}

// 定义单机内存限流器。
export class RateLimiter {
  // 保存每个 key 的窗口起始时间和请求次数。
  private readonly buckets = new Map<string, { startedAt: number; count: number }>();

  // 创建固定窗口限流器。
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  // 判断当前 key 是否还能继续请求。
  allow(key: string, now = Date.now()): boolean {
    // 读取当前窗口。
    const bucket = this.buckets.get(key);
    // 没有窗口或窗口已过期时重新开始计数。
    if (!bucket || now - bucket.startedAt >= this.windowMs) {
      this.buckets.set(key, { startedAt: now, count: 1 });
      return true;
    }
    // 超过限制时拒绝请求。
    if (bucket.count >= this.limit) {
      return false;
    }
    // 当前窗口内增加计数。
    bucket.count += 1;
    return true;
  }
}

// 定义 token 费用计量器。
export class UsageMeter {
  // 保存每个租户的累计 token 和估算费用。
  private readonly totals = new Map<string, { tokens: number; cost: number }>();

  // 记录一次模型调用的使用量。
  record(tenantId: string, totalTokens: number, pricePerThousandTokens: number): void {
    // 读取或创建租户累计值。
    const current = this.totals.get(tenantId) ?? { tokens: 0, cost: 0 };
    // 累加 token 和估算费用。
    current.tokens += totalTokens;
    current.cost += (totalTokens / 1000) * pricePerThousandTokens;
    // 写回租户累计值。
    this.totals.set(tenantId, current);
  }

  // 返回租户当前计量结果的只读副本。
  get(tenantId: string): { tokens: number; cost: number } {
    return { ...(this.totals.get(tenantId) ?? { tokens: 0, cost: 0 }) };
  }
}

// 定义简单的统一业务错误。
export class AppError extends Error {
  // HTTP 状态码。
  readonly statusCode: number;
  // 对外稳定错误码。
  readonly code: string;

  // 创建可安全返回给客户端的错误。
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
