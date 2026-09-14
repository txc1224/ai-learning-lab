// 定义 Agent 工具的参数校验和执行契约。
export interface AgentTool {
  // 工具唯一名称。
  name: string;
  // 给决策层和开发者阅读的工具说明。
  description: string;
  // 高风险工具需要人工确认。
  requiresApproval?: boolean;
  // 在产生副作用前校验参数。
  validate(input: unknown): boolean;
  // 执行工具并返回可序列化结果。
  execute(input: unknown, context: { runId: string }): Promise<unknown>;
}
