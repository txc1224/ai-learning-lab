// 定义一个不接收参数、异步返回泛型结果的任务类型。
export type AsyncTask<T> = () => Promise<T>;

// 定义有限重试所需的配置结构。
export interface RetryOptions {
  // 限制一次任务最多执行多少次，避免无限重试。
  maxAttempts: number;
  // 控制第一次重试前等待多久，后续会使用指数退避。
  delayMs: number;
}

// 创建一个可复用的延迟函数，模拟网络或数据库耗时。
export function delay(delayMs: number): Promise<void> {
  // 用 Promise 包装定时器，等时间结束后才继续执行。
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

// 模拟一个需要等待外部服务的异步任务。
export function createDelayedTask(name: string, delayMs: number, shouldFail = false): AsyncTask<string> {
  // 返回一个新的异步函数，让调用方决定什么时候真正执行任务。
  return async () => {
    // 等待指定毫秒数，模拟数据库或模型 API 的网络耗时。
    await delay(delayMs);

    // 用显式错误模拟外部服务失败。
    if (shouldFail) {
      throw new Error(`${name} failed`);
    }

    // 异步任务成功后返回结果。
    return `${name} completed`;
  };
}

// 返回一个 500 毫秒后得到模型名称的异步任务。
export function getModelName(): Promise<string> {
  // 复用延迟函数，模拟读取模型配置或请求模型服务。
  return delay(500).then(() => "mock-model");
}

// 为任意异步任务增加超时限制。
export function withTimeout<T>(task: AsyncTask<T>, timeoutMs: number): Promise<T> {
  // 拒绝无意义的零或负数超时配置。
  if (timeoutMs <= 0) {
    // 配置错误应立即抛出，而不是启动一个永远超时的任务。
    return Promise.reject(new Error("timeout must be greater than zero"));
  }

  // 创建一个新的 Promise，同时等待任务完成或超时计时器触发。
  return new Promise((resolve, reject) => {
    // 创建超时计时器，时间到了就拒绝这个 Promise。
    const timer = setTimeout(() => reject(new Error("operation timed out")), timeoutMs);

    // 执行真正的异步任务。
    void task().then(
      // 任务成功时清理计时器并向调用方返回结果。
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      // 任务失败时清理计时器并把原始错误继续向上抛出。
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// 为容易受到临时网络错误影响的任务增加有限重试。
export async function withRetry<T>(task: AsyncTask<T>, options: RetryOptions): Promise<T> {
  // 校验最大尝试次数，保证循环一定可以结束。
  if (options.maxAttempts < 1) {
    // 配置错误应该尽早暴露。
    throw new Error("maxAttempts must be at least one");
  }

  // 记录最近一次失败，最终无法恢复时把它交给调用方。
  let lastError: unknown;

  // 按最大尝试次数执行任务。
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      // 尝试执行一次任务，成功时立即返回结果。
      return await task();
    } catch (error: unknown) {
      // 保存当前错误，供所有尝试失败后抛出。
      lastError = error;

      // 达到最大次数后不再等待或重试。
      if (attempt === options.maxAttempts) {
        break;
      }

      // 使用指数退避，让外部服务获得恢复时间。
      const waitMs = options.delayMs * 2 ** (attempt - 1);
      await delay(waitMs);
    }
  }

  // 理论上一定有错误，但未知类型仍需提供安全兜底。
  throw lastError instanceof Error ? lastError : new Error("operation failed after retries");
}

// 按顺序执行任务，后一个任务会等待前一个任务完成。
export async function runSequentially(): Promise<void> {
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
export async function runInParallel(): Promise<void> {
  // 创建两个任务，但此时还没有执行任务函数。
  const loadSettings = createDelayedTask("load settings", 100);
  // 创建第二个独立任务。
  const loadNotifications = createDelayedTask("load notifications", 100);

  // 同时调用两个任务，并等待它们全部成功。
  const results = await Promise.all([loadSettings(), loadNotifications()]);
  // 输出并行执行的结果。
  console.log("parallel:", results);
}

// 演示如何捕获异步任务抛出的错误。
export async function runWithErrorHandling(): Promise<void> {
  // 创建一个一定会失败的模拟任务。
  const failingTask = createDelayedTask("model request", 50, true);

  // 用 try/catch 包住 await，捕获预期的失败。
  try {
    // 执行任务，失败时会跳到 catch。
    await failingTask();
    // 这行不会在任务失败时执行。
    console.log("this line is not reached");
  } catch (error: unknown) {
    // 将未知错误转换为安全的可展示消息。
    const message = error instanceof Error ? error.message : "unknown error";
    // 输出错误信息，实际项目中应使用结构化日志。
    console.log("handled error:", message);
  }
}

// 演示第一次失败、第二次成功的有限重试流程。
export async function runWithRetry(): Promise<void> {
  // 记录任务执行次数，让示例可控地模拟临时失败。
  let attempts = 0;

  // 定义一个第二次执行才成功的任务。
  const eventuallySuccessfulTask = async (): Promise<string> => {
    // 每执行一次就增加计数。
    attempts += 1;
    // 第一次执行模拟网络抖动。
    if (attempts === 1) {
      throw new Error("temporary network failure");
    }
    // 第二次执行返回成功结果。
    return "model request completed";
  };

  // 最多尝试三次，每次重试前等待 20 毫秒。
  const result = await withRetry(eventuallySuccessfulTask, { maxAttempts: 3, delayMs: 20 });
  // 输出最终成功结果和实际尝试次数。
  console.log("retry:", result, "attempts:", attempts);
}

// 统一运行本课示例，并把最外层异常记录出来。
async function main(): Promise<void> {
  // 运行串行示例。
  await runSequentially();
  // 运行并行示例。
  await runInParallel();
  // 运行错误处理示例。
  await runWithErrorHandling();
  // 运行重试示例。
  await runWithRetry();
}

// 仅在直接执行此文件时启动演示，导入它做测试时不会自动输出。
if (import.meta.url === `file://${process.argv[1]}`) {
  // 启动示例程序，并捕获未处理的最外层异常。
  void main().catch((error: unknown) => {
    // 记录未被内部处理的异常。
    console.error("unexpected error:", error);
    // 使用非零退出码告诉脚本调用方程序失败。
    process.exitCode = 1;
  });
}
