# 第 5 篇：不手写一堆 SQL，后端怎么操作数据库？MyBatis-Plus 入门

> 原文：[不手写一堆 SQL，后端怎么操作数据库？MyBatis-Plus 入门](https://juejin.cn/post/7665920190531010600)，作者 swipe，《从前端到全栈：Spring Boot 项目实战通关》。
>
> 本笔记是蒸馏版，只保留核心问题、概念和结论，细节请读原文。

## 核心问题

前端调 HTTP 接口拿数据，后端却要直接操作 MySQL——Java 如何在不手写大量 SQL 和 JDBC 样板代码（建连接、设参、遍历结果集、关连接）的前提下访问数据库？这篇文章用 MyBatis-Plus 讲清"Java 对象 ↔ 数据库表"的映射机制，让你能读懂商品列表/详情/分类查询的持久层代码。

## 关键要点

### 三层持久化技术

- JDBC：Java 访问数据库的底层标准，类比前端的 `fetch`。
- MyBatis：封装 SQL 映射与结果映射。
- MyBatis-Plus：在 MyBatis 上增强通用 CRUD、分页、Wrapper，像"数据库 API client 生成器"——但它不能替代 SQL 理解，Wrapper 最终仍生成 SQL。

### Entity 与注解映射

```java
@Data
@TableName("mall_product")                       // 类 → 表
public class ProductEntity {
    @TableId(value = "id", type = IdType.AUTO)   // 主键，AUTO 自增回填
    private Long id;
    @TableField("category_id")                   // 列映射
    private Long categoryId;
    private String title;
    @TableField("status_code")
    private String statusCode;
}
```

- 配 `map-underscore-to-camel-case: true` 后下划线列自动转驼峰字段。
- Entity 是表的持久化对象，既不是 Request 也不是 Response。

### Mapper 与 DbService

```java
public interface ProductMapper extends BaseMapper<ProductEntity> {}  // 空接口即有 CRUD

@Service
public class ProductDbService extends ServiceImpl<ProductMapper, ProductEntity> { ... }

@Configuration
@MapperScan("com.example.fullstackmall.service.**.mapper")  // 扫描生成代理 Bean
```

- 分层职责：Controller → Facade → DbService（ServiceImpl）→ Mapper → MySQL。
- DbService 里封装 `requireById` / `requirePublishedById` 这类带业务语义的方法，查不到就抛业务异常。

### Wrapper 查询与分页

```java
lambdaQuery()
    .eq(ProductEntity::getId, productId)
    .eq(ProductEntity::getStatusCode, ProductStatus.ON_SALE.name())
    .one();   // one()/list()/page() 语义分别为单条/多条/分页

LambdaQueryWrapper<ProductEntity> wrapper = Wrappers.lambdaQuery(ProductEntity.class);
if (StringUtils.hasText(keyword)) {
    wrapper.and(c -> c.like(ProductEntity::getTitle, keyword)
                       .or().like(ProductEntity::getDescription, keyword));
}
wrapper.orderByDesc(ProductEntity::getCreatedAt).orderByDesc(ProductEntity::getId);
return page(new Page<>(request.getPageNum(), request.getPageSize()), wrapper);
```

- 用 Lambda 方法引用（`ProductEntity::getStatusCode`）而非字符串字段名，重构安全、类型可查。
- 公开查询强制 `ON_SALE`（不信前端传的 status），后台查询才用请求里的 status。
- 局部更新用 `LambdaUpdateWrapper` + `set(...)`，并检查影响行数，为 0 说明记录不存在。
- 批量查分类用 `listByIds(ids)` 收成 Map，防 N+1。
- 插件：`PaginationInnerInterceptor`（分页生成 LIMIT/OFFSET）与 `OptimisticLockerInnerInterceptor`（基于 `@Version`）。

### 十个易错点

1. 直接把 Entity 返回给前端 → 泄露表结构，应转 Response DTO。
2. 把 Request DTO 直接当 Entity 存 → 状态/时间等必须后端补，DTO 是输入白名单。
3. 以为 MyBatis-Plus 可替代 SQL 基础 → 要能把 Wrapper 翻译成 SQL。
4. 公开查询相信前端 status → 用户可手写 `?status=DRAFT`，后端必须强制兜底。
5. 动态条件不判空 → 产生 `LIKE '%%'` 这类无意义条件。
6. 排序不稳定 → 只按时间排会在同时间翻页重复/遗漏，加 ID 作次级排序。
7. N+1 查询 → 列表逐条查分类会放大 DB 压力，批量查 + Map。
8. `@MapperScan` 路径不匹配 → Mapper Bean 注入失败。
9. 更新后忘删缓存 → 数据库是事实，缓存只是加速副本。
10. 忽略影响行数 → update 返回 0 不能假装成功。

### 排查方法论

按 Controller → Facade → DbService → Entity → 表结构 → 直接查库的顺序取证；注意 local profile 连的是 H2 而非 MySQL，可能造成"查不到数据"的错觉。

## 与 ai-learning-lab 课程的对应

| 本篇概念 | 课程对应 |
| --- | --- |
| 数据库持久化、仓储层（DbService/Mapper） | `lessons/03-postgres-persistence` |
| Entity → Response 的 DTO 转换边界 | `lessons/00-roadmap`（接口契约）、`lessons/03-postgres-persistence` |
| 查询条件动态组装、分页 | `lessons/03-postgres-persistence` |
| 更新后失效缓存的伏笔 | `lessons/08-production`（缓存与生产行为） |

- 仓库里对应角色：`apps/api/src/conversation-repository.ts` 就是 TS 版"DbService"——封装 SQL/查询、对上层暴露业务语义方法，而非让路由直接拼 SQL。
- Node 侧用 pg/Kysely，Java 侧用 MyBatis-Plus，分层思想一致：仓储只管数据，组装和业务判断放上层。

## 行动清单

- [ ] 对照 `apps/api/src/conversation-repository.ts`，把其中一条查询用 MyBatis-Plus 的 `lambdaQuery()` 写法"翻译"一遍，体会 Wrapper 与 SQL 参数组装的对应关系。
- [ ] 在 `lessons/03-postgres-persistence` 的练习里给列表查询加上"关键词 + 分类 + 稳定排序（时间 DESC, id DESC）"，复现本篇的动态条件与次级排序要点。
- [ ] 手写一个 N+1 场景（循环逐条查关联表），再改成批量 `IN` 查询 + Map 组装，用日志对比 SQL 执行次数。
- [ ] 检查自己的仓储方法是否有 `requireXxx` 语义（查不到抛业务异常而非返回 null），不足的补齐。
