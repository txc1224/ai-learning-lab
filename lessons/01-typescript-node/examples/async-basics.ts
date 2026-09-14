// 定义一个可复用的异步任务类型，任务成功时返回字符串。
type AsyncTask = () => Promise<string>;

// 模拟一个需要等待外部服务的异步任务。
function createDelayedTask(name: string, delayMs: number, shouldFail = false): AsyncTask {
  // 返回一个新的异步函数，让调用方决定什么时候执行任务。
  return async () => {
    // 等待指定毫秒数，模拟数据库或模型 API 的网络耗时。
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));

    // 用显式错误模拟外部服务失败。
    if (shouldFail) {
      throw new Error(`${name} failed`);
    }

    // 异步任务成功后返回结果。
    return `${name} completed`;
  };
}

// 按顺序执行任务，后一个任务会等待前一个任务完成。
async function runSequentially(): Promise<void> {
  // 创建第一个任务，但此时还没有真正执行它。
  const loadUser = createDelayedTask("load user", 100);
  // 创建第二个任务，模拟读取会话数据。
  const loadConversation = createDelayedTask("load conversation", 100);

  // 等待第一个任务结束后再继续。
  const userResult = await loadUser();
  // 等待第二个任务结束后再继续。
  const conversationResult = await loadConversation();
  // 输出串行执行的结果。
  console.log("sequential:", userResult, conversationResult);
}

// 并行执行互不依赖的任务，整体等待时间通常更短。
async function runInParallel(): Promise<void> {
  // 创建两个任务，但还没有开始执行任务函数。
  const loadUser = createDelayedTask("load user", 100);
  // 创建第二个独立任务。
  const loadConversation = createDelayedTask("load conversation", 100);

  // 同时调用两个任务，并等待它们全部成功。
  const results = await Promise.all([loadUser(), loadConversation()]);
  // 输出并行执行的结果。
  console.log("parallel:", results);
}

// 演示如何捕获异步任务抛出的错误。
async function runWithErrorHandling(): Promise<void> {
  // 创建一个一定会失败的模拟任务。
  const failingTask = createDelayedTask("model request", 50, true);

  // 用 try/catch 包住 await，捕获预期的失败。
  try {
    // 执行任务，失败时会跳到 catch。
    await failingTask();
    // 这行不会在任务失败时执行。
    console.log("this line is not reached");
  } catch (error) {
    // 将未知错误转换为安全的可展示消息。
    const message = error instanceof Error ? error.message : "unknown error";
    // 输出错误信息，实际项目中应使用结构化日志。
    console.log("handled error:", message);
  }
}

// 统一运行本课示例，并把最外层异常记录出来。
async function main(): Promise<void> {
  // 运行串行示例。
  await runSequentially();
  // 运行并行示例。
  await runInParallel();
  // 运行错误处理示例。
  await runWithErrorHandling();
}

// 启动示例程序。
void main().catch((error: unknown) => {
  // 处理 main 中未被内部捕获的异常。
  console.error("unexpected error:", error);
  // 使用非零退出码告诉脚本调用方程序失败。
  process.exitCode = 1;
});
