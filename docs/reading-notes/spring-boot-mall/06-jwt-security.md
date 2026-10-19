# 第 6 篇：登录后端到底在做什么？JWT、Spring Security 和权限链路

> 原文：[登录后端到底在做什么？JWT、Spring Security 和权限链路](https://juejin.cn/post/7666447843595452425)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端同学熟悉 token、路由守卫和 Axios 拦截器，但这些只是登录的一半：后端的登录/注册/密码哈希怎么实现？JWT 如何签发与校验？Spring Security 过滤器如何在请求到达 Controller 之前把 `Bearer token` 变成可信身份？401 和 403 分别在什么时候发生？

## 关键要点

### 核心概念

- 认证（Authentication）= "你是谁"：用户名密码 + BCrypt 校验。
- 授权（Authorization）= "你能做什么"：角色 USER/ADMIN，规则写在 SecurityConfig。
- 401 vs 403：401 是"我不知道你是谁，或身份证无效"；403 是"我知道你是谁，但你不能进这个房间"。
- JWT = Header.Payload.Signature 三段，**不是加密**——payload 可被 Base64URL 解码，不能放密码、手机号等敏感信息；签名只保证防篡改。
- Bearer token 是"持有者凭证"：谁持有谁能代表用户发请求，不能写日志、不能放 URL。
- BCrypt：带随机盐、计算成本高；同一密码每次 encode 结果都不同，登录用 `matches()` 校验。
- SecurityContext：后端可信的"当前用户 store"，业务代码从这里取用户，绝不相信前端传的 userId。

### 过滤器链位置

请求先过 Servlet Filter 链才到 Controller。`JwtAuthenticationFilter` 继承 `OncePerRequestFilter`；401/403 的请求可能根本没进 Controller——Controller 断点不命中不代表路由不存在。Filter 拦截后要 `clearContext()` 防止线程复用带旧身份。

### 关键代码

```java
// SecurityConfig：URL 规则，越具体的放前面
.requestMatchers("/api/users/**", "/api/admin/**").hasRole("ADMIN")
.requestMatchers("/api/**").authenticated()
// 前后端分离：关掉有状态特性
.csrf(csrf -> csrf.disable())
.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
.formLogin(f -> f.disable()).httpBasic(b -> b.disable()).logout(l -> l.disable())
```

```java
// JWT 签发：subject 只放稳定用户 ID
.subject(String.valueOf(user.getId()))
.claim("username", user.getUsername())
.claim("role", user.getRoleCode())
.issuedAt(now).expiration(expiration)
.signWith(signingKey).compact();

// 角色 authority：hasRole("ADMIN") 自动匹配 ROLE_ADMIN
new SimpleGrantedAuthority("ROLE_" + role.name());
```

- 白名单 `permitAll`：健康检查、注册登录、商品公开接口等。
- 配置：`security.jwt.secret`（默认给本地 dev 值）、`expiration-seconds: 1800`。
- 注册约束：用户名正则 `^[A-Za-z0-9_]{4,30}$`、密码 8~64 且含字母数字；用户名 normalize 转小写；捕获 `DuplicateKeyException` 靠数据库唯一索引兜底并发注册。

### 易错点（节选）

1. 缺 `Bearer` 前缀 = 没带 token，直接 401。
2. CORS 漏放 `Authorization` 头 → 浏览器预检就挂，curl 复现不了。
3. 别把 403 当 token 过期处理（清 token 会让用户困惑），应跳 403 页。
4. JWT payload 不加密，别塞敏感信息。
5. 涉及"我的购物车/订单"必须从 `CurrentUserService.requireCurrentUserId()` 取，否则横向越权。
6. 规则顺序写反：`/api/admin/**` 必须写在 `/api/**` 之前，否则管理员规则失效。
7. `ROLE_` 前缀不匹配是常见 403 原因；未知角色码 fail-fast 立即失败，不静默授错权限。
8. "用户不存在"和"密码错误"返回同一错误 INVALID_CREDENTIALS，防用户名枚举。
9. 即使 JWT 未过期也重查数据库（用户存在且 status==1，用库中 roleCode 构造权限）——停用账号/降权立即生效，比"完全相信 JWT"更稳妥。
10. token 是登录成功的结果不是原因：查用户 → 验哈希 → 查状态 → 才签发。

### 前端侧对照

Axios 请求拦截器加 `Authorization: Bearer ${token}`；响应拦截器区分 401（清 token 跳登录）与 403（跳 403 页）；路由守卫只是体验层，安全边界永远在后端。

## 与 ai-learning-lab 课程的对应

| 本篇概念 | 课程对应 |
| --- | --- |
| JWT 签发/校验、认证中间件 | `lessons/15-auth-rbac-multitenancy` |
| RBAC 角色、URL 权限规则 | `lessons/15-auth-rbac-multitenancy` |
| 多租户数据归属（不信前端传 userId） | `lessons/15-auth-rbac-multitenancy` |
| 401/403 语义、统一错误响应 | `lessons/00-roadmap`（请求响应契约）、`lessons/08-production`（统一错误处理） |
| 前端拦截器/守卫只是体验层 | `lessons/01-typescript-node`（Node 侧实现同等逻辑） |

- 仓库里 `apps/api/src/runtime-auth/` 就是本篇的 TS 版：解析 token → 构造可信身份 → 挂到请求上下文，等价于 JwtAuthenticationFilter + SecurityContext。
- 差异点：Java 生态用 Filter 链 + SecurityConfig 声明式规则；Node/TS 侧通常是中间件 + 手写路由守卫，心智模型可平移。

## 行动清单

- [ ] 读 `apps/api/src/runtime-auth/`，画出"请求进入 → token 校验 → 身份注入 → 路由放行/拒绝"的链路图，对照本篇的 Filter 链位置。
- [ ] 在 `lessons/15-auth-rbac-multitenancy` 练习中实现：未带 token 401、非 admin 访问管理接口 403，并验证错误响应里 code 稳定、message 不泄露"用户是否存在"。
- [ ] 故意把 JWT payload 用 base64 解码一次，直观体会"JWT 不是加密"，检查自己的 token 里有没有敏感字段。
- [ ] 检查仓库中所有取"当前用户"的地方是否都来自可信上下文（而非请求参数/body），发现一处横向越权风险即修复。
