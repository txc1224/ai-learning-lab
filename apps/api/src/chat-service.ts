// 导入共享的聊天、流式事件和消息类型。
import type { ChatEvent, ChatMessage, ChatResult, Message, MessageRole } from "@ai-learning-lab/shared";
// 导入 Provider 接口，服务层不依赖具体模型厂商。
import type { ChatProvider } from "./providers/chat-provider.js";
// 导入持久化 Repository。
import { ConversationNotFoundError, ConversationRepository } from "./conversation-repository.js";

// 定义聊天服务的完整生成结果。
export interface ChatServiceResult {
  // 保存用户消息和 assistant 消息。
  messages: Message[];
  // 返回模型元数据和使用量。
  result: ChatResult;
}

// 将数据库消息转换为 Provider 需要的聊天消息。
function toChatMessages(messages: Message[], systemPrompt: string): ChatMessage[] {
  // 先加入系统提示词，再按历史顺序加入用户和助手消息。
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => ({ role: message.role as MessageRole, content: message.content })),
  ];
}

// 编排会话历史、Provider 调用和消息持久化。
export class ChatService {
  // 注入 Repository 和 Provider，方便替换实现和编写测试。
  constructor(
    private readonly repository: ConversationRepository,
    private readonly provider: ChatProvider,
  ) {}

  // 流式加载会话历史并转发 Provider 事件。
  async *streamMessage(conversationId: string, content: string, signal?: AbortSignal): AsyncIterable<ChatEvent> {
    // 查询会话，确保流式任务开始前资源存在。
    const conversation = await this.repository.findConversationDetail(conversationId);
    // 资源不存在时抛出专用错误。
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }
    // 组装系统提示词、历史消息和本轮用户消息。
    const requestMessages = toChatMessages(
      [...conversation.messages, { id: "draft", conversationId, role: "user", content, status: "completed", createdAt: new Date().toISOString() }],
      "你是 AI Learning Lab 的学习助手。",
    );
    // 将 Provider 的每个事件原样交给 SSE 层。
    for await (const event of this.provider.stream({ messages: requestMessages, model: process.env.LLM_MODEL ?? "mock-model", signal })) {
      // 让调用方决定如何编码、持久化和展示事件。
      yield event;
    }
  }

  // 加载会话历史并执行一次完整模型生成。
  async generateMessage(conversationId: string, content: string): Promise<ChatServiceResult> {
    // 查询会话详情，确保会话存在并取到历史消息。
    const conversation = await this.repository.findConversationDetail(conversationId);
    // 资源不存在时抛出专用错误。
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // 将历史消息和本轮用户消息组装成模型上下文。
    const requestMessages = toChatMessages(
      [...conversation.messages, { id: "draft", conversationId, role: "user", content, status: "completed", createdAt: new Date().toISOString() }],
      "你是 AI Learning Lab 的学习助手。",
    );
    // 调用统一 Provider，不让 HTTP 层依赖具体模型厂商。
    const result = await this.provider.generate({ messages: requestMessages, model: process.env.LLM_MODEL ?? "mock-model" });
    // 模型成功后在一个事务中保存 user 和 assistant，避免半轮数据。
    const messages = await this.repository.appendTurn(conversationId, content, result.text);
    // 返回本轮消息和模型元数据。
    return { messages, result };
  }
}
