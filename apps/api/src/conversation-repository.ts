// 导入 UUID 生成器，创建不会冲突的会话和消息标识。
import { randomUUID } from "node:crypto";
// 导入共享领域类型，保持 Repository 与 API 契约一致。
import type { Conversation, ConversationDetail, Message, MessageRole, MessageStatus } from "@ai-learning-lab/shared";
// 导入数据库查询和事务工具。
import { query, withTransaction } from "./db-client.js";

// 描述数据库查询返回的对话行结构。
type ConversationRow = {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
};

// 描述数据库查询返回的消息行结构。
type MessageRow = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  created_at: Date;
};

// 把数据库 snake_case 字段转换成 API 使用的 camelCase 字段。
function toConversation(row: ConversationRow): Conversation {
  // Repository 负责隔离数据库字段命名，不让 API 暴露数据库细节。
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// 把数据库消息行转换成 API 使用的消息对象。
function toMessage(row: MessageRow): Message {
  // 只返回 API 契约需要的字段。
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

// 封装对话和消息的持久化操作。
export class ConversationRepository {
  // 创建一个新的空会话。
  async createConversation(title: string): Promise<Conversation> {
    // 由应用生成 UUID，示例中无需依赖数据库自增序列。
    const id = randomUUID();
    // 使用参数化 SQL，标题不会被当作 SQL 代码执行。
    const rows = await query<ConversationRow>(
      `INSERT INTO conversations (id, title)
       VALUES ($1, $2)
       RETURNING id, title, created_at, updated_at`,
      [id, title],
    );
    // 将数据库行转换为 API 领域对象。
    return toConversation(rows[0]);
  }

  // 查询最近更新的会话列表。
  async listConversations(): Promise<Conversation[]> {
    // 使用 updated_at 和 id 保证排序稳定。
    const rows = await query<ConversationRow>(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       ORDER BY updated_at DESC, id DESC`,
    );
    // 转换每一行的字段命名和时间格式。
    return rows.map(toConversation);
  }

  // 查询一个会话及其按时间排序的全部消息。
  async findConversationDetail(id: string): Promise<ConversationDetail | null> {
    // 先查询会话元数据。
    const conversations = await query<ConversationRow>(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       WHERE id = $1`,
      [id],
    );

    // 没有会话时返回 null，由 API 层转换为 404。
    if (conversations.length === 0) {
      return null;
    }

    // 查询属于该会话的消息，并使用索引支持稳定排序。
    const messages = await query<MessageRow>(
      `SELECT id, conversation_id, role, content, status, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [id],
    );

    // 合并会话对象和消息列表。
    return {
      ...toConversation(conversations[0]),
      messages: messages.map(toMessage),
    };
  }

  // 保存一轮用户消息和指定的 assistant 回复。
  async appendTurn(conversationId: string, userContent: string, assistantContent: string): Promise<Message[]> {
    // 使用事务保证用户消息和助手消息要么一起成功，要么一起回滚。
    return withTransaction(async (client) => {
      // 先确认目标会话存在，避免外键错误变成模糊的 500。
      const conversation = await client.query<{ id: string }>(
        "SELECT id FROM conversations WHERE id = $1",
        [conversationId],
      );

      // 没有目标会话时抛出带标识的错误，API 层可以返回 404。
      if (conversation.rowCount === 0) {
        throw new ConversationNotFoundError(conversationId);
      }

      // 为用户消息生成唯一标识。
      const userMessageId = randomUUID();
      // 保存用户消息。
      const userMessage = await client.query<MessageRow>(
        `INSERT INTO messages (id, conversation_id, role, content, status)
         VALUES ($1, $2, 'user', $3, 'completed')
         RETURNING id, conversation_id, role, content, status, created_at`,
        [userMessageId, conversationId, userContent],
      );

      // 为 mock assistant 回复生成唯一标识。
      const assistantMessageId = randomUUID();
      // 保存调用方提供的 assistant 回复，mock 或真实 Provider 都可以复用。
      const assistantMessage = await client.query<MessageRow>(
        `INSERT INTO messages (id, conversation_id, role, content, status)
         VALUES ($1, $2, 'assistant', $3, 'completed')
         RETURNING id, conversation_id, role, content, status, created_at`,
        [assistantMessageId, conversationId, assistantContent],
      );

      // 更新会话更新时间，让最近有消息的会话排在前面。
      await client.query(
        "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
        [conversationId],
      );

      // 返回这一轮写入的两条消息。
      return [toMessage(userMessage.rows[0]), toMessage(assistantMessage.rows[0])];
    });
  }

  // 保留旧课程接口名称，让第 3 课示例仍然可以运行。
  async appendMockTurn(conversationId: string, userContent: string): Promise<Message[]> {
    // 将旧调用转发到通用的指定回复方法。
    return this.appendTurn(conversationId, userContent, `Mock assistant reply: ${userContent}`);
  }
}

// 定义资源不存在的专用错误，避免依赖脆弱的错误字符串判断。
export class ConversationNotFoundError extends Error {
  // 保存不存在的会话 ID，方便日志定位。
  readonly conversationId: string;

  // 创建带上下文的资源不存在错误。
  constructor(conversationId: string) {
    // 调用父类构造函数设置错误消息。
    super(`conversation not found: ${conversationId}`);
    // 设置稳定的错误名称。
    this.name = "ConversationNotFoundError";
    // 保存会话 ID。
    this.conversationId = conversationId;
  }
}
