// 导入 Node.js 原生 HTTP 服务能力，当前阶段不引入复杂框架。
import { createServer } from "node:http";
// 导入 Node.js 请求对象类型，声明它支持 data、end 和 error 事件。
import type { IncomingMessage } from "node:http";
// 导入共享类型，确保 API 响应与前端契约一致。
import type { EchoResponse, ErrorResponse, HealthResponse } from "@ai-learning-lab/shared";

// 读取环境变量端口，没有配置时使用本地开发常用端口。
const port = Number(process.env.PORT ?? 3001);
// 读取服务版本，没有配置时使用当前学习项目的初始版本。
const version = process.env.APP_VERSION ?? "0.1.0";
// 读取运行环境，没有配置时默认认为是本地开发环境。
const environment = process.env.NODE_ENV ?? "development";

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

// 创建 HTTP 服务，并根据请求路径返回不同响应。
const server = createServer(async (request, response) => {
  // 设置 JSON 响应头，让客户端按 JSON 解析返回值。
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  // 当前阶段实现健康检查，后续会在这里补充数据库和模型状态。
  if (request.method === "GET" && request.url === "/health") {
    // 使用共享类型约束返回对象，避免前后端字段漂移。
    const body: HealthResponse = {
      status: "ok",
      service: "ai-learning-lab-api",
      version,
      environment,
      timestamp: new Date().toISOString(),
    };

    // 返回成功状态和序列化后的 JSON 内容。
    response.writeHead(200);
    response.end(JSON.stringify(body));
    return;
  }

  // echo 接口接收消息后原样返回，用于练习 POST 和 JSON 请求体。
  if (request.method === "POST" && request.url === "/echo") {
    try {
      // 读取客户端发送的完整请求体。
      const rawBody = await readRequestBody(request);
      // 把 JSON 字符串解析为未知数据，避免不可信输入直接当成正确类型。
      const parsedBody: unknown = JSON.parse(rawBody || "{}");
      // 只有非空对象才允许继续读取 message 字段。
      const message = typeof parsedBody === "object" && parsedBody !== null && "message" in parsedBody
        ? parsedBody.message
        : undefined;

      // 校验 message 必须是非空字符串。
      if (typeof message !== "string" || message.trim().length === 0) {
        const error: ErrorResponse = { error: "message is required" };
        response.writeHead(400);
        response.end(JSON.stringify(error));
        return;
      }

      // 使用共享类型约束成功响应。
      const body: EchoResponse = { message };
      response.writeHead(200);
      response.end(JSON.stringify(body));
    } catch {
      // JSON 格式错误时返回明确的 400，而不是暴露内部异常。
      const error: ErrorResponse = { error: "request body must be valid JSON" };
      response.writeHead(400);
      response.end(JSON.stringify(error));
    }
    return;
  }

  // 对未知路径返回标准 404，帮助学习者理解接口边界。
  response.writeHead(404);
  response.end(JSON.stringify({ error: "Not Found" } satisfies ErrorResponse));
});

// 启动服务并打印访问地址，便于本地验证。
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
