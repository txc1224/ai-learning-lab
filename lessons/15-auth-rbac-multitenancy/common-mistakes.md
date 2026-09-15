# 第 15 课常见错误

- 只做登录，不做资源授权。
- Repository 忘记 tenantId 条件。
- 用前端传来的 tenantId 代替服务端身份上下文。
- mock header 当成真实认证。
- 没有审计权限和敏感操作。
