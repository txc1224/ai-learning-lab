# 第 4 课：LLM API、Prompt、上下文与结构化输出

## 目标

把“调用模型”理解成一个可替换的 Provider，而不是把某家 SDK 直接写进路由。

```text
HTTP
→ ChatService
→ ChatProvider
→ MockProvider / OpenAICompatibleProvider
```

## 本课代码

- `apps/api/src/providers/chat-provider.ts`：统一 Provider 接口。
- `apps/api/src/providers/mock-provider.ts`：不需要密钥的确定性实现。
- `apps/api/src/providers/openai-compatible-provider.ts`：可选的 OpenAI 兼容 HTTP 实现。
- `apps/api/src/chat-service.ts`：加载历史、组装上下文、调用 Provider。
- `packages/shared/src/llm.ts`：共享请求、结果、usage、事件和错误类型。

## 核心概念

### Prompt 和上下文

Prompt 是指令；上下文是本次请求中模型可见的全部消息：系统提示、历史消息和当前问题。

### Provider 抽象

业务层只依赖：

```ts
interface ChatProvider {
  generate(request): Promise<ChatResult>;
  stream(request, signal): AsyncIterable<ChatEvent>;
}
```

替换模型供应商时，不需要重写路由和会话逻辑。

### Token

`MockProvider` 用字符长度做粗略估算，只用于教学；供应商返回的真实 usage 才能用于准确计费。

### 结构化输出

模型返回的 JSON 仍然是不可信输入，需要运行时校验，不能因为提示词要求 JSON 就直接信任。

## 运行

```bash
cd /Users/m/projects/github/ai-learning-lab
pnpm typecheck
pnpm --filter @ai-learning-lab/api exec tsx lessons/01-typescript-node/examples/async-basics.ts
```

真实 Provider 只在明确配置时使用：

```bash
LLM_PROVIDER=openai-compatible \
LLM_API_KEY=your-key \
LLM_BASE_URL=https://api.openai.com/v1 \
LLM_MODEL=your-model \
pnpm --filter @ai-learning-lab/api dev
```

不要把密钥提交到仓库。

## API 演示

```text
POST /conversations/:id/chat
```

默认 `MockProvider` 会返回明确带 `[mock-provider]` 标识的结果。第 3 课数据库可用时才可以完成完整持久化调用。

## 本课边界

只学习 Provider、Prompt、上下文、usage、错误和结构化输出；不学习 SSE、RAG、Agent、微调或真实模型质量评估。
