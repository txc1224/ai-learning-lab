# Part 4 讲义：简历智能分析系统（多 Agents 协同实战）

> 阶段目标（对应课程图）：**了解 FDE 能力版图，真实落地多 Agents 协同场景**。
> 这是毕业项目：把 Part 1 的全栈交付、Part 2 的 AI 协作规范、Part 3 的 Agent 框架全部用上，
> 落地一个跨语言（Python/Java/Go）多服务协同的真实系统。
> 节奏：第 19～24 周，每周一个可交付物。

## FDE 是什么（先建立视野）

FDE（Forward Deployed Engineer，前置部署工程师）：贴近客户场景、用产品 + 少量定制代码把 AI 能力真实落地
的工程师角色，是当前 AI 公司扩张最快的岗位之一。能力版图 ≈ 本课程四部分的加总：

```text
需求建模（P1-站3） + 工程交付（P1 全部） + AI 协作规范（P2） + Agent 框架（P3） + 场景落地（本部分）
```

---

## 第 19 周：系统架构与领域建模

### 系统总览（对应课程图结构，必须能白板画出）

```text
┌─────────────────────────── txc-node 底座 ───────────────────────────┐
│  前端 Vue3+Vite │ SSR/CSR │ API 服务 NestJS │ 领域模型               │
│  Agent 编排 │ Tool/Skill │ MCP Client │ RAG 检索 │ Prompt 上下文管理   │
└──────────┬───────────────────┬───────────────────┬───────────────────┘
           ▼                   ▼                   ▼
   Python MCP 服务      Java MCP 服务        Go MCP 服务
   （简历解析）          （简历算分）          （岗位匹配）
           └────────┬──────────┴─────────┬─────────┘
                    ▼                    ▼
          Qdrant + RAG（评分标准库）   多 Agents 协同工作
```

### 领域建模（用 Part 1 站 3 的方法，先做这个再写代码）

```text
聚合根 Resume（简历）：file 元数据、解析状态机（uploaded→parsed→scored→matched→reported）
聚合根 JobPosition（岗位）：岗位描述、抽取的硬性要求（学历/年限/技能清单）
聚合根 AnalysisReport（分析报告）：总分、维度分项（每项带依据引用）、匹配岗位列表、改进建议
值对象：ScoreDimension{ name, weight, score, evidence[] }、Evidence{ source, quote, standardId }
仓储：ResumeRepository / JobRepository / ReportRepository
领域规则示例：报告一旦生成不可变，重析产生新版本；评分必须逐项携带 Evidence，无依据的分数不合法
```

### 实操任务

1. 建 `projects/02-resume-analyzer` monorepo：`apps/web`、`apps/api`（NestJS）、`services/parser-py`、`services/scorer-java`、`services/matcher-go`、`infra/`（compose 与 K8s 清单）。
2. 领域类型入库 `packages/shared`（TS 类型为契约源），Python/Java/Go 侧用 schema 文件同步（OpenAPI 或 JSON Schema 生成）——**契约先行，禁止各语言手写字段**。
3. NestJS API 骨架：上传接口 + 状态查询接口，先跑通「上传 → 状态机流转」的最小闭环。

### 验收标准

- [ ] 架构图与领域模型评审通过（自己讲 10 分钟无卡壳）。
- [ ] 三语言服务的空壳能被 compose 拉起，健康检查全绿。
- [ ] 契约文件为唯一字段来源，三语言类型均由它生成。

---

## 第 20 周：Python MCP 服务——简历解析

### 为什么是 Python

文档解析生态最强：`pdfplumber` / `python-docx` / 结构抽取库齐全；配合 Pydantic 做严格 schema 校验。

### 服务契约

```text
MCP 工具：parse_resume(file_uri) →
{
  "candidate": { "name": "...", "email": "...", "phone": "...", "yearsOfExperience": 5 },
  "education": [ { "school": "...", "degree": "本科|硕士|博士", "major": "...", "period": {...} } ],
  "experiences": [ { "company": "...", "title": "...", "period": {...},
                     "highlights": ["..."], "skills": ["k8s", "FastAPI"] } ],
  "warnings": [ "第 2 页存在乱码，已跳过" ]     // 解析不出就说解析不出，禁止编造
}
```

### 实现要点

1. FastMCP（Python MCP SDK）起服务：stdio 供本地调试，Streamable HTTP 供容器编排。
2. PDF 走 `pdfplumber` 提文本；可选增强：调用 LLM 把「非结构化文本 → Pydantic 结构」并校验（结构化输出，复用 Part 3 层 2/6）。
3. **诚实性规则**：识别失败的字段置空并写 `warnings`，绝不猜——这直接复用仓库纪律「不伪造业务数据」。
4. 契约测试：3 份不同排版样例简历（正常 / 扫描件 / 乱码）入库，输出必须通过 JSON Schema 校验。

### 验收标准

- [ ] 样例简历端到端解析出结构化 JSON 且过 schema。
- [ ] 乱码样例：不崩溃、warnings 明确、无编造字段。
- [ ] NestJS 侧通过 MCP Client 成功发现并调用本服务（动态发现，非硬编码）。

---

## 第 21 周：Java MCP 服务——简历算分

### 为什么是 Java

规则引擎与领域建模生态成熟，评分这种「规则密集 + 强一致」逻辑适合 JVM；同时让你具备多语言团队协作视角。

### 服务契约

```text
MCP 工具：score_resume(resume: Resume, position: PositionRequirements) →
{
  "totalScore": 78,
  "dimensions": [
    { "name": "学历匹配", "weight": 0.2, "score": 85,
      "evidence": [ { "source": "resume.education[0]", "quote": "XX大学 硕士",
                      "standardId": "std-edu-02" } ] },        // 每项必须带依据
    { "name": "经验年限", ... }, { "name": "技能覆盖", ... }
  ],
  "ruleTrace": [ "rule years>=5 -> +20 (hit: 6y)" ]          // 规则命中轨迹，可解释
}
```

### 实现要点

1. Spring Boot 3 + Spring AI 的 MCP Server 支持（或通用 MCP Java SDK）。
2. 评分 = 规则引擎（条件 + 加权），维度与权重**配置化**（JSON/YAML 配置热加载），不要硬编码 if/else 堆山。
3. 评分标准从哪来：本服务向 Qdrant 标准库检索对应维度的评分标准片段作为 `standardId` 依据（第 23 周接上，本周先用本地 mock 标准占位并标注）。
4. 可解释性是核心需求：`ruleTrace` 让每个分数能回答「为什么是 78」。

### 验收标准

- [ ] 改权重配置不改代码，分数即时变化（热加载演示）。
- [ ] 任一维度分数缺失 Evidence 时服务拒绝出分（领域规则在服务端强制）。
- [ ] 与 Python 服务的契约由共享 schema 生成，无手抄字段。

---

## 第 22 周：Go MCP 服务——岗位匹配

### 为什么是 Go

匹配检索是并发密集型：批量拉取岗位、并发打分、合并排序——goroutine + channel 的主场。

### 服务契约

```text
MCP 工具：match_jobs(candidateProfile, topK=10) →
{
  "matches": [ { "jobId": "...", "title": "...", "matchScore": 0.87,
                 "matchedSkills": ["k8s","Go"], "missingSkills": ["Rust"],
                 "reason": "技能重合 12/15，年限满足" } ]
}
```

### 实现要点

1. `net/http` + 官方 MCP Go SDK（`github.com/modelcontextprotocol/go-sdk`）。
2. 匹配策略两层：**向量召回**（候选与岗位描述 embedding 相似度，Qdrant）→ **规则精排**（硬性条件过滤：学历/年限/地点，weighted overlap 打分）。
3. 并发实现：worker pool 并发处理岗位候选，`errgroup` 收集错误，单岗位失败不阻塞整体并在响应里标注。
4. 性能目标：1000 岗位候选 P95 < 500ms，用 benchmark 证明。

### 验收标准

- [ ] 向量召回 + 规则精排两层生效（关闭任一层结果明显不同，可演示）。
- [ ] benchmark 数据入库；单岗位失败被隔离标注。
- [ ] 三个语言服务风格统一：同样的健康检查、同样的错误结构、同样的契约来源。

---

## 第 23 周：Qdrant + RAG——评分标准库

### 要解决的问题

「凭什么这么评分」——把 HR 的评分标准（文档、历史 JD、面试评价维度）变成**可检索、可引用**的知识库，让每个分数有出处。

### 实现要点

1. Qdrant 容器化接入（compose）；集合设计：`scoring_standards`（评分标准）、`job_desc_vectors`（岗位向量）。
2. 入库管线（复用 Part 3 层 5 五步法）：标准文档解析 → 按条款切分（每条带 `standardId`、维度、版本元数据）→ embedding → 入库。
3. 检索接入：Java 算分时按维度检索标准片段 → 填充 `Evidence.standardId`；回答报告时引用可回溯到标准原文条款。
4. 版本化：标准库支持多版本（`version` 字段过滤），报告记录生成时的标准版本——标准改了历史报告不变。

### 验收标准

- [ ] 报告中每个维度分都能点出「依据哪条标准」（原文引用 + standardId）。
- [ ] 标准库更新到 v2，历史报告仍引用 v1（版本隔离有测试）。
- [ ] 检索命中率：10 个标准问题 ≥ 9 个命中正确条款。

---

## 第 24 周：多 Agents 编排与端到端交付

### Agent 编排设计（对应课程图「多 Agents 协同工作」）

```text
Orchestrator（NestJS 内，复用 Part 3 层 1）
  ├─ 解析 Agent   → 调 Python MCP：文件 → Resume 结构
  ├─ 算分 Agent   → 调 Java MCP：Resume + 岗位要求 → 带依据的分数
  ├─ 匹配 Agent   → 调 Go MCP：Profile → Top-K 岗位
  └─ 报告 Agent   → 汇聚三者 + 检索标准库 → 生成 Markdown 分析报告（LLM 润色，事实部分只准引用上游结构化数据）
状态传递：结构化对象沿 DAG 传递，每步产物落库（可断点重跑，失败从失败步续跑，复用第 10 课幂等思想）
人工确认点：报告生成前可预览各步中间产物（对应第 14 课审批模式）
```

### 端到端交付清单

1. **一键起**：`docker compose up` 拉起全部六个组件（web、api、三语言服务、Qdrant），README 一页说明。
2. **主链路**：上传 PDF → 30 秒内得到带引用的报告与岗位匹配。
3. **可观测**：Trace 面板看到每个 Agent 步骤（输入/输出/耗时/token）；任一服务宕机有明确错误提示与重试入口。
4. **评测**：5 份标准简历 × 2 个岗位的回归集，报告关键事实（姓名/年限/总分区间）与金标准一致率 100%。

### 毕业验收（对外演示标准）

- [ ] 现场从零 clone 到 demo 全流程 ≤ 15 分钟（含 compose 拉起）。
- [ ] 人工注入故障：杀掉 Java 服务 → 系统提示「算分服务不可用，已暂停在 scored 前一步」而非出错误报告；恢复后续跑成功。
- [ ] 报告可解释性抽查：任意维度分数 → 追到标准原文条款。
- [ ] 全链路 Trace 完整回放一次分析。
- [ ] 更新 `99-interview-highlights.md` 项目三亮点，录 3 分钟演示视频。

---

## 常见坑（本部分专属）

- **契约漂移**：三语言各自定义字段，改一处漏两处。解法：schema 文件为源，CI 校验三端类型同步。
- **编排里写业务规则**：Orchestrator 只做流程与状态，评分规则归 Java、匹配规则归 Go——规则进编排层就是架构腐烂开始。
- **LLM 润色时「补细节」**：报告的事实字段只允许从上游结构化数据渲染，LLM 只负责组织语言——护栏按第 18 周方法校验。
- **服务间无超时**：Python 解析大文件拖死整条链路，每个 MCP 调用必须有独立超时与降级提示。

---

## 毕业后：能力版图对照（自查）

| FDE 能力 | 本项目中的落点 | 掌握证据 |
| --- | --- | --- |
| 场景建模 | 领域模型 + 状态机 | 第 19 周产出 |
| 跨语言服务 | Py/Java/Go 三 MCP 服务 | 第 20～22 周产出 |
| 知识工程 | Qdrant 标准库 + 引用 | 第 23 周产出 |
| Agent 编排 | Orchestrator + 多 Agent DAG | 第 24 周产出 |
| 质量与信任 | 护栏 + 评测 + Trace + 可解释 | 第 24 周验收 |
| 交付运维 | compose/K8s + 故障演练 | 毕业验收 |
