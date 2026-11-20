---
name: clawhive-pptx
description: 大纲优先的 16:9 演示稿 skill。用户先提交主题、场景、语言和页面密度，agent 出大纲，用户确认后脚本把它投影成故事契约，再由执行内核完成设计与页面。支持从零新建、美化已有演示稿、定向改稿三种方式。主题只覆盖视觉，不改版式和内容量。本地导出单文件 HTML，PPTX 走后端。
metadata:
  version: "72.1.0"
  short-description: 大纲确认 → 故事契约 → 视觉主题（不改版式）→ SVG 页面 → HTML / PPTX
  compatibility: Node.js 18+；执行内核的 Python 工具链只在后端执行
---

# ClawHive PPTX

## 自包含

这个包解压出来就能独立工作，不依赖市场、CLI、其他 skill、网络或本机已有字体：

| 自带 | 说明 |
|---|---|
| 执行内核 | `runtime/engine/` 内置子树：设计参考、模板、脚手架与图标库（已裁 `brands` / `sounds` / `simple-icons` / `chunk-filled`） |
| 主题 | 21 套 token、组件、装饰、场景表 |
| 字体 | 10 个 OFL woff2，HTML 导出时内联，不依赖用户装没装 |
| 图标 | 5100+ Tabler / 1500+ Phosphor，随包提供 |
| 脚本 | 只用 Node 内置模块，无 `node_modules` |

自检（含一次离线端到端出稿）：

```bash
node scripts/self-check.mjs --smoke
```

唯一不随包的是 **PPTX 导出**：它按产品架构走后端接口，客户端不跑 Python。除此之外，大纲、契约、主题、页面和 HTML 全部在本地完成。

安装时把包解压到技能的扫描目录即可，不经过市场：

```bash
unzip -q clawhive-pptx-72.0.0.skill -d <skills-root>/
```

这个 skill 分三层：

| 层 | 是什么 | 谁负责 |
|---|---|---|
| 流程层 | 收输入、出大纲、确认、投影、门禁、导出 | 本 skill 的脚本和你的编排 |
| 数据层 | `outline.json` 是故事事实源；`design_spec.md` §IX 是它的投影 | 用户编辑大纲，脚本投影 |
| 执行内核 | 设计契约与页面执行的设计参考；Python 工具链只在后端 | `runtime/engine/`，只读 |

两条边界先记住：

- **故事是数据，不是散文。** 页序、标题、每页核心信息和内容来自 `outline.json`，§IX 由脚本投影生成，agent 不重写。
- **主题是视觉覆盖，不是版式覆盖。** 配色、字体字号、组件画法、装饰随主题走；页边距、块间距、构图倾向、内容量跟内容和用户走。

## 执行内核在哪

```text
ENGINE_DIR = runtime/engine/
```

它随包提供，用户不需要单独安装，也不需要知道它的来源。规则只有四条：

- 把 `ENGINE_DIR/SKILL.md` 当设计参考，**不当执行手册**。它的加载顺序、路由选择和 Step 1/6/7 是给引擎/后端的，客户端不执行；其中写的 `SKILL_DIR` 一律指 `ENGINE_DIR`。
- 只按 `references/engine-usage.md` 的允许清单读 `ENGINE_DIR/references/` 和 `ENGINE_DIR/templates/`，用来写 `design_spec.md` §II–§VIII、§X 和页面。`ENGINE_DIR/workflows/` 默认不读。
- `ENGINE_DIR` 内部只读。`runtime/engine/` 必须保持两级深度（`runtime/engine`），内核用 `SKILL_DIR.parent.parent` 推默认项目目录，再深一层就会算错。完整性校验（打包/CI 跑，客户端不跑）：`python3 runtime/engine/scripts/attribution_guard.py`。
- 引擎参考里与外壳冲突的规则，以本 `SKILL.md` 和 `references/` 为准。

客户端的 Node 脚本不执行内核里的 `python3`，也不照抄引擎的 Step 1–7；内核的 Python 工具链只在后端运行。

### 引擎参考的边界

加载哪些、跳过哪些、哪些资产已裁掉，见 `references/engine-usage.md`。一句话：**引擎是设计参考，不是客户端执行手册。**

## 三种工作方式

提交时先确定 `contract.workMode`。它决定大纲从哪来、哪些页会被重写，不改变后面的投影和导出。

| workMode | 什么时候用 | 大纲从哪来 | 硬约束 |
|---|---|---|---|
| `create`（默认） | 只有主题、材料或想法 | 按沟通契约起草 | 正常流程 |
| `beautify` | 已有演示稿，只想换视觉 | 一页对一页抽原稿，标题与正文逐字保留 | 页数等于原稿；`mode` 固定 `briefing`；`contentDivergence` 固定逐字；只重做视觉 |
| `edit` | 已有演示稿，有明确改动点 | 抽出大纲，标出要改的页 | 至少一页标 `changed`；改动页必须写 `changeNote`；未改页沿用原稿 |

### create：从零新建

1. 收产品侧已选项：场景、语言、篇幅（主题和页面密度可选）；不足时只补一个最关键的问题
2. 不足时用 AskHuman 只补最影响结果的一个问题；`mode` 以提案呈现，不要做成五选一
3. 出大纲草稿（`status: "draft"`）
4. 用户在宿主大纲页或对话里确认
5. 投影 → 写契约 → 门禁 → 应用视觉主题 → 写页面

### beautify：美化已有稿

输入是 `sources/` 里的演示稿。做的是**保真换装**，不是重讲一遍。

1. 逐页抽取：一页原稿 = 一个 outline 页，`title`、`coreMessage`、`points` 逐字来自原稿
2. `contract.workMode = "beautify"`，`mode = "briefing"`，`contentDivergence` 写明保持原稿逐字
3. `contract.sourceSlideCount` 填原稿页数；大纲页数必须相等，否则门禁阻断
4. 用户在确认前可以改标题和内容，但这会破坏保真——确认页要提示这一点
5. 投影后只应用 `visual` scope，版式和页序保持原稿

### edit：定向改稿

1. 抽出大纲，每页标 `changed: true|false`，改动页写 `changeNote`（改什么、为什么）
2. `editScope` 记录改动页的 `id`
3. 只重写改动页；其余页沿用原稿，视觉一致性由同一套主题保证
4. 门禁会检查：`edit` 模式至少一页 `changed`，且每个改动页都有 `changeNote`

## 页面类型

大纲的 `role` 决定这页在稿子里的位置，投影时写进 §IX 的 `Page role`，执行层直接用它作为 `data-pptx-page-role`。

| role | 是什么 | 页面角色 | 节奏 |
|---|---|---|---|
| `cover` | 封面 | `cover` | `anchor` |
| `toc` | 目录 | `toc` | `anchor` |
| `section` | 章节页 | `section` | `anchor` |
| `hero` | 单句、单图或单数字的冲击页 | `content`（带 hero moment） | `breathing` |
| `content` | 常规内容页 | `content` | `dense`，密度精简时为 `breathing` |
| `ending` | 结尾 | `ending` | `anchor` |

规则：

- 封面必备；目录和章节按内容需要，不是每份稿子都要。
- 目录页的 `points` 可以留空，执行层用章节标题推导条目。
- hero 页只放一句判断或一个大数字，超过 3 条内容会告警。
- 目录出现在内容页之后会告警，通常它紧跟封面。

## 主流程

```text
① 建项目 → ② 收输入 → ③ 出大纲草稿 → ④ 用户编辑并确认
   → ⑤ 投影 §IX → ⑥ 写设计契约 → ⑦ 门禁 → ⑧ 应用视觉主题
   → ⑨ 逐页 SVG → ⑩ 导出
```

### ① 建项目

```bash
node scripts/init-project.mjs <project> --name "Deck title"
node scripts/check-inputs.mjs <project>      # 拒绝 PDF / EPUB
```

### ② 收输入：下拉框优先，AskHuman 兜底

产品侧可能已经选了场景、语言和篇幅；主题和页面密度不一定有独立下拉。不要再问一遍，只补最影响结果的一个问题：

| 输入 | 写入 | 用途 |
|---|---|---|
| 主题 | `contract.themeId` | 产品侧提供时只记录；没有就按场景的主题候选推荐。到 ⑧ 才以 `visual` 应用 |
| 场景 | `contract.scene` | 填 `intent` / `delivery_context` / `artifact_afterlife` / `readingMode` 默认值，并建议 `mode`；不锁死 |
| 语言 | `contract.primaryLanguage` | 必须 BCP-47 全称（`zh-CN`，不是 `zh`） |
| 篇幅 | `contract.pageBudget` | `compact` / `standard` / `detailed`，只作页数提示 |
| 页面内容密度 | `contract.densityDefault` | skill 的起草默认值，不要求用户先选；也喂给主题推荐 |

**场景是默认值，不是 mode 锁。** 场景填的是引擎的 `communication_intent` / `delivery_context` / `artifact_afterlife` / `readingMode`，并给一个 `mode` 建议；agent 读完材料后可以改。

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
| 客户案例 | `balanced` | `narrative` | coral-3d / portfolio-redgreen / financial-bluegreen-modern | 8–12 |

- **`mode` 不是分类器**：工作汇报只同步状态就用 `briefing`，要资源就用 `pyramid`；研究分析有结论用 `pyramid`，纯资料用 `briefing`。
- **`readingMode` 跟交付方式走**：会后只读/留档用 `text`，现场讲用 `balanced`，大场/发布/录制用 `presentation`。
- **页数是窄范围，不是硬档位**：`contract.pageBudget` 只是提示（compact 5–8 / standard 9–15 / detailed 16–24），最终页数由用户和材料量决定。
- **语言必须是 BCP-47**：`zh-CN` / `en-US`；`zh` / `en` 会归一化并告警，UI 标签（“中文（简体）”“English”）不能直接写入。

### ③ 出大纲草稿

写 `<project>/outline.json`，`status: "draft"`。字段约定见 `references/outline-contract.md` 和 `schemas/outline.schema.json`。

- `id` 稳定且 kebab-case，调序不变；**页面编号不写进文件**，它由数组顺序派生。
- `points` 是这一页真正要说的话，不是标题的复述。**每条写完整判断或短段落，不写关键词。**
- 内容页按「结论 → 证据 → 含义 → 动作」起草：`points` 写结论，`evidence` 写数字/事实/引语，`soWhat` 写含义，`action` 写下一步。有量化内容的页面必须带 `source`。
- `standard` 内容页目标 3–6 条、合计 180 字以上；`rich` 目标 5–8 条、280 字以上；`lean` / `hero` 才允许一句话或一个数字。
- **`rich` 页用 `text` 页面语法**：完整断言、短段落、表格，不要用三到四张等宽卡片。装不下时按执行内核的顺序：扩区 → 换表达（prose → points）→ 删限定语 → 拆页；不缩字号、不叠文字。
- 不允许用「具体动作」「具体能力点」「若干」「等等」「待补充」「待定」占位；`confirmed` 前必须换成真正的内容。
- 只有主题、没有材料时，先用宿主可用的研究/检索能力补事实和来源；外部数字在 `evidence` 里带口径，在 `source` 里带来源，不要凭记忆编数。
- 空页写 `draftState: "needs-draft"`，不要假装写完了。

### ④ 用户编辑大纲

大纲的编辑和确认由宿主产品负责：宿主的大纲页渲染 `outline.json`，增页、删页、调序、改每页标题和内容、改密度；页面写回时把 `status` 置为 `confirmed`、`source` 置为 `user`、`revision` 加一。**本 skill 不提供、也不启动本地大纲编辑器。**

没有宿主页面时，在对话里呈现大纲（页序、每页标题、核心信息和内容），让用户明确确认；确认结果由宿主或调用方写回 `outline.json`。agent 不自行把 `status` 改成 `confirmed`。

**大纲是用户的地盘。** agent 在 `confirmed` 之后不得静默重写；用户再改一版，页面或调用方会把 `revision` 再加一。

### ⑤ 投影 §IX

```bash
node scripts/outline-to-spec.mjs <project>
```

这是 `design_spec.md` §IX 的**唯一写入者**，做的是确定性投影：

| `outline.json` | `design_spec.md` |
|---|---|
| 数组顺序 | `#### Slide 01…NN`（每次重排都重新编号） |
| `title` / `coreMessage` / `audienceMove` / `points` | 同名字段，逐字写入 |
| `slides.length` | §I `Page Count` |
| `role` + `density` | `spec_lock.md` 的 `page_rhythm`（`anchor` / `dense` / `breathing`） |
| 契约字段 | §I 的受众、意图、结果、核心信息、场合、去向、阅读模式、工作方式 |

同时在 §IX 开头写一行 `<!-- outline-rev: N sha:… -->`，门禁用它和页序指纹判断 §IX 有没有被手改。

`design_spec.md` 不存在时，从内核 scaffold 生成，并补上 scaffold 缺的 §VII 和 §V `Spacing anchors` 行。

### ⑥ 写设计契约

按内核的 Strategist 方法补 §II–§VIII 和 §X：画布边距、配色（未选主题时）、字体字号、图标、可视化引用、图片资源、备注设置。

- **§IX 的用户字段只读。** `Title`、`Core message`、`Content`、页数、页序都由 ⑤ 决定；可以在每页补 `Relationships`、`Composition`、`Visualization` 这类派生行，不能改用户那五个字段。
- 写完不得留 `[fill]` 或 `{{…}}` 占位符，门禁会阻断。

### ⑦ 门禁

```bash
node scripts/outline-check.mjs <project>
node scripts/check-design-spec.mjs <project>
```

阻断项见下方「门禁」。过了门禁才允许写第一页。

### ⑧ 应用视觉主题

用户选过主题时才执行。**默认用 `visual`**：

```bash
node scripts/apply-theme.mjs <project> --theme scientific-atlas --scope visual
```

`visual` 写完会打印 `§V spacing / composition / continuity untouched`，`theme_overlay.json` 里 `layoutFieldsTouched` 为空、`layout.changed` 为 `false`。这两项是"主题没碰版式"的自证。

### ⑨ 页面执行

按内核 executor 的约定逐页写 `svg_output/P01.svg …`，页数和页序与 §IX 对齐。页面只用 `spec_lock.md` 里的 token；主题覆盖后以覆盖后的 token、`## components` 和 `## decoration` 为准。

内容页按 `Content` / `Evidence` / `So what` / `Action` 组织信息，但**这不是版式模板**。同样四层内容可以做成排名图、时间轴、矩阵、定位图、对比页、流程页、单一大数字或反色页；一套 deck 至少出现 3 种宏观构图，连续两页不要复用同一种左右分栏。只有 `hero` 和 `density: "lean"` 的页面才用「大数字 / 一句话」；也不要把每个内容页都做成三张 KPI 卡加大留白。

- `beautify` 与 `edit` 模式只重写需要重写的页，其余页沿用。
- 内容装不下时回到大纲（宿主页面或对话）拆页，不要在执行层删内容或缩字号。

```bash
node scripts/check-theme-fidelity.mjs <project>   # 装饰与组件是否真的用上了
node scripts/check-fonts.mjs --theme <id>         # 字体最终渲染成什么
```

### ⑩ 导出

```bash
node scripts/svg-deck-to-html.mjs <project>
node scripts/pptx-backend-client.mjs <project> --endpoint "$DECK_STUDIO_PPTX_ENDPOINT" --token "$DECK_STUDIO_TOKEN"
```

## 门禁

### `outline-check.mjs` 拦什么

- 没有封面页；`id` 重复或不是 kebab-case
- `confirmed` 时缺 `title` 或 `coreMessage`；内容页没有 `points`
- `readingMode` 非法；缺省时给出场景建议，场景与阅读模式冲突时告警
- `mode` 缺省时给出场景建议；与场景建议不一致时告警，但不阻断
- `pageBudget` 非法；页数超出场景窄范围或 `pageBudget` 时告警，不阻断
- create 稿的内容页正文 <80 字，或使用占位词；<180 字、`points` <3 条告警
- 还有 `draftState: "needs-draft"`
- `primaryLanguage` 不是 BCP-47；`zh` / `en` 会归一化并告警；`themeId` 不在包内
- `beautify`：`mode` 不是 `briefing`，或页数与 `sourceSlideCount` 不符
- `edit`：没有任何 `changed` 页，或改动页缺 `changeNote`

### `check-design-spec.mjs` 拦什么

- 缺 §I–§X 任一章节；`[fill]` / `{{…}}` 占位符未清
- §I Page Count 与 §IX 数量不符；Slide 编号不连续
- §IX 的用户字段或页序与 `outline.json` 不一致，或 `revision` / `sha` 过期
- `outline.json` 还是 `draft` 却已经有页面
- `svg_output/` 页面数与契约不符或编号不连续
- 主题 overlay：scope 非法、视觉 scope 带了版式字段、或改了 §V 版式行

## 常见失败与处置

| 现象 | 原因 | 处置 |
|---|---|---|
| `§IX page titles, messages or content do not match outline.json` | 有人手改了 §IX | 回到大纲（宿主页面或对话）改，重跑 `outline-to-spec.mjs` |
| `outline.json status=draft; confirm the outline before authoring pages` | 没确认就写了页面 | 让用户在大纲页或对话里确认 |
| `design_spec.md still has scaffold placeholders` | 契约没写完 | 补 §II–§VIII、§X |
| `theme overlay scope=visual touched layout field(s)` | 用错了 scope 或手改了 overlay | 重新 `apply-theme --scope visual`；确需版式用 `layout` |
| `§V has no place to write Spacing anchors` | 契约的 §V 结构不完整 | 补 `Spacing posture` 或 `Cross-page continuity` 行 |
| 页面文件数与契约不符 | 调序后没重投影，或手工增删了页 | 重跑 `outline-to-spec.mjs`，再按新页序生成 |
| `beautify` 页数不符 | 抽页时漏了或合并了原稿页 | 回到大纲，按原稿逐页补 |

## 快速命令

```bash
# 自检
node scripts/self-check.mjs --smoke

# 项目
node scripts/init-project.mjs <project> --name "Deck title"
node scripts/check-inputs.mjs <project>

# 故事
node scripts/outline-check.mjs <project>
node scripts/outline-to-spec.mjs <project>
node scripts/outline-to-spec.mjs <project> --check   # 只校验，不写入
node scripts/check-design-spec.mjs <project>

# 主题
node scripts/theme-select.mjs recommend --brief-json '{"goal":"季度经营复盘","density":"dense"}' --limit 5
node scripts/theme-select.mjs choose --theme scientific-atlas --source user --out <project>/theme_selection.json
node scripts/theme-furniture.mjs scientific-atlas --out /tmp/scientific-atlas.svg
node scripts/apply-theme.mjs <project> --theme scientific-atlas --scope visual
node scripts/check-theme-fidelity.mjs <project>
node scripts/check-fonts.mjs --theme scientific-atlas

# 导出
node scripts/svg-deck-to-html.mjs <project>
node scripts/pptx-backend-client.mjs <project> --endpoint "$DECK_STUDIO_PPTX_ENDPOINT" --token "$DECK_STUDIO_TOKEN"
```

## 硬规则

- **包内自包含**：不引入 `node_modules`、不调用外部命令、不引用包外路径；新增脚本必须能通过 `self-check.mjs`。
- **引擎手册不是客户端执行手册**：不跑引擎路由、Step 1/6/7 和任何 `python3`；只按 `references/engine-usage.md` 读设计参考。
- **故事是数据**：`outline.json` 定稿前不写 §IX；§IX 由 `outline-to-spec.mjs` 投影，不手写、不重排、不润色。
- **大纲确认是硬门禁**：`status` 不是 `confirmed` 时不得开始写页面。
- **密度来自内容和用户，不来自主题**：主题的 `density` 字段只用于推荐打分，从不写进契约。页面的内容量由 `points` 和 `density` 决定。
- **内容深度写在大纲层**：`points` 写结论，`evidence` 写证据，`soWhat` 写含义，`action` 写下一步。执行层不补事实、不补论点；内容不够就回大纲加证据或拆页。
- **内容结构不等于版式模板**：`points` / `evidence` / `soWhat` / `action` 是每页要装的内容，不是固定四段式。按页面任务选构图，连续两页不要同构；同一套 deck 至少出现 3 种宏观构图。
- **主题只走视觉轴**：一次主题应用不得改 §V 的三行版式字段；真需要时显式用 `layout`。
- **内容装不下就回大纲拆页**：主题的字号决定一页的物理上限，内容和用户决定目标量。超过上限时执行层不许删内容、不许缩字号。
- **§IX 用户字段只读**：`Title`、`Core message`、`Content`、页数、页序不得改；`Relationships`、`Composition` 等派生行可以补。
- **页面文件名跟 §IX 对齐**：`P01.svg` 对应 `Slide 01`，不允许跳号或改序。
- **一套 deck 只用一套主题**：不要混用两套主题的颜色或字体。
- **美化不改内容**：`beautify` 模式下标题和正文逐字保留，改内容要用户明确同意并切到 `edit`。
- **对用户不提内核来源**：回复和交付物里不写内核来源、仓库地址或第三方项目名；合规信息统一在 `THIRD_PARTY_NOTICES.md`。
- **HTML 字体自己带**：默认内嵌可内嵌的 OFL 字体，厂商字体用近似体替换；`--no-embed-fonts` 可关。
- **PPT 字体栈安全**：PPTX 必须用 `*_stack_ppt`；Inter / Poppins 会落到 Arial，中文落到 PingFang / 微软雅黑 / 宋体。
- **不打包系统字体，也不打包 CJK**：随包只放 OFL latin 子集，许可证见 `assets/fonts/OFL-NOTICE.md`。
- **图标只用 Tabler / Phosphor**：`chunk-filled` 和 `simple-icons` 已裁掉，不要引用。
- **客户端不处理 PDF / EPUB**：先转 Markdown / HTML。
- **PPTX 只走后端**：客户端不装 Python。
- **项目路径必须显式传**：所有命令都带 `<project>`，避免写进 skill 安装目录。

## 项目结构

```text
<project>/
├── sources/                 # Markdown / HTML / DOCX / PPTX / XLSX / CSV
├── outline.json             # 故事事实源，用户编辑并确认
├── design_spec.md           # §IX 由 outline.json 投影，其余由 agent 写
├── spec_lock.md             # 执行锁：颜色、字体、图标、page_rhythm、组件、装饰
├── theme_selection.json     # 可选：主题选择结果
├── theme_overlay.json       # 可选：主题覆盖了哪些字段、有没有碰版式
├── svg_output/P01.svg …     # 页面源
├── svg_final/               # 自包含预览
├── notes/                   # 可选演讲备注
├── validation/              # 质检与导出报告
└── exports/                 # HTML / PPTX
```

## 主题结构

```text
themes/
├── catalog.json               # 21 套主题索引
├── cards/                     # 原始主题卡：palette / typography / mood / density
├── tokens/                    # 展开后的 PPT-safe token（含 components 与 decoration）
├── packages/<id>/             # 契约片段、组件与装饰片段 + theme.css
├── overrides.json             # 人工审阅后的颜色/降级修正
├── decorations.profiles.json  # 按 visualStyle 家族的装饰默认值
├── decorations.overrides.json # 按主题的装饰修正
├── components.profiles.json   # 按家族的组件默认值
├── components.overrides.json  # 按主题的组件修正
├── scenarios.json             # 场景与意图表：适合什么、不适合什么
└── fonts.map.json             # 字体策略：内嵌 / 替代 / 系统
```

## §V 的归属

| 位置 | 归属 | 谁能写 |
|---|---|---|
| `### Deck-wide Direction` 的三个 bullet（Spacing anchors / Composition tendency / Cross-page continuity） | 版式轴 | 内容和用户；主题只在 `layout` scope 下写 |
| `### Component System`、`### Decoration System` | 视觉轴 | 主题的 `components` / `decoration` / `visual` |

## 参考

- `references/engine-usage.md`：引擎参考的允许清单、不执行的命令与失效资产
- `references/work-modes.md`：三种工作方式的具体规则
- `references/outline-contract.md`：大纲的字段、编辑操作、写回协议
- `schemas/outline.schema.json`：给宿主大纲页/调用方的机器契约
- `references/design-contract.md`：项目目录、§I–§X 契约、§IX 投影与门禁
- `references/stage1-theme-selection.md`：主题选择、场景推荐、scope 与轴
- `references/html-output.md`：HTML deck 的行为和打印
- `references/pptx-backend.md`：后端 API 契约
- `references/commercial-boundary.md`：商用边界、字体、图标、许可证
- `references/fonts.md`：字体内嵌与替换策略
- `ENGINE.md`：内核版本、只读边界、完整性校验和升级步骤
- `ENGINE_DIR/SKILL.md`：内核参考手册（不是客户端执行手册），只按 `references/engine-usage.md` 读；`SKILL_DIR` = `ENGINE_DIR`

## 交付约定

- 故事事实源：`<project>/outline.json`
- 故事契约：`<project>/design_spec.md` §IX（投影产物）
- 页面源：`<project>/svg_output/`
- HTML：`<project>/exports/<name>_<timestamp>.html`
- PPTX：由后端返回，保存到 `<project>/exports/<name>_<timestamp>.pptx`
- 主题覆盖记录：`<project>/theme_overlay.json`
