# 第 15 课完成笔记

## 本课解决什么

AI SaaS 不能只判断“用户是否登录”，还要判断用户属于哪个租户、角色是否允许动作、资源是否属于该租户。

## 权限链路

```text
身份 → tenantId → 资源归属 → role → action → 审计
```

## Mock Auth 的意义

开发环境 mock identity 用来验证权限逻辑和租户过滤，不代表真实身份认证。生产必须验证 token、签名、过期、密钥轮换和撤销。

## 已验证与边界

`parseMockAuth` 和 `can` 可以本地运行；数据库 tenant 归属、跨租户集成测试、OAuth/OIDC 尚未完成。
