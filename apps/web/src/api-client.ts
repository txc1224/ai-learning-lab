// 导入共享的会话和消息类型，避免前端复制接口字段。
import type { Conversation, ConversationDetail, CreateMessageRequest, Message } from "@ai-learning-lab/shared";

// 统一 API 基础地址，开发时由 Vite 代理或环境变量覆盖。
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

// 创建一个新会话。
export async function createConversation(title: string): Promise<Conversation> {
  const response = await fetch(`${apiBase}/conversations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
  if (!response.ok) throw new Error("创建会话失败");
  return response.json() as Promise<Conversation>;
}

// 查询会话列表。
export async function listConversations(): Promise<Conversation[]> {
  const response = await fetch(`${apiBase}/conversations`);
  if (!response.ok) throw new Error("读取会话失败");
  return response.json() as Promise<Conversation[]>;
}

// 查询会话详情。
export async function getConversation(id: string): Promise<ConversationDetail> {
  const response = await fetch(`${apiBase}/conversations/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("读取会话详情失败");
  return response.json() as Promise<ConversationDetail>;
}

// 读取 SSE 流并将 delta 回调给页面。
export async function streamMessage(conversationId: string, payload: CreateMessageRequest, signal: AbortSignal, onDelta: (text: string) => void): Promise<Message[]> {
  const response = await fetch(`${apiBase}/conversations/${encodeURIComponent(conversationId)}/messages/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  if (!response.ok || !response.body) throw new Error("流式请求失败");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: Message[] = [];
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(6)) as { type: string; text?: string; messages?: Message[]; message?: string };
      if (event.type === "delta" && event.text) onDelta(event.text);
      if (event.type === "error") throw new Error(event.message ?? "流式生成失败");
      if (event.type === "done" && event.messages) latest = event.messages;
    }
  }
  return latest;
}
