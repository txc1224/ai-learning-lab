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

// 定义对话角色，限制消息只能来自用户或助手。
export type MessageRole = "user" | "assistant";

// 定义消息状态，覆盖普通生成和流式生成的生命周期。
export type MessageStatus = "completed" | "pending" | "streaming" | "failed";

// 定义对话在 API 中对外展示的结构。
export interface Conversation {
  // 对话唯一标识。
  id: string;
  // 对话标题。
  title: string;
  // 创建时间。
  createdAt: string;
  // 最近更新时间。
  updatedAt: string;
}

// 定义一条聊天消息在 API 中对外展示的结构。
export interface Message {
  // 消息唯一标识。
  id: string;
  // 所属对话标识。
  conversationId: string;
  // 消息角色。
  role: MessageRole;
  // 消息正文。
  content: string;
  // 消息处理状态。
  status: MessageStatus;
  // 创建时间。
  createdAt: string;
}

// 定义会话详情响应，包含会话和按时间排序的消息。
export interface ConversationDetail extends Conversation {
  // 当前会话中的全部消息。
  messages: Message[];
}

// 定义创建会话请求，标题可选。
export interface CreateConversationRequest {
  // 用户提供的可选标题。
  title?: string;
}

// 定义发送消息请求。
export interface CreateMessageRequest {
  // 用户要发送的消息正文。
  content: string;
}

// 重新导出模型调用相关的共享契约。
export * from "./llm.js";
