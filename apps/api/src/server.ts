// 导入 Node.js 原生 HTTP 服务能力，当前阶段不引入复杂框架。
import { createServer } from "node:http";
// 导入共享类型，确保 API 响应与前端契约一致。
import type { HealthResponse } from "@ai-learning-lab/shared";

// 读取环境变量端口，没有配置时使用本地开发常用端口。
const port = Number(process.env.PORT ?? 3001);

// 创建 HTTP 服务，并根据请求路径返回不同响应。
const server = createServer((request, response) => {
  // 设置 JSON 响应头，让客户端按 JSON 解析返回值。
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  // 当前阶段只实现健康检查，为后续模型接口保留清晰入口。
  if (request.method === "GET" && request.url === "/health") {
    // 使用共享类型约束返回对象，避免前后端字段漂移。
    const body: HealthResponse = {
      status: "ok",
      service: "ai-learning-lab-api",
      timestamp: new Date().toISOString(),
    };

    // 返回成功状态和序列化后的 JSON 内容。
    response.writeHead(200);
    response.end(JSON.stringify(body));
    return;
  }

  // 对未知路径返回标准 404，帮助学习者理解接口边界。
  response.writeHead(404);
  response.end(JSON.stringify({ error: "Not Found" }));
});

// 启动服务并打印访问地址，便于本地验证。
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
