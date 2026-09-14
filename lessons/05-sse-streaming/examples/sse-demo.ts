// 导入本课的本地 MockProvider。
import { MockProvider } from "../../../apps/api/src/providers/mock-provider.js";

// 创建不需要数据库和 API Key 的 provider。
const provider = new MockProvider();

// 使用异步函数按事件顺序打印流式结果。
async function main(): Promise<void> {
  // 请求包含 system 和 user 两条消息。
  const request = { model: "mock-model", messages: [{ role: "system" as const, content: "回答要简洁" }, { role: "user" as const, content: "解释 SSE" }] };
  // 按顺序消费 AsyncIterable 事件。
  for await (const event of provider.stream(request)) {
    // 打印每个事件，观察 start、delta 和 done。
    console.log(event);
  }
}

// 启动示例并处理未捕获错误。
void main().catch((error: unknown) => {
  // 输出安全错误信息。
  console.error(error instanceof Error ? error.message : "stream demo failed");
  // 标记脚本异常退出。
  process.exitCode = 1;
});
