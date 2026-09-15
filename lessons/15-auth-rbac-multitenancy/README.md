# 第 15 课：认证、RBAC 与多租户

## 目标

理解资源访问必须同时考虑：

```text
身份 → 租户 → 资源归属 → 角色权限 → 审计
```

代码入口：

- `apps/api/src/runtime-auth/auth-context.ts`：开发环境 mock identity、tenant 和 role。

## 角色

- `owner`：读、写、管理。
- `member`：读、写。
- `viewer`：只读。

## 边界

mock auth 只用于本地学习；真实 OAuth/OIDC、JWT 验证、密钥轮换和生产审计需要独立实现。
