// 定义一个可执行的异步任务类型。
export type AsyncTask<T> = () => Promise<T>;

// 定义有限重试策略。
export interface RetryPolicy {
  // 最多尝试次数。
  maxAttempts: number;
  // 第一次重试前的等待时间。
  baseDelayMs: number;
}

// 判断错误是否应该重试；配置、权限和参数错误通常不应重试。
export function isRetryable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "retryable" in error && error.retryable === true;
}

// 给外部 Provider 调用增加有限重试和指数退避。
export async function retryProvider<T>(task: AsyncTask<T>, policy: RetryPolicy, wait: (ms: number) => Promise<void>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error: unknown) {
      lastError = error;
      if (attempt === policy.maxAttempts || !isRetryable(error)) {
        throw error;
      }
      await wait(policy.baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
