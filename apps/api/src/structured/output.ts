// 定义结构化模型输出错误，区分“模型返回了内容”与“内容符合契约”。
export class StructuredOutputError extends Error {
  // 保存原始输出，方便开发日志排查；调用方不应直接返回给用户。
  readonly raw: string;

  // 创建结构化输出错误。
  constructor(message: string, raw: string) {
    super(message);
    this.name = "StructuredOutputError";
    this.raw = raw;
  }
}

// 从模型文本中提取第一个 JSON 对象或数组。
export function extractJson(text: string): string {
  // 去掉 Markdown code fence，兼容常见模型格式。
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // 找到对象或数组的起点。
  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");
  const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
  // 没有 JSON 起点时直接拒绝。
  if (start === -1) {
    throw new StructuredOutputError("model output does not contain JSON", text);
  }
  // 截取可能包含前后解释文本的 JSON 主体。
  return cleaned.slice(start);
}

// 解析 JSON 并用自定义校验器验证业务结构。
export function parseStructured<T>(text: string, validate: (value: unknown) => value is T): T {
  const raw = extractJson(text);
  try {
    const value: unknown = JSON.parse(raw);
    if (!validate(value)) {
      throw new StructuredOutputError("parsed JSON does not match the expected schema", text);
    }
    return value;
  } catch (error: unknown) {
    if (error instanceof StructuredOutputError) {
      throw error;
    }
    throw new StructuredOutputError("model output is not valid JSON", text);
  }
}

// 一个教学用的回答结构校验器。
export function isAnswer(value: unknown): value is { answer: string; confidence?: number } {
  return typeof value === "object" && value !== null && "answer" in value
    && typeof value.answer === "string"
    && (!("confidence" in value) || typeof value.confidence === "number");
}
