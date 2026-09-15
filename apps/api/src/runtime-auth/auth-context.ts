// 定义开发环境中的用户身份。
export interface AuthContext {
  // 用户唯一标识。
  userId: string;
  // 租户唯一标识。
  tenantId: string;
  // 当前用户角色。
  role: "owner" | "member" | "viewer";
}

// 解析开发环境 mock auth header，生产环境应替换为真实验证。
export function parseMockAuth(header: string | undefined): AuthContext {
  // 没有 header 时使用明确的本地开发身份。
  if (!header) return { userId: "dev-user", tenantId: "dev-tenant", role: "owner" };
  // 约定格式：mock userId tenantId role。
  const [scheme, userId, tenantId, role] = header.split(" ");
  if (scheme !== "mock" || !userId || !tenantId || !["owner", "member", "viewer"].includes(role)) {
    throw new Error("invalid mock authorization header");
  }
  return { userId, tenantId, role: role as AuthContext["role"] };
}

// 判断角色是否拥有指定能力。
export function can(context: AuthContext, action: "read" | "write" | "admin"): boolean {
  if (action === "read") return true;
  if (action === "write") return context.role === "owner" || context.role === "member";
  return context.role === "owner";
}
