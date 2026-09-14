// 定义 Agent 执行的生命周期状态。
export type AgentStatus = "running" | "waiting_approval" | "completed" | "failed";

// 描述一次 Agent 运行状态。
export interface AgentState {
  // 运行唯一标识。
  runId: string;
  // 当前状态。
  status: AgentStatus;
  // 已执行步骤数。
  step: number;
  // 等待确认的工具名称。
  pendingTool?: string;
  // 最后一次结果或错误。
  result?: unknown;
}
