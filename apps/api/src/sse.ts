// 导入 Node.js 响应对象类型。
import type { ServerResponse } from "node:http";
// 导入本课程统一的模型事件类型。
import type { ChatEvent } from "@ai-learning-lab/shared";

// 设置 SSE 所需的响应头。
export function startSse(response: ServerResponse): void {
  // 声明响应内容是服务器发送事件流。
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  // 禁止代理缓存尚未完成的事件。
  response.setHeader("Cache-Control", "no-cache");
  // 保持连接，方便服务端持续发送事件。
  response.setHeader("Connection", "keep-alive");
  // 发送成功状态和响应头。
  response.writeHead(200);
}

// 将一个模型事件编码为标准 SSE 帧。
export function encodeSseEvent(event: ChatEvent, id: number): string {
  // 使用 event 表示客户端应该按哪类事件处理。
  const eventName = event.type;
  // 使用 JSON 保证事件数据结构稳定且可扩展。
  const data = JSON.stringify(event);
  // SSE 帧以空行结束，客户端据此判断一个事件完成。
  return `id: ${id}\nevent: ${eventName}\ndata: ${data}\n\n`;
}

// 向客户端写入一条带自增 ID 的 SSE 事件。
export function writeSseEvent(response: ServerResponse, event: ChatEvent, id: number): void {
  // 写入编码后的事件帧。
  response.write(encodeSseEvent(event, id));
}
