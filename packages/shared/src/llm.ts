// 定义大模型支持的消息角色。
export type ChatRole = "system" | "user" | "assistant";

// 定义发送给模型的一条标准消息。
export interface ChatMessage {
  // 标识消息来自系统、用户还是助手。
  role: ChatRole;
  // 保存模型需要阅读的文本内容。
  content: string;
}

// 定义一次模型生成请求。
export interface ChatRequest {
  // 发送给模型的上下文消息。
  messages: ChatMessage[];
  // 模型名称由配置或调用方决定，不写死业务代码。
  model: string;
  // 控制生成随机性的可选参数。
  temperature?: number;
  // 用于取消底层网络请求的信号。
  signal?: AbortSignal;
}

// 记录模型生成使用量，mock 仅提供估算值。
export interface TokenUsage {
  // 输入内容的估算 token 数。
  promptTokens: number;
  // 输出内容的估算 token 数。
  completionTokens: number;
  // 输入和输出 token 总数。
  totalTokens: number;
}

// 定义一次模型生成的完整结果。
export interface ChatResult {
  // 模型生成的文本。
  text: string;
  // 结束原因，例如 stop 或 length。
  finishReason: "stop" | "length" | "error";
  // 产生结果的 provider 名称。
  provider: string;
  // 实际使用的模型名称。
  model: string;
  // mock 或 provider 报告的使用量。
  usage: TokenUsage;
}

// 定义流式生成事件。
export type ChatEvent =
  | { type: "start"; provider: string; model: string }
  | { type: "delta"; text: string }
  | { type: "done"; usage: TokenUsage }
  | { type: "error"; message: string };

// 统一模型调用错误分类，供重试和 API 映射使用。
export type ProviderErrorCode = "configuration" | "timeout" | "rate_limit" | "upstream" | "invalid_response" | "cancelled";

// 定义带稳定错误码的模型调用异常。
export class ProviderError extends Error {
  // 保存错误分类。
  readonly code: ProviderErrorCode;
  // 标识当前错误是否适合重试。
  readonly retryable: boolean;

  // 创建模型调用错误。
  constructor(code: ProviderErrorCode, message: string, retryable: boolean) {
    // 设置人类可读错误信息。
    super(message);
    // 设置稳定的错误名称。
    this.name = "ProviderError";
    // 保存错误分类。
    this.code = code;
    // 保存是否可重试。
    this.retryable = retryable;
  }
}
