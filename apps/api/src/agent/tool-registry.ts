// 导入工具契约。
import type { AgentTool } from "./tool.js";

// 管理 Agent 可以调用的白名单工具。
export class ToolRegistry {
  // 使用 Map 以工具名称快速查找。
  private readonly tools = new Map<string, AgentTool>();

  // 注册工具，禁止重复覆盖已有工具。
  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  // 只返回已显式注册的工具。
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }
}
