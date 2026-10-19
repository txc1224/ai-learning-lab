# 第 3 篇：Axios 请求进了后端之后：Controller、Request、Response 是怎么接住它的？

> 原文：[Axios 请求进了后端之后：Controller、Request、Response 是怎么接住它的？](https://juejin.cn/post/7665633271011590180)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

HTTP 请求如何被 Spring Boot 路由到 Controller？URL 路径参数、query、JSON body 怎么变成 Java 对象？为什么必须返回统一 `ApiResponse<T>` 而不能把 Entity 直接丢给前端？目标是能"从接口地址反推 Controller 方法"，也能从方法推导前端传参与响应结构；思维从"调用接口的人"转为"定义接口契约的人"。

## 关键要点

- `@RestController`：类被 Spring 扫描为 Bean，方法返回值序列化为 JSON；类级 `@RequestMapping("/api/products")` + 方法级 `@GetMapping("/{id}")` 组成完整 URL——很多 404 是忘了类级前缀。
- 参数接收三种方式：
  - `@PathVariable` 绑定 URL 动态段 `{id}`（类比 Vue Router 的 `route.params.id`）；类型转换失败（如 `/abc`）在进方法前就报错；
  - GET 用 query 参数绑定到 Query DTO（如 ProductQueryRequest），不用 body；
  - `@RequestBody` 把 JSON body 转成 Java 对象，配合 `@Valid` 触发校验。
- 三种模型边界不可混用：Request DTO 是"输入白名单"，Response DTO 是"输出契约"，Entity 是"数据库映射"。
- Request DTO 不接收 id（数据库生成）、createdBy（登录上下文）、createdAt（服务端生成）、状态字段（走专门接口）；校验用 `@NotNull/@NotBlank/@Size/@Min/@Max` 并带中文 message。
- 统一响应 `ApiResponse<T>`：code（稳定业务码，前端应判 code 而不是中文 message）、message（给人看）、data、traceId（联调定位）、timestamp（Instant UTC 时间）。
- `ResponseEntity` 精细控制 HTTP 状态码：创建成功返回 201；协议层状态码与业务层 code 配合，不互相替代。
- 校验失败抛 `MethodArgumentNotValidException`，由 `@RestControllerAdvice` 的 GlobalExceptionHandler 统一转 400 + fieldErrors；兜底 Exception 只对外返回通用 INTERNAL_ERROR，堆栈只进日志（安全设计）。
- Controller 示例骨架：

```java
@RestController
@RequestMapping("/api/products")
public class ProductController {
    @Resource
    private IProductFacade productFacade;   // 面向接口编程，Controller 保持"薄"

    @GetMapping("/{id}")
    public ApiResponse<ProductDetailResponse> detail(@PathVariable Long id, HttpServletRequest req) {
        return ApiResponse.success(productFacade.getPublishedProduct(id), TraceIdContext.get(req));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductDetailResponse>> create(@Valid @RequestBody ProductCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(productFacade.createProduct(req)));
    }
}
```

- 分页 Query DTO 必须有默认值和上限（pageNum=1、pageSize=10、pageSize ≤ 100）保护数据库；公开接口服务端强制只查 ON_SALE，不信任前端传的 status。
- 公开接口 `/api/products` 与管理接口 `/api/admin/products` 的路径、权限、约束都应分开。
- 易错点精选：GET 误用 JSON body；POST 忘加 `Content-Type: application/json`；所有错误都返回 200；Controller 堆业务逻辑；JSON 解析/类型转换/@Valid 失败发生在进方法前，断点打在方法里看不到；响应字段要克制（不返回成本价、审核备注等内部字段）。

## 与 ai-learning-lab 课程的对应

| 原文概念 | 课程映射 |
|---|---|
| 路由、路径参数、query、JSON body 接收 | lessons/00-roadmap（HTTP 路由/请求响应） |
| 统一错误处理、校验失败转 400、异常兜底 | lessons/01（异步与错误处理） |
| DTO + 校验注解 ↔ FastAPI 的 Pydantic 模型 | lessons/02（Python/FastAPI 对照） |
| traceId/requestId、统一响应、日志 | lessons/08、16（生产化） |
| 公开接口与管理接口权限分离 | lessons/15（认证权限多租户） |

## 行动清单

- [ ] 在 apps/api/src/server.ts 选两个路由，分别写出路径参数、query、body 三种入参的接收方式，对照 `@PathVariable` / Query DTO / `@RequestBody`。
- [ ] 给一个接口补齐入参校验与统一错误响应（对照 lessons/01 的错误处理模式），用 curl 验证非法参数返回 400 而不是 500。
- [ ] 用 curl 分别触发成功、校验失败、404 三种情况，记录响应 JSON，检查是否包含稳定业务码与 requestId/traceId。
- [ ] 检查是否存在"所有错误都返回 200"或"Entity 直接透出给前端"的写法，各修一处。
