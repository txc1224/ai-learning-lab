// 解析 SSE 文本帧，处理跨 chunk 的半帧拼接。
export function parseSseFrame(frame: string): { id?: number; event?: string; data?: string } {
  // 按行读取 id、event 和 data 字段。
  let id: number | undefined;
  let event: string | undefined;
  let data: string | undefined;
  for (const line of frame.split("\n")) {
    if (line.startsWith("id: ")) id = Number(line.slice(4));
    else if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) data = line.slice(6);
  }
  return { id, event, data };
}

// 消费累积缓冲区，返回完整帧，剩余半帧放回缓冲区。
export function drainCompleteFrames(buffer: string): { frames: string[]; rest: string } {
  // SSE 帧以空行分隔。
  const parts = buffer.split("\n\n");
  // 最后一段可能是半帧。
  const rest = parts.pop() ?? "";
  return { frames: parts.filter(Boolean), rest };
}
