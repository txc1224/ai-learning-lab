// 定义 Agent 可以执行的有限状态。
export type AgentStatus = "running" | "waiting_approval" | "completed" | "failed";

// 定义工具执行上下文。
export interface ToolContext {
  // 当前运行标识。
  runId: string;
}

// 定义白名单工具接口。
export interface Tool {
  // 工具唯一名称。
  name: string;
  // 工具说明，供决策层理解用途。
  description: string;
  // 是否需要人工确认。
  requiresApproval?: boolean;
  // 在执行前校验参数。
  validate(input: unknown): boolean;
  // 执行工具并返回可序列化结果。
  execute(input: unknown, context: ToolContext): Promise<unknown>;
}

// 定义工具注册表，只允许注册和调用显式工具。
export class ToolRegistry {
  // 保存工具白名单。
  private readonly tools = new Map<string, Tool>();

  // 注册一个工具，重复名称直接拒绝。
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  // 查找工具，未注册工具返回 undefined。
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
}

// 描述 Agent 当前运行状态。
export interface AgentState {
  // 运行唯一标识。
  runId: string;
  // 当前状态。
  status: AgentStatus;
  // 已执行步骤数。
  step: number;
  // 等待审批时保存的工具名称。
  pendingTool?: string;
  // 最终输出或错误信息。
  result?: unknown;
}

// 定义一个有限步工具执行器。
export class AgentRunner {
  // 创建运行器时注入工具注册表和步数上限。
  constructor(private readonly registry: ToolRegistry, private readonly maxSteps = 5) {}

  // 执行一个已选择的工具调用。
  async run(state: AgentState, toolName: string, input: unknown, approved = false): Promise<AgentState> {
    // 超过步数上限时立即失败，防止 Agent 无限循环。
    if (state.step >= this.maxSteps) {
      return { ...state, status: "failed", result: "maximum agent steps exceeded" };
    }

    // 只允许调用注册表中的工具。
    const tool = this.registry.get(toolName);
    if (!tool) {
      return { ...state, status: "failed", result: `tool not found: ${toolName}` };
    }

    // 工具参数不合法时不执行副作用。
    if (!tool.validate(input)) {
      return { ...state, status: "failed", result: `invalid arguments for: ${toolName}` };
    }

    // 高风险工具必须先暂停等待人工确认。
    if (tool.requiresApproval && !approved) {
      return { ...state, status: "waiting_approval", pendingTool: toolName };
    }

    try {
      // 执行工具并推进步骤计数。
      const result = await tool.execute(input, { runId: state.runId });
      // 成功后返回完成状态和工具结果。
      return { ...state, status: "completed", step: state.step + 1, result, pendingTool: undefined };
    } catch (error: unknown) {
      // 工具失败时返回安全错误，不暴露内部堆栈。
      const message = error instanceof Error ? error.message : "tool execution failed";
      return { ...state, status: "failed", step: state.step + 1, result: message };
    }
  }
}

// 创建一个本地计算器工具，避免执行任意代码。
export const calculatorTool: Tool = {
  name: "calculator",
  description: "计算两个数字的加法",
  validate(input: unknown): boolean {
    return typeof input === "object" && input !== null && "left" in input && "right" in input
      && typeof input.left === "number" && typeof input.right === "number";
  },
  async execute(input: unknown): Promise<unknown> {
    // validate 已保证这里是对象，但执行层仍保持窄化。
    const values = input as { left: number; right: number };
    return { value: values.left + values.right };
  },
};
