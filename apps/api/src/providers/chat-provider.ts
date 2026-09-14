// 导入共享的模型请求、结果和流式事件类型。
import type { ChatEvent, ChatRequest, ChatResult } from "@ai-learning-lab/shared";

// 定义模型 Provider 的统一能力边界。
export interface ChatProvider {
  // 执行一次完整模型生成。
  generate(request: ChatRequest): Promise<ChatResult>;
  // 以异步事件流的方式返回生成过程。
  stream(request: ChatRequest): AsyncIterable<ChatEvent>;
}
