// 导入共享模型契约和统一错误类型。
import { ProviderError, type ChatEvent, type ChatRequest, type ChatResult } from "@ai-learning-lab/shared";
// 导入 Provider 接口，保证真实实现可以替换 mock 实现。
import type { ChatProvider } from "./chat-provider.js";

// 定义 OpenAI 兼容响应中需要读取的最小结构。
type CompatibleResponse = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

// 使用 Node 原生 fetch 调用 OpenAI 兼容的聊天接口。
export class OpenAICompatibleProvider implements ChatProvider {
  // 从环境变量读取 API 地址，不把供应商地址写死在业务层。
  private readonly baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  // 从环境变量读取密钥，避免密钥进入源代码。
  private readonly apiKey = process.env.LLM_API_KEY;

  // 调用完整生成接口。
  async generate(request: ChatRequest): Promise<ChatResult> {
    // 没有密钥时明确报告配置错误。
    if (!this.apiKey) {
      throw new ProviderError("configuration", "LLM_API_KEY is required", false);
    }

    // 发起 OpenAI 兼容的 JSON 请求。
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: request.model, messages: request.messages, temperature: request.temperature }),
      signal: request.signal,
    }).catch((error: unknown) => {
      // 将底层网络异常转换成统一的上游错误。
      throw new ProviderError("upstream", error instanceof Error ? error.message : "LLM request failed", true);
    });

    // 供应商返回非 2xx 时按限流或上游故障分类。
    if (!response.ok) {
      throw new ProviderError(response.status === 429 ? "rate_limit" : "upstream", `LLM returned HTTP ${response.status}`, response.status === 429 || response.status >= 500);
    }

    // 解析供应商 JSON 响应。
    const payload = await response.json() as CompatibleResponse;
    // 读取第一候选答案，没有内容时视为协议错误。
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new ProviderError("invalid_response", "LLM response has no message content", false);
    }

    // 优先使用供应商真实 usage，没有时退化为简单估算。
    const promptTokens = payload.usage?.prompt_tokens ?? request.messages.reduce((sum, item) => sum + Math.ceil(item.content.length / 4), 0);
    const completionTokens = payload.usage?.completion_tokens ?? Math.ceil(text.length / 4);
    // 返回统一结果，不让上层依赖供应商字段命名。
    return {
      text,
      finishReason: payload.choices?.[0]?.finish_reason === "length" ? "length" : "stop",
      provider: "openai-compatible",
      model: request.model,
      usage: { promptTokens, completionTokens, totalTokens: payload.usage?.total_tokens ?? promptTokens + completionTokens },
    };
  }

  // 真实 Provider 的第一版流式能力先复用完整生成，后续可替换为 SSE 上游解析。
  async *stream(request: ChatRequest): AsyncIterable<ChatEvent> {
    // 获取完整结果。
    const result = await this.generate(request);
    // 发送开始事件。
    yield { type: "start", provider: result.provider, model: result.model };
    // 按空格切片，保持统一的下游事件契约。
    for (const [index, part] of result.text.split(" ").entries()) {
      // 请求被取消时停止继续输出。
      if (request.signal?.aborted) {
        throw new ProviderError("cancelled", "model request cancelled", false);
      }
      // 发送一段文本。
      yield { type: "delta", text: `${index === 0 ? "" : " "}${part}` };
    }
    // 发送完成和使用量。
    yield { type: "done", usage: result.usage };
  }
}
