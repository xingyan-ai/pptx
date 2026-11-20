# 三种工作方式

`contract.workMode` 决定大纲从哪来、哪些页会被重写。它不改变投影、门禁和导出——三种方式走同一条流水线，区别只在大纲的生成规则和页面的重写范围。

| workMode | 什么时候用 | 大纲从哪来 | 关键约束 |
|---|---|---|---|
| `create`（默认） | 只有主题、材料或想法 | 按沟通契约起草 | 正常流程 |
| `beautify` | 已有演示稿，只想换视觉 | 一页对一页抽原稿，标题与正文逐字保留 | 页数等于原稿；`mode` 固定 `briefing`；`contentDivergence` 固定逐字；只重做视觉 |
| `edit` | 已有演示稿，有明确改动点 | 抽出大纲，标出要改的页 | 至少一页 `changed`；改动页必须写 `changeNote` |

## 1. create：从零新建

输入是主题、场景、语言、密度，加上用户给的正文或材料。

1. 按沟通契约起草大纲，页数由内容和 `readingMode` 决定
2. 用户在确认前可以任意增删改序
3. 确认后走标准投影

这是唯一一种"故事可以被重新组织"的方式。`contentDivergence` 控制贴原文还是重新架构。

### 起草深度

`create` 是唯一需要主动把内容写深的模式：

- 内容页按「结论 → 证据 → 含义 → 动作」写：`points` 是结论，`evidence` 是证据，`soWhat` 是含义，`action` 是下一步。
- `standard` 页目标 3–6 条 `points`、合计 180 字以上；`rich` 页 5–8 条、280 字以上。
- 每条 `points` 写完整判断，不写「护眼」「免打扰」这种关键词。
- 量化内容必须带 `source`，写清来源、日期和口径。
- 占位词（`具体动作` / `若干` / `等等` / `待补充` / `TBD`）在确认前必须换掉。
- 内容装不下时回大纲拆页；不要在执行层删内容、缩字号或把内容推给讲者备注。

### 场景默认值

`scene` 是产品层的默认值包，不是分类器：

- 它填 `communication_intent` / `delivery_context` / `artifact_afterlife` / `readingMode` 的默认值，并给一个 `mode` 建议。
- agent 读完材料后可以改 `mode` 和 `readingMode`；`outline-check` 只在与场景默认不一致时告警，不阻断。
- 主题候选也不锁死；同一场景按客户行业和内容选主题。
- 页数按场景窄范围给建议，`pageBudget` 只是提示；最终页数由用户和材料量决定。

### 事实补齐

只有主题或零散想法时，不要把模型记忆当证据：

- 先按 `runtime/engine/workflows/stages/topic-research.md` 列缺口、找一手来源、记录 `fact_id`。
- 写进 `evidence` 的每个外部数字都要有口径（年份、范围、统计方式），并在 `source` 里写来源。
- 找不到来源的判断，就写成判断，不要伪装成数据；`outline-check` 会对有数字但没有 `source` 的内容页告警。

`beautify` 和 `edit` 不受这条深度要求影响：前者保真，后者只改 `changed: true` 的页。

## 2. beautify：美化已有稿

输入是 `sources/` 里的演示稿。目标是保真换装：文字不动，只换视觉语言。

### 抽取规则

```text
原稿一页        → outline 一页
原稿标题        → title（逐字）
原稿正文        → points（逐条，逐字）
原稿页序        → slides 顺序
原稿页数        → contract.sourceSlideCount
```

- 大纲的 `role`：原稿封面 → `cover`，目录 → `toc`，章节页 → `section`，单图/单数字的冲击页 → `hero`，其余 → `content`，末页是结束语才用 `ending`
- `density` 按原稿页的实际内容量标，不要按用户偏好改
- 不合并、不拆分、不补页、不删页

### 契约固定值

| 字段 | 值 |
|---|---|
| `workMode` | `beautify` |
| `mode` | `briefing` |
| `contentDivergence` | 保持原稿逐字与页结构 |
| `sourceSlideCount` | 原稿页数 |

### 允许改什么

- 视觉主题、配色、字体、组件、装饰
- 页内排版的实现方式（同一份内容换一种布局）
- 图片资源，只要不改变原意

### 不允许改什么

- 标题、正文、页序、页数
- 把两页合成一页，或把一页拆成两页
- 增补原稿没有的结论

如果用户要改内容，切到 `edit`，不要混在美化里做。

## 3. edit：定向改稿

输入是原稿加明确的改动点。目标是最小改动：只重写受影响的页。

### 抽取规则

同 beautify，另外：

- 每页标 `changed: true|false`
- 改动页写 `changeNote`，说明改什么、为什么
- `editScope` 记录所有改动页的 `id`

### 生成规则

- 只重写 `changed: true` 的页
- 未改页沿用原稿，不要顺手"优化"
- 改动页和未改页共用同一套主题，避免视觉断层
- 如果改动导致页数变化，先回大纲（宿主页面或对话）增删，再重投影

### 门禁

`outline-check.mjs` 会拦：

- `edit` 模式没有任何 `changed` 页
- 改动页缺 `changeNote`
- `editScope` 与 `changed` 页不一致

## 选择建议

| 用户的话 | 用哪种 |
|---|---|
| "帮我做一份…" | `create` |
| "这份 PPT 太丑了，换个风格" | `beautify` |
| "把第 3 页的结论改一下" | `edit` |
| "参考这份稿子，重新讲一遍" | `create`，把原稿当素材 |
| "美化一下，顺便把标题改短" | 先 `beautify`，再按 `edit` 处理被改的页 |

判断标准只有一条：**内容要不要动**。不动内容就是 `beautify`，动内容就是 `edit`，没有原稿就是 `create`。
