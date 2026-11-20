# 大纲契约
> 字段以本文为准。**不要读完整 `schemas/outline.schema.json`**（体积大）；只有本文没覆盖的边界字段，再按需读 schema 的相关片段。

`outline.json` 是一份演示稿的故事事实源。用户在宿主产品的大纲页编辑它；zhongtai-pptx 把它投影成 `design_spec.md` §IX；执行内核只负责投影之后的设计与页面。

机器可读的版本在 `schemas/outline.schema.json`。本文写给客户端和 agent 看。

## 1. 文件长什么样

```json
{
  "schemaVersion": 1,
  "revision": 3,
  "status": "confirmed",
  "source": "user",
  "confirmedAt": "2026-10-21T10:00:00.000Z",
  "contract": {
    "projectName": "墨水屏赛道洞察",
    "primaryLanguage": "zh-CN",
    "scene": "季度经营复盘",
    "audience": "公司管理层",
    "communicationIntent": "汇报赛道进展并推动下一阶段投入",
    "audienceOutcome": "管理层选定一条获得预算的路径",
    "coreMessage": "三个切口已被验证，值得加投",
    "deliveryContext": "20 分钟现场评审",
    "artifactAfterlife": "审批记录",
    "contentDivergence": "balanced",
    "mode": "pyramid",
    "readingMode": "text",
    "canvas": "ppt169",
    "pageBudget": "standard",
    "speakerNotes": "enabled",
    "densityDefault": "standard",
    "themeId": "scientific-atlas"
  },
  "slides": [
    {
      "id": "s02",
      "role": "content",
      "title": "三个切口的共同点是低决策成本",
      "coreMessage": "用户为省心付费，不为功能付费",
      "audienceMove": "从怀疑到认同",
      "points": [
        "护眼不是参数竞赛，而是「看久不累」的体感承诺。",
        "免打扰让用户在通勤和睡前两个场景里不用做选择。",
        "长续航把充电这件事从日常任务里删掉。"
      ],
      "evidence": [
        "513 篇帖子里护眼被提到 144 次，但「护眼不如看纸质书」的反驳出现 37 次。",
        "通勤与睡前合计占使用场景的 61%（4394 条评论人工编码）。"
      ],
      "soWhat": "三个切口卖的都是省心，不是单项参数；参数只能证明，不能说服。",
      "action": "下一版卖点按场景组织，不按硬件参数组织。",
      "source": "小红书 513 篇帖子 / 4394 条评论，2026-08；场景占比为人工编码",
      "density": "rich",
      "draftState": "ready"
    }
  ]
}
```

## 2. 字段规则

### 契约

| 字段 | 规则 |
|---|---|
| `workMode` | `create` / `beautify` / `edit`，默认 `create`。详见 `references/work-modes.md` |
| `sourceSlideCount` | `beautify` 必填，且必须等于大纲页数 |
| `editScope` | `edit` 时记录改动页的 `id`，必须与 `changed: true` 的页一致 |
| `primaryLanguage` | BCP-47 全称，必须带 script 或 region：`zh-CN`，不是 `zh`；`en` 会归一化成 `en-US` 并告警，UI 标签（“English”）不接受 |
| `scene` | 产品层场景预设，见下方「场景默认值」。它填 `communication_intent` / `delivery_context` / `artifact_afterlife` / `readingMode` 默认值，并建议 `mode`；不锁死任何一项 |
| `mode` | `pyramid` / `narrative` / `instructional` / `showcase` / `briefing`，一份稿子一个。场景给建议，agent 可按真实意图改判 |
| `readingMode` | `text` / `balanced` / `presentation`，决定页面粒度。缺省时用场景默认；显式值与场景默认不一致时告警，不阻断 |
| `pageBudget` | `compact` / `standard` / `detailed`，分别对应 5–8 / 9–15 / 16–24 页。只作提示，不是硬门禁 |
| `speakerNotes` | `enabled` / `disabled`，默认 `enabled`。投影会写进 §I；§X 的 `Generation` 必须与它一致 |
| `canvas` | 默认 `ppt169` |
| `themeId` | 只记录。到投影之后、写页面之前才以 `visual` scope 应用 |
| `densityDefault` | `rich` / `standard` / `lean`，新页面的初始密度 |

`scene` 不写进 §I 正文；它通过 `communication_intent` / `delivery_context` / `artifactAfterlife` 和 `readingMode` / `mode` 影响投影。`audience`、`communicationIntent`、`audienceOutcome`、`coreMessage`、`deliveryContext`、`artifactAfterlife` 会逐字写进 §I。

### 场景默认值

| 场景 | 默认 `readingMode` | `mode` 建议 | 主题候选 | 页数窄范围 |
|---|---|---|---|---|
| 通用汇报 | `balanced` | `briefing`（要决策时 `pyramid`） | financial-bluegreen-modern / global-capital-data-journalism / scientific-atlas | 8–12 |
| 竞品调研 | `text` | `pyramid`（纯对比时 `briefing`） | global-capital-data-journalism / scientific-atlas / brutalist-acid / memphis-motion | 12–20 |
| 销售汇报 | `text` | `pyramid` | financial-bluegreen-modern / global-capital-data-journalism | 10–15 |
| 客户方案 | `balanced` | `narrative` | electric-studio / glass-tech-system / coral-3d / brutalist-acid / memphis-motion | 10–15 |
| 行业洞察 | `text` | `pyramid`（纯资料时 `briefing`） | global-capital-data-journalism / scientific-atlas / financial-bluegreen-modern | 12–20 |
| 经营复盘 | `text` | `pyramid`（只同步数字时 `briefing`） | financial-bluegreen-modern / global-capital-data-journalism | 10–15 |
| 培训赋能 | `text` | `instructional`（大教室时 `presentation`） | scientific-atlas / 8-bit-orbit / scatterbrain / rural-green | 10–16 |
| 产品发布 | `presentation` | `showcase`（技术细节多时 `balanced`） | chrome-future / neon-3d / glass-tech-system / brutalist-acid | 6–10 |
| 客户案例（可选） | `balanced` | `narrative` | coral-3d / portfolio-redgreen / financial-bluegreen-modern | 8–12 |

旧标签会归一化：`工作汇报` / `内部汇报` → 通用汇报；`方案提案` → 客户方案；`研究分析` / `行业研究` / `内容洞察` → 行业洞察；`培训讲解` → 培训赋能；`发布介绍` / `产品介绍` → 产品发布；`案例分享` → 客户案例。

### 页面

| 字段 | 必填 | 规则 |
|---|---|---|
| `id` | 是 | kebab-case，跨调序稳定；**不要把它当页号** |
| `role` | 是 | `cover` / `toc` / `section` / `hero` / `content` / `ending`，见下表 |
| `title` | 是 | 页标题，也是 §IX 的 `#### Slide NN - …` |
| `coreMessage` | 是 | 这一页要让人记住的一句 |
| `audienceMove` | 建议 | “从…到…”；缺省写 `—` |
| `points` | 内容页必填 | 这一页真正要说的话，逐条。每条是一句完整判断或短段落，不是关键词；长度不限。投影时用 `；` 连成 `Content` |
| `evidence` | 否 | 支撑 `points` 的事实、数字、引语或观察。字符串或字符串数组 |
| `soWhat` | 否 | 这些证据对读者意味着什么：含义、矛盾或判断，不是复述结论 |
| `action` | 否 | 读者看完这一页该做什么；决策页和行动页必写 |
| `source` | 否 | 页面上可见的来源、日期和口径。量化页必须有 |
| `density` | 否 | `rich` / `standard` / `lean`；缺省用 `densityDefault` |
| `relationships` | 否 | 语义单元及其关系；缺省 `none` |
| `composition` | 否 | 宏观构图方向，**非绑定**；执行层可调整或替换 |
| `template` | 否 | `compose-deck.mjs` 用的版式 key：`cards-3` / `table` / `metrics-4` / `metrics-compare` / `table-metrics` / `content-rich` / `summary` / `structure` / `two-content` 等；缺省按 role 与内容形态推断 |
| `cards` | 否 | `cards-3` / `content-rich` 的卡片数据：`head` / `body` / `footer`，2–4 张；缺省从 `points` 推导 |
| `metrics` | 否 | `metrics-4` / `metrics-compare` / `table-metrics` 的指标：`value` / `unit` / `label` / `note`；缺省从数字中推导 |
| `table` | 否 | `table` / `table-metrics` 的表格：`columns[{label,width}]` + `rows[[...]]` |
| `compare` | 否 | `metrics-compare` / `two-content` 的双栏对比：`left` / `right` 各含 `head` 与 `lines` |
| `layers` | 否 | `structure` 的分层结构：`name` / `text`；缺省沿用原型的 3 层 |
| `takeaway` | 否 | 卡片 / 表格 / 指标下方的结论条 |
| `draftState` | 否 | `ready` / `needs-draft`；确认时不得还有 `needs-draft` |
| `changed` | 否 | `edit` 模式：这一页是否重写 |
| `changeNote` | 否 | `edit` 模式：改动页必填，说明改什么、为什么 |

**页号是派生的。** 数组顺序决定 `Slide 01…NN`，调序后重新编号。不要让用户在界面上编辑页号，那是错误来源。

### 页面类型与页面角色

| `role` | 用途 | 投影到的 `Page role` | 节奏 |
|---|---|---|---|
| `cover` | 封面 | `cover` | anchor |
| `toc` | 目录 | `toc` | anchor |
| `section` | 章节页 | `section` | anchor |
| `hero` | 单句 / 单图 / 单数字的冲击页 | `content` | breathing |
| `content` | 常规内容页 | `content` | dense（精简时 breathing） |
| `ending` | 结尾 | `ending` | anchor |

`hero` 是我们的大纲角色，不是内核的页面角色；投影时它落到 `content`，并在 `Composition` 里写 hero moment。目录页 `points` 可空，执行层从章节标题推导。

### 2.1 内容深度

大纲不是标题清单。内容页要能独立读懂，至少写清「结论 → 证据 → 含义 → 动作」四件事：

| 密度 | 目标 | 结构 |
|---|---|---|
| `standard` | 3–6 条 `points`，`points` + `evidence` + `soWhat` + `action` 合计 ≥180 字 | 至少 1 条证据；含义和动作按页面需要写 |
| `rich` | 5–8 条 `points`，合计 ≥280 字 | 至少 2 条证据；结论、含义、动作齐全 |
| `lean` / `hero` | 一条判断或一个数字 | 不设下限，不硬凑证据 |

- **每条 `points` 写完整句子**，不写「护眼」「免打扰」这种标签。标签只能当分组名，不能当内容。
- **证据要能被读者核对**：数字带年份、范围和口径；引用带来源。没有证据的判断可以写，但要让人看出它是判断。
- **`soWhat` 不是复述**。写「所以呢」，不写「由此可见」。
- **大纲只定义内容，不定义版式**。四层结构不是四段式；同样一组 `points/evidence/soWhat/action` 可以做成排名图、时间轴、矩阵、定位图、对比页、流程页、单一大数字或反色页。
- **`action` 只在页面要求决策或行动时写**；不要把每页都写成行动项。
- **占位词直接阻断**：`具体动作`、`具体能力点`、`若干`、`等等`、`待补充`、`待定`、`TBD`、`详见` 在 `confirmed` 的 create 稿里报错。
- **有数字就要有来源**：内容页出现数字但没写 `source`，`outline-check` 会告警。只有主题、没有材料时，先按 `runtime/engine/workflows/stages/topic-research.md` 补事实，不要凭记忆编数。
- `outline-check.mjs` 对 `confirmed` 的 create 稿：内容页正文 <80 字报错，<180 字警告，`points` <3 条警告。`beautify` 保真、`edit` 只改改动页，两者不受深度门禁影响。

## 3. 用户能做什么

| 操作 | 是否允许 | 备注 |
|---|---|---|
| 增页 | 是 | 新页可先留空，标 `needs-draft`，由 agent 补内容后再确认 |
| 删页 | 是 | 删到只剩封面会被阻断 |
| 调序 | 是 | 投影时重新编号，`P01.svg` 跟着换内容 |
| 改标题 / 核心信息 / 内容点 | 是 | 这些是用户的字段，agent 不得回改 |
| 改密度 | 是 | 影响起草长度和 `page_rhythm`，不影响字号 |
| 改主题 | 可以，但要在应用主题之前 | 应用后换主题需重新 apply |
| 改 `mode` / `contentDivergence` | 只在重新提交时 | 它们属于沟通契约，不是逐页字段 |

## 4. 写回协议

所有权必须明确，否则 agent 和页面会互相覆盖：

| 谁 | 写什么 |
|---|---|
| agent | `status: "draft"`、`source: "agent"`，首次写 `revision: 1` |
| 宿主大纲页 / 调用方 | `status: "confirmed"`、`source: "user"`、`revision + 1`、`confirmedAt` |
| 用户再次编辑 | 再来一轮：`revision + 1`，重新 `confirmed` |

**本 skill 不包含大纲编辑器。** 大纲的编辑和确认由宿主产品负责；没有宿主页面时，在对话里呈现大纲并让用户明确确认，确认结果由宿主或调用方写回。agent 不得自行把 `status` 改成 `confirmed`。

agent 不得在 `confirmed` 之后静默重写 `outline.json`。确需调整，让用户在大纲页或对话里改一版。

应用用户选择时，主题选择也要记来源：

```bash
node scripts/theme-select.mjs choose --theme scientific-atlas --source user \
  --out <project>/theme_selection.json
```

## 5. 投影规则（`outline-to-spec.mjs`）

```text
slides[i]              → #### Slide {i+1}
title                  → 标题行 + Title 字段
coreMessage            → Core message
audienceMove           → Audience move
points.join('；')      → Content
evidence.join('；')    → Evidence（有才写）
soWhat                 → So what（有才写）
action                 → Action（有才写）
source                 → Source（有才写）
relationships || none  → Relationships
composition || 默认    → Composition
slides.length          → §I Page Count
role + density         → spec_lock ## page_rhythm
```

`page_rhythm` 的派生规则：

| 情况 | 值 |
|---|---|
| `cover` / `section` / `ending` | `anchor` |
| 内容页且 `density: "lean"` | `breathing` |
| 其余 | `dense` |

投影是幂等的：同样的 `outline.json` 跑两次，§IX 逐字节相同。`storySignature` 会把 `Content` / `Evidence` / `So what` / `Action` / `Source` 一起比对，删掉其中任何一行都会被 `check-design-spec.mjs` 判成漂移。投影会写入标记：

```markdown
<!-- outline-rev: 4 sha:bb4ad782… -->
```

**重新投影会重建整个 §IX**：之前补的派生行（`Relationships`、`Composition`、图表 / 图片引用）会被清掉。所以改完大纲、重新投影之后，再由 agent 把这些派生行补回去。用户字段不会被这一步影响。

## 6. 门禁会拦什么

`outline-check.mjs`：

- 没有封面页、`id` 重复或不是 kebab-case
- `confirmed` 时缺 `title` 或 `coreMessage`
- 内容页没有 `points`
- 还有 `needs-draft`
- `primaryLanguage` 不是 BCP-47；`zh` / `en` 会归一化并告警
- `readingMode` 非法；缺省时给出场景建议，与场景默认不一致时告警
- `mode` 与场景建议不一致时告警，但不阻断
- `pageBudget` 非法；页数超出场景窄范围或 `pageBudget` 时告警，不阻断
- create 稿的内容页正文 <80 字，或用了占位词
- `themeId` 不在包内

`check-design-spec.mjs`：

- §IX 的标题 / 核心信息 / 内容 / 顺序与 `outline.json` 不一致
- 标记的 `revision`、`sha` 与 `outline.json` 不一致
- `outline.json` 是 `draft` 却已经写了页面

## 7. 和主题的分工

大纲决定**说什么、说几页、每页说多少**；主题只决定**长什么样**。

- 主题永远不写 §IX，也不写页数和页序。
- 主题不决定内容量。`points` / `evidence` / `soWhat` / `action` 写多少，由内容和 `density` 决定。
- `density` 不进契约，只影响起草长度和 `page_rhythm`。
- 主题的字号决定一页的物理上限；目标量超过上限时，回到大纲（宿主页面或对话）拆页，不要在执行层删内容或缩字号。
