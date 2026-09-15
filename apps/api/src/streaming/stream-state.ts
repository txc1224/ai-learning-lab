// 定义流式 assistant 消息的生命周期。
export type StreamState = "pending" | "streaming" | "completed" | "failed" | "cancelled";

// 定义内存教学版的流式消息记录。
export interface StreamRecord {
  // 幂等请求键。
  idempotencyKey: string;
  // 会话标识。
  conversationId: string;
  // 消息标识。
  messageId: string;
  // 当前状态。
  state: StreamState;
  // 已累计文本。
  content: string;
  // 最近一个事件序号。
  lastEventId: number;
  // 最后一次错误。
  error?: string;
}

// 一个不依赖数据库的流状态存储，用于理解状态迁移和恢复。
export class StreamStateStore {
  // 按幂等键保存记录。
  private readonly records = new Map<string, StreamRecord>();

  // 创建或返回已有的幂等记录。
  create(record: StreamRecord): StreamRecord {
    const existing = this.records.get(record.idempotencyKey);
    if (existing) return existing;
    this.records.set(record.idempotencyKey, record);
    return record;
  }

  // 更新状态并追加 delta。
  append(idempotencyKey: string, delta: string, eventId: number): StreamRecord {
    const record = this.records.get(idempotencyKey);
    if (!record) throw new Error("stream record not found");
    record.state = "streaming";
    record.content += delta;
    record.lastEventId = Math.max(record.lastEventId, eventId);
    return record;
  }

  // 完成一条流。
  complete(idempotencyKey: string): StreamRecord {
    const record = this.records.get(idempotencyKey);
    if (!record) throw new Error("stream record not found");
    record.state = "completed";
    return record;
  }

  // 根据幂等键恢复记录。
  get(idempotencyKey: string): StreamRecord | undefined {
    return this.records.get(idempotencyKey);
  }
}
