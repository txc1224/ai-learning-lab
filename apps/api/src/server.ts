// 导入 Node.js 原生 HTTP 服务能力，当前阶段不引入复杂框架。
import { createServer } from "node:http";
// 导入 Node.js 请求对象类型，声明它支持 data、end 和 error 事件。
import type { IncomingMessage, ServerResponse } from "node:http";
// 导入共享类型，确保 API 响应与前端契约一致。
import type {
  ConversationDetail,
  CreateConversationRequest,
  CreateMessageRequest,
  EchoResponse,
  ErrorResponse,
  HealthResponse,
} from "@ai-learning-lab/shared";
// 导入数据库连接池关闭方法，保证服务退出时释放资源。
import { closePool } from "./db-client.js";
// 导入会话 Repository 和资源不存在错误。
import { ConversationNotFoundError, ConversationRepository } from "./conversation-repository.js";
// 导入聊天编排服务。
import { ChatService } from "./chat-service.js";
// 导入本地确定性模型 Provider。
import { MockProvider } from "./providers/mock-provider.js";
// 导入可选的 OpenAI 兼容 Provider。
import { OpenAICompatibleProvider } from "./providers/openai-compatible-provider.js";
// 导入 SSE 响应工具。
import { startSse, writeSseEvent } from "./sse.js";
// 导入生产化的请求追踪和限流工具。
import { createRequestContext, log, RateLimiter, UsageMeter } from "./production/production.js";
// 导入本地 RAG 文档清洗、切分和检索工具。
import { loadDocument } from "./rag/document-loader.js";
import { chunkDocument } from "./rag/chunker.js";
import { retrieveByKeyword, buildContext } from "./rag/retriever.js";
// 导入来源引用构建器，向调用方返回可追溯的文档位置。
import { buildCitations } from "./rag/citation-builder.js";
// 导入本地 Agent 工具运行器。
import { AgentRunner, ToolRegistry, calculatorTool } from "./agent/agent-runner.js";
// 导入随机 ID 工具，为生产化请求建立追踪上下文。
import { randomUUID } from "node:crypto";

// 读取环境变量端口，没有配置时使用本地开发常用端口。
const port = Number(process.env.PORT ?? 3001);
// 读取服务版本，没有配置时使用当前学习项目的初始版本。
const version = process.env.APP_VERSION ?? "0.1.0";
// 读取运行环境，没有配置时默认认为是本地开发环境。
const environment = process.env.NODE_ENV ?? "development";
// 创建 Repository，让 HTTP 层不直接编写 SQL。
const conversationRepository = new ConversationRepository();
// 根据显式配置选择 Provider，默认使用不需要密钥的本地 Mock。
const chatProvider = process.env.LLM_PROVIDER === "openai-compatible"
  ? new OpenAICompatibleProvider()
  : new MockProvider();
// 创建聊天编排服务，统一管理上下文和模型调用。
const chatService = new ChatService(conversationRepository, chatProvider);
// 创建生产化工具实例，后续路由可以复用同一套 requestId/限流/计量。
const requestLimiter = new RateLimiter(30, 60_000);
const usageMeter = new UsageMeter();
// 创建一个只允许显式注册工具的 Agent 注册表。
const toolRegistry = new ToolRegistry();
toolRegistry.register(calculatorTool);
const agentRunner = new AgentRunner(toolRegistry, 5);

// 把请求体读取成字符串，供 POST 接口后续解析 JSON。
function readRequestBody(request: IncomingMessage): Promise<string> {
  // 创建 Promise，把多个数据片段组合成一次完整读取结果。
  return new Promise((resolve, reject) => {
    // 保存已经读取到的请求体片段。
    const chunks: Buffer[] = [];
    // 监听请求数据片段。
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    // 请求体读取完成后合并所有片段。
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    // 请求连接异常时，让调用方进入错误处理分支。
    request.on("error", reject);
  });
}

// 统一返回 JSON，避免每个路由重复设置响应头和序列化逻辑。
function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  // 设置 JSON 响应头，让客户端按 JSON 解析返回值。
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  // 发送 HTTP 状态码。
  response.writeHead(statusCode);
  // 把 JavaScript 数据转换成 JSON，并结束响应。
  response.end(JSON.stringify(body));
}

// 解析 JSON 请求体，非法 JSON 统一转换成可识别的客户端错误。
async function parseJsonBody<T>(request: IncomingMessage): Promise<T> {
  // 读取完整请求体。
  const rawBody = await readRequestBody(request);
  try {
    // 调用方仍需要对解析结果做业务类型校验。
    return JSON.parse(rawBody || "{}") as T;
  } catch {
    // 使用带标识的错误，让 HTTP 层返回 400。
    throw new InvalidJsonError();
  }
}

// 定义非法 JSON 的专用错误，避免依赖异常文本判断。
class InvalidJsonError extends Error {
  // 创建稳定的错误名称。
  constructor() {
    // 设置面向调用方的错误信息。
    super("request body must be valid JSON");
    // 保存错误类型名称。
    this.name = "InvalidJsonError";
  }
}

// 判断一个值是否为普通的非空对象。
function isRecord(value: unknown): value is Record<string, unknown> {
  // 数组和 null 都不应该被当成请求对象。
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 从 URL 中提取会话 ID，避免把路径解析散落在多个分支中。
function getConversationId(pathname: string): string | null {
  // 匹配 /conversations/:id，但不匹配更深的子路径。
  const match = /^\/conversations\/([^/]+)$/.exec(pathname);
  // 找不到匹配时返回 null。
  return match ? decodeURIComponent(match[1]) : null;
}

// 创建 HTTP 服务，并根据请求方法和路径分发请求。
const server = createServer((request, response) => {
  // 捕获异步请求处理中的异常，避免单个请求让进程产生未处理 Promise。
  void handleRequest(request, response).catch((error: unknown) => {
    // 记录服务端详细错误，便于开发阶段排查数据库问题。
    console.error("request handling error:", error);
    // 如果响应头尚未发送，就返回安全的 500 错误。
    if (!response.headersSent) {
      writeJson(response, 500, { error: "internal server error" } satisfies ErrorResponse);
      return;
    }
    // 如果响应已经开始，则关闭连接，避免继续写入不完整响应。
    response.destroy();
  });
});

// 处理单个 HTTP 请求的异步逻辑。
async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  // 创建或复用请求 ID，方便日志关联同一请求的所有步骤。
  const requestId = createRequestContext(request.headers["x-request-id"]?.toString()).requestId;
  // 把请求 ID返回给客户端，便于用户报告问题。
  response.setHeader("X-Request-Id", requestId);
  // 单机固定窗口限流，保护课程服务不会被无限请求压垮。
  if (!requestLimiter.allow(request.socket.remoteAddress ?? "anonymous")) {
    writeJson(response, 429, { error: "rate limit exceeded" } satisfies ErrorResponse);
    return;
  }
  // 记录请求进入日志，避免打印请求体等敏感信息。
  log({ level: "info", event: "request_started", requestId, method: request.method ?? "unknown", url: request.url ?? "/" });
  // 解析路径时使用固定主机，避免依赖客户端 Host 头的格式。
  const url = new URL(request.url ?? "/", "http://localhost");
  // 取出不包含查询字符串的路径。
  const pathname = url.pathname;

  // 当前阶段实现健康检查，后续可在这里补充数据库和模型状态。
  if (request.method === "GET" && pathname === "/health") {
    // 使用共享类型约束返回对象，避免前后端字段漂移。
    const body: HealthResponse = {
      status: "ok",
      service: "ai-learning-lab-api",
      version,
      environment,
      timestamp: new Date().toISOString(),
    };
    // 返回健康检查结果。
    writeJson(response, 200, body);
    return;
  }

  // echo 接口接收消息后原样返回，用于练习 POST 和 JSON 请求体。
  if (request.method === "POST" && pathname === "/echo") {
    try {
      // 读取客户端发送的完整请求体。
      const parsedBody: unknown = await parseJsonBody<unknown>(request);
      // 只有对象类型才允许读取 message 字段。
      const message = isRecord(parsedBody) ? parsedBody.message : undefined;

      // 校验 message 必须是非空字符串。
      if (typeof message !== "string" || message.trim().length === 0) {
        const error: ErrorResponse = { error: "message is required" };
        writeJson(response, 400, error);
        return;
      }

      // 使用共享类型约束成功响应。
      const body: EchoResponse = { message };
      writeJson(response, 200, body);
    } catch (error: unknown) {
      // 非法 JSON 返回客户端错误，其他错误交给统一错误处理。
      if (error instanceof InvalidJsonError) {
        writeJson(response, 400, { error: error.message } satisfies ErrorResponse);
        return;
      }
      throw error;
    }
    return;
  }

  // 创建会话：POST /conversations。
  if (request.method === "POST" && pathname === "/conversations") {
    try {
      // 读取并解析可选标题。
      const parsedBody: unknown = await parseJsonBody<CreateConversationRequest>(request);
      // 只接受对象中的字符串标题，未提供时使用默认标题。
      const title = isRecord(parsedBody) && typeof parsedBody.title === "string"
        ? parsedBody.title.trim()
        : "New conversation";

      // 拒绝空标题和过长标题，避免脏数据进入数据库。
      if (title.length === 0 || title.length > 100) {
        writeJson(response, 400, { error: "title must be between 1 and 100 characters" } satisfies ErrorResponse);
        return;
      }

      // 调用 Repository 持久化会话。
      const conversation = await conversationRepository.createConversation(title);
      // 新资源使用 201 Created。
      writeJson(response, 201, conversation);
    } catch (error: unknown) {
      // 非法 JSON 返回客户端错误。
      if (error instanceof InvalidJsonError) {
        writeJson(response, 400, { error: error.message } satisfies ErrorResponse);
        return;
      }
      // 让外层统一处理数据库错误。
      throw error;
    }
    return;
  }

  // 查询会话列表：GET /conversations。
  if (request.method === "GET" && pathname === "/conversations") {
    // Repository 负责排序和字段转换。
    const conversations = await conversationRepository.listConversations();
    // 返回会话数组。
    writeJson(response, 200, conversations);
    return;
  }

  // 从路径中取得 /conversations/:id 的会话标识。
  const conversationId = getConversationId(pathname);
  // 从路径中取得 /conversations/:id/messages 的会话标识。
  const messagePathMatch = /^\/conversations\/([^/]+)\/messages$/.exec(pathname);

  // 查询会话详情：GET /conversations/:id。
  if (request.method === "GET" && conversationId !== null) {
    // 查询会话和其消息。
    const conversation: ConversationDetail | null = await conversationRepository.findConversationDetail(conversationId);
    // 资源不存在由 API 层明确返回 404。
    if (conversation === null) {
      writeJson(response, 404, { error: "conversation not found" } satisfies ErrorResponse);
      return;
    }
    // 返回会话详情。
    writeJson(response, 200, conversation);
    return;
  }

  // 使用 Provider 生成完整回复：POST /conversations/:id/chat。
  if (request.method === "POST" && /^\/conversations\/[^/]+\/chat$/.test(pathname)) {
    try {
      // 从路径中提取会话 ID。
      const chatPathMatch = /^\/conversations\/([^/]+)\/chat$/.exec(pathname);
      if (!chatPathMatch) {
        writeJson(response, 404, { error: "Not Found" } satisfies ErrorResponse);
        return;
      }
      // 解码会话 ID。
      const chatConversationId = decodeURIComponent(chatPathMatch[1]);
      // 读取聊天请求。
      const parsedBody: unknown = await parseJsonBody<CreateMessageRequest>(request);
      // 只接受非空 content。
      const content = isRecord(parsedBody) ? parsedBody.content : undefined;
      if (typeof content !== "string" || content.trim().length === 0) {
        writeJson(response, 400, { error: "content is required" } satisfies ErrorResponse);
        return;
      }
      // 通过 ChatService 调用 Provider 并保存 assistant 结果。
      const result = await chatService.generateMessage(chatConversationId, content.trim());
      // 记录本地估算使用量。
      usageMeter.record("default", result.result.usage.totalTokens, 0.01);
      // 返回消息和模型元数据。
      writeJson(response, 201, result);
    } catch (error: unknown) {
      if (error instanceof InvalidJsonError) {
        writeJson(response, 400, { error: error.message } satisfies ErrorResponse);
        return;
      }
      if (error instanceof ConversationNotFoundError) {
        writeJson(response, 404, { error: "conversation not found" } satisfies ErrorResponse);
        return;
      }
      throw error;
    }
    return;
  }

  // 使用 Provider 流式生成：POST /conversations/:id/messages/stream。
  if (request.method === "POST" && /^\/conversations\/[^/]+\/messages\/stream$/.test(pathname)) {
    const streamPathMatch = /^\/conversations\/([^/]+)\/messages\/stream$/.exec(pathname);
    if (!streamPathMatch) {
      writeJson(response, 404, { error: "Not Found" } satisfies ErrorResponse);
      return;
    }
    const controller = new AbortController();
    // 只有请求被客户端异常中止时才取消模型生成。
    request.on("aborted", () => controller.abort());
    // 响应关闭且还没有正常结束时，也取消底层生成。
    response.on("close", () => {
      if (!response.writableEnded) {
        controller.abort();
      }
    });
    // 让正常事件和错误事件共享同一个递增序号。
    let eventId = 1;
    try {
      const parsedBody: unknown = await parseJsonBody<CreateMessageRequest>(request);
      const content = isRecord(parsedBody) ? parsedBody.content : undefined;
      if (typeof content !== "string" || content.trim().length === 0) {
        writeJson(response, 400, { error: "content is required" } satisfies ErrorResponse);
        return;
      }
      startSse(response);
      for await (const event of chatService.streamMessage(decodeURIComponent(streamPathMatch[1]), content.trim(), controller.signal)) {
        writeSseEvent(response, event, eventId);
        eventId += 1;
      }
      response.end();
    } catch (error: unknown) {
      if (!response.headersSent) {
        writeJson(response, error instanceof ConversationNotFoundError ? 404 : 500, { error: error instanceof Error ? error.message : "stream failed" } satisfies ErrorResponse);
      } else if (!response.writableEnded) {
        // 流已经开始时，错误必须使用 SSE 事件而不是切换成 JSON。
        writeSseEvent(response, { type: "error", message: error instanceof Error ? error.message : "stream failed" }, eventId);
        response.end();
      }
    }
    return;
  }

  // 使用本地关键词检索：POST /rag/search。
  if (request.method === "POST" && pathname === "/rag/search") {
    const parsedBody: unknown = await parseJsonBody<{ query?: unknown; text?: unknown; source?: unknown }>(request);
    const queryText = isRecord(parsedBody) && typeof parsedBody.query === "string" ? parsedBody.query : "";
    const documentText = isRecord(parsedBody) && typeof parsedBody.text === "string" ? parsedBody.text : "";
    const source = isRecord(parsedBody) && typeof parsedBody.source === "string" ? parsedBody.source : "inline-document";
    const document = loadDocument({ id: randomUUID(), source, text: documentText });
    const chunks = chunkDocument(document.id, document.source, document.text);
    const hits = retrieveByKeyword(chunks, queryText);
    writeJson(response, 200, { hits, citations: buildCitations(hits), context: buildContext(hits) });
    return;
  }

  // 使用有限步 Agent 执行白名单计算工具：POST /agent/run。
  if (request.method === "POST" && pathname === "/agent/run") {
    const parsedBody: unknown = await parseJsonBody<{ left?: unknown; right?: unknown }>(request);
    const left = isRecord(parsedBody) && typeof parsedBody.left === "number" ? parsedBody.left : NaN;
    const right = isRecord(parsedBody) && typeof parsedBody.right === "number" ? parsedBody.right : NaN;
    const state = await agentRunner.run({ runId: randomUUID(), status: "running", step: 0 }, "calculator", { left, right });
    writeJson(response, state.status === "completed" ? 200 : 400, state);
    return;
  }

  // 暴露本地用量统计，便于理解生产化计量边界。
  if (request.method === "GET" && pathname === "/usage") {
    writeJson(response, 200, usageMeter.get("default"));
    return;
  }

  // 追加一轮 mock 对话：POST /conversations/:id/messages。
  if (request.method === "POST" && messagePathMatch !== null) {
    try {
      // 解码路径中的会话 ID。
      const messageConversationId = decodeURIComponent(messagePathMatch[1]);
      // 读取消息请求体。
      const parsedBody: unknown = await parseJsonBody<CreateMessageRequest>(request);
      // 只接受对象中的 content 字符串。
      const content = isRecord(parsedBody) ? parsedBody.content : undefined;

      // 校验消息正文不能为空或过长。
      if (typeof content !== "string" || content.trim().length === 0 || content.length > 10_000) {
        writeJson(response, 400, { error: "content must be between 1 and 10000 characters" } satisfies ErrorResponse);
        return;
      }

      // Repository 在同一事务中保存用户消息和 mock assistant 消息。
      const messages = await conversationRepository.appendMockTurn(messageConversationId, content.trim());
      // 新增消息使用 201 Created。
      writeJson(response, 201, messages);
    } catch (error: unknown) {
      // 非法 JSON 返回客户端错误。
      if (error instanceof InvalidJsonError) {
        writeJson(response, 400, { error: error.message } satisfies ErrorResponse);
        return;
      }
      // 不存在的会话返回 404，而不是误报成服务器故障。
      if (error instanceof ConversationNotFoundError) {
        writeJson(response, 404, { error: "conversation not found" } satisfies ErrorResponse);
        return;
      }
      // 其他数据库错误交给统一错误处理。
      throw error;
    }
    return;
  }

  // 对未知路径返回标准 404，帮助学习者理解接口边界。
  writeJson(response, 404, { error: "Not Found" } satisfies ErrorResponse);
}

// 启动服务并打印访问地址，便于本地验证。
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

// 处理服务级错误，避免数据库或请求异常导致静默失败。
server.on("error", (error) => {
  console.error("API server error:", error);
});

// 在进程退出前关闭数据库连接池。
process.once("SIGINT", () => {
  void closePool().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void closePool().finally(() => process.exit(0));
});
