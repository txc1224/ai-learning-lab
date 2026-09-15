// 导入 React 状态和根节点渲染能力。
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
// 导入共享消息和会话类型。
import type { Conversation, ConversationDetail, Message } from "@ai-learning-lab/shared";
// 导入前端 API client。
import { createConversation, getConversation, listConversations, streamMessage } from "./api-client";
// 导入工作台样式。
import "./style.css";

// 定义聊天页面组件。
function App() {
  // 保存会话列表。
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // 保存当前会话详情。
  const [current, setCurrent] = useState<ConversationDetail | null>(null);
  // 保存输入框内容。
  const [input, setInput] = useState("");
  // 保存加载和错误状态。
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 保存当前 AbortController，支持停止生成。
  const [controller, setController] = useState<AbortController | null>(null);

  // 页面加载时读取会话列表。
  useEffect(() => {
    void listConversations().then((items) => {
      setConversations(items);
      if (items[0]) void selectConversation(items[0].id);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "加载失败"));
  }, []);

  // 切换当前会话。
  async function selectConversation(id: string): Promise<void> {
    setError(null);
    try {
      setCurrent(await getConversation(id));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "加载会话失败");
    }
  }

  // 创建一个新会话。
  async function handleCreateConversation(): Promise<void> {
    try {
      const conversation = await createConversation("新的 AI 学习会话");
      setConversations((items) => [conversation, ...items]);
      await selectConversation(conversation.id);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建会话失败");
    }
  }

  // 发送消息并实时追加 delta。
  async function handleSend(): Promise<void> {
    if (!current || !input.trim() || loading) return;
    const content = input.trim();
    setInput("");
    setError(null);
    setLoading(true);
    const abortController = new AbortController();
    setController(abortController);
    const optimisticUser: Message = { id: `local-user-${Date.now()}`, conversationId: current.id, role: "user", content, status: "completed", createdAt: new Date().toISOString() };
    const optimisticAssistant: Message = { id: `local-assistant-${Date.now()}`, conversationId: current.id, role: "assistant", content: "", status: "streaming", createdAt: new Date().toISOString() };
    setCurrent((value) => value ? { ...value, messages: [...value.messages, optimisticUser, optimisticAssistant] } : value);
    try {
      await streamMessage(current.id, { content }, abortController.signal, (delta) => {
        setCurrent((value) => value ? { ...value, messages: value.messages.map((message) => message.id === optimisticAssistant.id ? { ...message, content: message.content + delta } : message) } : value);
      });
      await selectConversation(current.id);
    } catch (reason: unknown) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "发送失败");
    } finally {
      setLoading(false);
      setController(null);
    }
  }

  return (
    <main className="workbench">
      <aside className="sidebar">
        <div className="brand">AI Learning Lab</div>
        <button onClick={() => void handleCreateConversation()}>+ 新建会话</button>
        <div className="conversation-list">
          {conversations.map((conversation) => <button className={conversation.id === current?.id ? "conversation active" : "conversation"} key={conversation.id} onClick={() => void selectConversation(conversation.id)}>{conversation.title}</button>)}
        </div>
      </aside>
      <section className="chat-panel">
        <header><h1>{current?.title ?? "选择或创建会话"}</h1><span>{loading ? "生成中…" : "Mock Provider"}</span></header>
        <div className="messages">
          {current?.messages.map((message) => <article className={`message ${message.role}`} key={message.id}><strong>{message.role === "user" ? "你" : "AI"}</strong><p>{message.content || "…"}</p></article>)}
          {!current && <div className="empty">创建一个会话，开始学习。</div>}
        </div>
        {error && <div className="error">{error}</div>}
        <footer className="composer">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入问题…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} />
          {loading ? <button onClick={() => controller?.abort()}>停止</button> : <button onClick={() => void handleSend()} disabled={!current || !input.trim()}>发送</button>}
        </footer>
      </section>
    </main>
  );
}

// 挂载聊天工作台。
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
