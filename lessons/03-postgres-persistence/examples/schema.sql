-- 创建对话表，保存用户的会话元数据。
CREATE TABLE IF NOT EXISTS conversations (
  -- 使用 UUID 作为不会暴露自增数量的主键。
  id UUID PRIMARY KEY,
  -- 保存展示给用户的会话标题。
  title TEXT NOT NULL,
  -- 记录会话创建时间，并统一使用 UTC。
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 记录会话最近一次更新的时间。
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建消息表，一条对话可以拥有多条消息。
CREATE TABLE IF NOT EXISTS messages (
  -- 使用 UUID 作为消息主键。
  id UUID PRIMARY KEY,
  -- 关联所属对话，并在对话删除时级联删除消息。
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  -- 限制消息角色只能是用户或助手。
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  -- 保存消息正文。
  content TEXT NOT NULL,
  -- 为后续流式生成保留消息状态。
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  -- 记录消息创建时间，并统一使用 UTC。
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 按对话和时间建立索引，支持稳定地读取聊天记录。
CREATE INDEX IF NOT EXISTS messages_conversation_created_at_idx
  ON messages (conversation_id, created_at, id);
