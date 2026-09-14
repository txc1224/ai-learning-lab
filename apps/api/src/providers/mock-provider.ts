// 导入共享模型类型和统一错误类型。
import { ProviderError, type ChatEvent, type ChatMessage, type ChatRequest, type ChatResult, type TokenUsage } from "@ai-learning-lab/shared";
// 导入 Provider 接口，确保 mock 和真实实现可以互换。
import type { ChatProvider } from "./chat-provider.js";

// 估算文本 token 数，教学示例不代表供应商真实计费结果。
export function estimateTokens(text: string): number {
  // 使用约四个字符一个 token 的粗略估算。
  return Math.max(1, Math.ceil(text.length / 4));
}

// 根据消息列表计算输入 token 估算值。
function estimatePromptTokens(messages: ChatMessage[]): number {
  // 加上每条消息的少量角色/格式开销。
  return messages.reduce((total, message) => total + estimateTokens(message.content) + 4, 0);
}

// 创建一个确定性本地模型 Provider。
export class MockProvider implements ChatProvider {
  // 保存 provider 名称，便于日志和响应追踪。
  readonly name = "mock";

  // 根据最后一条用户消息生成可预测回复。
  async generate(request: ChatRequest): Promise<ChatResult> {
    // 检查调用方是否已经取消请求。
    if (request.signal?.aborted) {
      throw new ProviderError("cancelled", "model request cancelled", false);
    }

    // 查找最后一条用户消息作为回答主题。
    const userMessage = [...request.messages].reverse().find((message) => message.role === "user");
    // 没有用户消息时拒绝生成，避免产生无上下文回复。
    if (!userMessage) {
      throw new ProviderError("invalid_response", "a user message is required", false);
    }

    // 读取系统提示词，展示上下文确实会参与生成。
    const systemMessage = request.messages.find((message) => message.role === "system");
    // 生成明确标注为 mock 的确定性文本。
    const text = [
      "[mock-provider]",
      systemMessage ? `system=${systemMessage.content}` : "system=none",
      `answer=${userMessage.content}`,
    ].join("\n");
    // 估算输入和输出 token。
    const promptTokens = estimatePromptTokens(request.messages);
    const completionTokens = estimateTokens(text);
    // 返回统一的模型结果。
    return {
      text,
      finishReason: "stop",
      provider: this.name,
      model: request.model,
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
    };
  }

  // 将完整回复拆成多个 delta，模拟模型流式输出。
  async *stream(request: ChatRequest): AsyncIterable<ChatEvent> {
    // 先生成完整的确定性结果，保证 generate 和 stream 使用相同语义。
    const result = await this.generate(request);
    // 发送开始事件，让客户端建立生成状态。
    yield { type: "start", provider: result.provider, model: result.model };

    // 按空格切分文本，模拟一段一段的模型输出。
    const parts = result.text.split(" ");
    // 逐段发送 delta。
    for (const [index, part] of parts.entries()) {
      // 检查客户端是否在生成过程中取消了请求。
      if (request.signal?.aborted) {
        throw new ProviderError("cancelled", "model request cancelled", false);
      }
      // 给每段增加空格，保持拼接后的文本可读。
      yield { type: "delta", text: `${index === 0 ? "" : " "}${part}` };
      // 延迟一小段时间，让本地可以观察流式效果。
      await new Promise<void>((resolve) => setTimeout(resolve, 15));
    }

    // 最后发送 token 使用量。
    yield { type: "done", usage: result.usage };
  }
}
