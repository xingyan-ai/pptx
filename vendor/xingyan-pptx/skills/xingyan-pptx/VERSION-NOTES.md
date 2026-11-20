# V72.1.0 — 内容密度接回 Reading Mode

内容密度不再只当字数配额，而是接回内核已有的 Reading Mode 与页面语法。

- `references/design-contract.md` 新增“内容密度与 Reading Mode”映射：丰富 → `text`，标准 → `balanced`，精简 → `presentation`
- `SKILL.md` 明确 rich 页用 text 页面语法：完整断言、短段落、表格；不用三到四张等宽卡片
- 装不下时按内核顺序：扩区 → 换表达 → 删限定语 → 拆页；不缩字号、不叠文字
- `outline-check.mjs` 增加两条告警：rich 页 <280 字；`readingMode=presentation` 页 >160 字

不改 schema、不加版式库、不动引擎。

# V72.0.0 — 移除本地大纲编辑器

从 V72 开始单独走版本线，不再沿用 71.x 的补丁号。这一版只改外壳，不动 `runtime/engine/`。

## 移除本地大纲编辑器

- 删除 `scripts/outline-editor-server.mjs` 和 `package.json` 的 `outline:edit`。
- 大纲的编辑与确认归宿主产品；skill 只消费 `outline.json`，不启动 `127.0.0.1:5056`。
- 没有宿主页面时，在对话里呈现大纲并让用户明确确认；确认结果由宿主/调用方写回，agent 不自行把 `status` 改成 `confirmed`。
- 清理 `SKILL.md`、`README.md` 和 `references/` 里的启动命令与「本地兜底」说明。

## 引擎参考边界

- 新增 `references/engine-usage.md`：引擎是设计参考，不是客户端执行手册；列出允许读的参考、不执行的 Python 命令、失效资产和冲突权威顺序。
- `SKILL.md` / `ENGINE.md` 不再把引擎 `SKILL.md` 当执行手册；`workflows/` 默认不读，客户端不执行引擎的 Step 1–7 和任何 `python3`。

## 场景一致性

- 9 个场景统一：`SKILL.md`、`README.md`、`references/outline-contract.md` 与 `scripts/lib/scenes.mjs` 对齐；`self-check` 增加文档场景列表校验。

# V71.2 — 场景默认值、语言归一化、页数窄范围

这一版把产品下拉和引擎合同对齐，不再把“场景”当成 mode 分类器。

## 9 个场景默认值

`scripts/lib/scenes.mjs` 定义：

- 通用汇报、竞品调研、销售汇报、客户方案、行业洞察、经营复盘、培训赋能、产品发布、客户案例

每个场景填的是引擎的：

- `communication_intent` / `delivery_context` / `artifact_afterlife` 默认文字
- `readingMode` 默认值
- `mode` 建议（不是锁）
- 主题候选
- 页数窄范围

旧标签会归一化：工作汇报 → 通用汇报，方案提案 → 客户方案，研究分析 / 行业研究 / 内容洞察 → 行业洞察，培训讲解 → 培训赋能，发布介绍 → 产品发布。

## 合同默认值不是锁

- `readingMode` 缺省时用场景默认；显式值与场景默认不一致时只告警。
- `mode` 缺省时用场景建议；显式值不一致时只告警。
- 页数超出场景窄范围或 `pageBudget` 时只告警；页数仍由用户和材料量决定。

## 语言归一化

- `zh` / `zh-CN` / `zh-Hans` → `zh-CN`
- `zh-TW` / `zh-Hant` → `zh-TW`
- `en` / `en-US` → `en-US`
- UI 标签（“中文（简体）”“English”）不接受；`zh` / `en` 归一化时告警。

## 页数

`contract.pageBudget` 新增：`compact` 5–8 / `standard` 9–15 / `detailed` 16–24。它只是提示，不是硬门禁。

## 投影

`outline-to-spec.mjs` 现在会：

- 用场景默认补缺失的 `audience` / `communicationIntent` / `audienceOutcome` / `deliveryContext` / `artifactAfterlife`
- 用场景默认补缺失的 `readingMode` 和 `mode`
- 把归一化后的语言写进 `spec_lock.md`
- 在 §I `Content Strategy` 里写明 `mode` 是否来自场景默认、以及 `pageBudget`
- 把 `speakerNotes` 写进 §I；`check-design-spec` 会检查它和 §X 的 `Generation` 是否一致

## 对齐修补

- `schemas/outline.schema.json`：`mode` / `readingMode` 不再 required（场景可补）；新增 `speakerNotes`
- `beautify` 缺 `mode` 时默认 `briefing`，不再直接报错
- `svg-deck-to-html.mjs`：`<html lang>` 从 `outline.json` 读取并归一化，不再写死 `zh-CN`
- `pptx-backend-client.mjs`：请求体带 `deck.language`，每页 SVG 根节点补 `lang`
- `SKILL.md` / `outline-contract.md`：主题候选改成完整 theme id；安装命令改成 71.2.0
- `self-check.mjs`：校验 9 个场景的字段、阅读模式、mode、页数范围和主题 id，并检查场景标签是否进了主题表
- 产品侧旧标签仍可用：工作汇报→通用汇报、方案提案→客户方案、研究分析→行业洞察、培训讲解→培训赋能、发布介绍→产品发布

# V71.1 — 大纲可以写深，页面不再默认空

这一版修的是「内容太薄」，不是视觉。

## 新增的大纲字段

内容页现在可以带四层结构，不再只有一行 `Content`：

```json
{
  "points": ["结论一", "结论二", "结论三"],
  "evidence": ["支撑结论的数字、事实或引语"],
  "soWhat": "这些证据对读者意味着什么",
  "action": "读者下一步做什么",
  "source": "来源、日期、口径"
}
```

投影到 §IX 时分别写成 `Content` / `Evidence` / `So what` / `Action` / `Source`，执行层能看到完整的论证，而不是一句标题复述。

## 阅读模式按场景分流

- 汇报 / 复盘 / 决策 / 评审 / 研报 / 分析 / 培训 → `text`
- 提案 / 案例 / 品牌故事 → `balanced`
- 发布会 / 产品亮相 / 路演 / 演讲 → `presentation`

`outline.json` 没写 `readingMode` 时按 `scene` 推断；写了就以用户为准。场景是留档材料但用了 `presentation` 时会告警。

## 内容深度门禁

`outline-check.mjs` 对 `confirmed` 的 create 稿新增：

- 内容页正文 <80 字：error
- 内容页正文 <180 字：warning
- `points` <3 条：warning
- 占位词（`具体动作`、`具体能力点`、`若干`、`等等`、`待补充`、`待定`、`TBD`、`详见`）：error

`lean` / `hero` 页不设下限；`beautify` 与 `edit` 不受影响。深度只数 `points` / `evidence` / `soWhat` / `action`，不拿标题和来源凑字数。

## 兼容性

- `points` 仍是字符串数组，老的大纲不用改。
- 新增字段全部可选；不写时投影与旧版逐字节一致。
- `storySignature` 会把新增字段纳入漂移检查：大纲有证据、§IX 被删掉证据，会报 `§IX ... do not match outline.json`。

# V71 — 改名 clawhive-pptx

这个包正式归入 `clawhive-pptx` 这条技能线，版本号 V71。

## 变化

| 项 | 旧 | 新 |
|---|---|---|
| 技能名 / 安装目录 | `clawhive-deck-studio` | `clawhive-pptx` |
| 版本 | `0.8.1` | `v71` |
| 安装包 | `clawhive-deck-studio-0.8.1.skill` | `clawhive-pptx-v71.skill` |

内容不变：0.8.1 的大纲优先流程、三种工作方式、视觉/版式双轴、自包含检查全部保留。

## 页面类型补全

大纲的 `role` 从四种扩到六种，覆盖内核已有的页面角色：

| role | 页面角色 | 节奏 |
|---|---|---|
| `cover` 封面 | `cover` | anchor |
| `toc` 目录 | `toc` | anchor |
| `section` 章节页 | `section` | anchor |
| `hero` 冲击页 | `content`（hero moment） | breathing |
| `content` 内容页 | `content` | dense / breathing |
| `ending` 结尾 | `ending` | anchor |

- 投影时把页面角色写进 §IX 的 `Page role`，执行层直接用作 `data-pptx-page-role`
- 目录页可以没有 `points`，条目由章节标题推导
- hero 页超过 3 条内容、目录出现在内容页之后，都会告警
- 校对文档里过时的页面角色枚举（原先只写 `cover|content|ending`）

## 目录与 hero 的版式语言

21 套主题卡和 token 都新增两个字段：

- `tocStructure`：这套主题的目录页怎么排
- `heroStructure`：这套主题的冲击页怎么排

投影时，如果用户没有写 `Composition`，目录页和 hero 页会拿到对应的主题散文，写成 `主题建议（非绑定）：…`；用户写了就以用户的为准。封面和章节页的 `coverStructure` / `sectionStructure` 仍然只作参考，不写进契约。

例如：

```markdown
#### Slide 02 - 目录
- **Page role**: toc
- **Composition**: 主题建议（非绑定）：sparse list with hairline rules and one ink dot per chapter
```

`self-check.mjs` 会检查 21 套主题是否都有这两个字段。

改名后要和旧安装区分开：

```bash
T="<tenant>"
rm -rf "$T/SKILLs/clawhive-deck-studio"
unzip -q clawhive-pptx-v71.skill -d "$T/SKILLs/"
```

不要保留旧目录，否则两个 id 会同时出现在技能列表里。

# V0.8.1 — 自包含是可验证的

包解压出来就能独立跑，这条现在有脚本证明，不再靠说明。

## 新增 `scripts/self-check.mjs`

```bash
node scripts/self-check.mjs --smoke
```

结构审计：

- 必需文件齐全（内核、脚手架、schema、21 套主题、字体、图标）
- 21 套主题都含 `colors` / `typography` / `decoration` / `components`
- 字体表里的每个 woff2 都随包存在
- 所有脚本只 import Node 内置模块和本地 lib，没有 `node_modules`
- 脚本里没有绝对路径、用户目录、外部命令（`python3` / `openclaw` / `npx` / `playwright` / `ffmpeg` / `curl` / `wget`）
- 内核完整性（宿主有 Python 时顺带校验）

离线烟测：

- 在临时目录建项目 → 写大纲 → 投影契约 → 应用主题 → 写 3 页 SVG → 过门禁 → 导出单文件 HTML
- 断言 HTML 不引用任何外部 URL，且字体以 `data:font/woff2` 内联

## 修掉导出的文件名

旧的时间戳处理会留下一个点，产出 `deck_20261021064410..html`。现在固定为 14 位数字。

## 边界写清楚

- HTML、大纲、契约、主题、页面：完全本地
- PPTX：按产品架构走后端接口，客户端不跑 Python。这是唯一不随包的能力，已在 SKILL.md 和 README 顶部写明

## 安装

不需要市场，不需要 CLI，把包解压到技能扫描目录即可。

## 验收

| 检查 | 结果 |
|---|---|
| `self-check.mjs --smoke` | 全部 ok，含离线出稿 |
| 隔离环境（`env -i`，仅 HOME/PATH） | 全流程通过 |
| HTML 外部 URL | 0（除 SVG 命名空间） |
| 字体内联 | `data:font/woff2` 存在 |
| 包内 `node_modules` | 无 |
| 脚本外部 import | 0 |

# V0.8.0 — 内核收进子树，补上三种工作方式

## 内核中性化

- 内核树从原路径搬到 `runtime/engine/`，深度仍是两级，内核用 `SKILL_DIR.parent.parent` 推默认项目目录，行为不变
- 文档里只保留一个变量：`ENGINE_DIR = runtime/engine/`，不再出现内核的名称、来源或仓库地址
- 新增 `ENGINE.md`（替代旧的升级说明）：版本、只读边界、完整性校验、升级步骤、裁剪清单
- 署名与许可证地址集中到 `THIRD_PARTY_NOTICES.md`；这是合规文件，其余文档、回复和交付物不引用内核来源
- 新增硬规则：对用户的回复和交付物不写内核来源、仓库地址或第三方项目名
- 历史版本说明里的名称同步改为中性表述

完整性不受影响：校验器按自身文件位置解析，不认目录名。

```bash
python3 runtime/engine/scripts/attribution_guard.py   # integrity ok
```

## 三种工作方式

`contract.workMode` 决定大纲从哪来、哪些页会被重写：

| workMode | 场景 | 大纲来源 | 硬约束 |
|---|---|---|---|
| `create`（默认） | 只有主题或材料 | 按沟通契约起草 | 正常流程 |
| `beautify` | 已有演示稿，只换视觉 | 一页对一页抽出，逐字保留 | 页数等于 `sourceSlideCount`；`mode` 固定 `briefing`；只做视觉 |
| `edit` | 已有演示稿加明确改动点 | 抽出大纲并标改动页 | 至少一页 `changed`；改动页必须有 `changeNote`；`editScope` 与改动页一致 |

- 新增 `references/work-modes.md`：三种方式的抽取规则、允许改什么、不允许改什么
- `schemas/outline.schema.json` 增加 `workMode`、`sourceSlideCount`、`editScope`、`changed`、`changeNote`
- `outline-check.mjs` 增加对应门禁；`outline-to-spec.mjs` 把工作方式写进 §I `Content Strategy`

## 文档

- `SKILL.md` 重写为流程说明：三层结构、三种工作方式、十步主流程、门禁清单、常见失败与处置
- 不再复述内核步骤，只写本 skill 自己拥有的规则和入口

## 验收

| 检查 | 结果 |
|---|---|
| `runtime/engine` 完整性校验 | integrity ok |
| 文档中内核名称 | 0 处（`THIRD_PARTY_NOTICES.md` 除外） |
| `create` 标准流程 | 大纲 → 投影 → 门禁 → visual 主题 → 0 error |
| `beautify` 页数不符 | 阻断 |
| `beautify` 用非 `briefing` 模式 | 阻断 |
| `edit` 无改动页 | 阻断 |
| `edit` 改动页缺 `changeNote` | 阻断 |
| 主题 `visual` scope | 仍不改 §V 三行版式字段 |

# V0.7.0 — 故事先成数据，主题只碰视觉

两个问题一起解决：故事在用户看到之前就被 agent 写死了；主题一应用就把版式也改了。

## 大纲成为事实源

- **`outline.json`**：页序、每页标题、核心信息、内容点、密度。用户在大纲页增删改序，`status` 改为 `confirmed`、`revision` 加一。
- **`scripts/outline-check.mjs`**：封面、`id` 唯一、`confirmed` 时必填字段、内容页有点、`needs-draft` 清零、BCP-47、主题存在。
- **`scripts/outline-to-spec.mjs`**：`design_spec.md` §IX 的唯一写入者。确定性投影，页号按数组顺序重生成，写 `page_rhythm`，并在 §IX 开头写 `<!-- outline-rev / sha -->` 标记。`--check` 只校验不写。
- **`scripts/outline-editor-server.mjs`**：没有宿主大纲页时的本地兜底，改完直接回写 confirmed。
- **`schemas/outline.schema.json`** + **`references/outline-contract.md`**：给客户端大纲页的契约与写回协议。

## 主题拆成两条轴

| 轴 | 字段 | 默认 |
|---|---|---|
| 视觉 | 配色、字体字号、组件、装饰 | 开 |
| 版式 | Spacing anchors、Composition tendency、Cross-page continuity | 关 |

- 新 scope：`decoration`、`visual`（推荐）、`layout`（仅显式启用）
- `full` / `design` 保留兼容，打弃用警告
- **删掉 `token.behavior \|\| bodyCompositionBias` 写入 Composition tendency 的路径**：只有 `layout` scope 才写这三行
- `theme_overlay.json` 升到 schema 2：新增 `axis`、`deprecated`、`layoutFieldsTouched`、`layout.before/after` 哈希

## 门禁补漏

- 0.6.0 的 `--scope components` 写出的 overlay 会被 `check-design-spec` 判成 unknown scope——scope 列表现在收敛到 `scripts/lib/theme-scopes.mjs` 一处
- 旧的"版式字段黑名单"只匹配字段名字面量，`token.behavior` 洗进 §V 时抓不到；现在改为校验 `layoutFieldsTouched` 和 §V 版式行的前后哈希
- 新增 §IX 漂移校验：页序、标题、核心信息、内容与 `outline.json` 比对；`Relationships` / `Composition` 等派生行不参与比对
- 新增 scaffold 占位符校验：`[fill]` / `{{…}}` 没填完不得过门禁
- 修复重复 apply 同一主题时的假警告与重复写入：判断字段是否存在，而不是判断替换后文本是否变化

## 顺手修掉的两处上游 scaffold 缺口

- vendor 的 `design_spec.md` scaffold 缺 §VII，投影时补上 `## VII. Visualization Reference List`
- scaffold 的 §V 只有 `Spacing posture`，没有 deck-studio 写的 `Spacing anchors`；`apply-theme` 现在会在缺失时按位置插入，而不是直接失败

## 验收

| 检查 | 结果 |
|---|---|
| 调换两页顺序后重新投影 | §IX 编号仍从 01 连续，`page_rhythm` 跟着变 |
| 手改 §IX 标题 / 内容 | `check-design-spec` 阻断，提示重跑 `outline-to-spec` |
| 在 §IX 补 `Relationships` | 不阻断（派生行允许） |
| `--scope visual` | `layoutFieldsTouched: []`，`layout.changed: false`，三行版式字段逐字节不变 |
| 连跑两次 `--scope layout` | 只有一行 Spacing anchors，第二次 `changed: false` |
| 伪造 overlay（visual + 版式字段） | `check-design-spec` 阻断 |
| `--scope components` | 通过门禁（修复 0.6.0 的 unknown scope） |
| 完整契约 | `check-design-spec` 0 error |

## 不变

- 主题默认关闭；没选主题时完全按执行内核自己的设计走
- PPTX 仍走后端，客户端不执行 Python
- 21 套主题、字体策略、组件与装饰系统不变

# V0.6.0 — 只留 21 套，字体自带

两件事一起做：目录收窄到用户挑的 21 套；HTML 不再依赖用户装没装字体。

## 目录收窄

- `themes/cards`、`tokens`、`packages`、`previews` 从 38 套裁到 21 套，`catalog.json` 同步
- `scenarios.json` 与两个 overrides 文件只保留这 21 套
- 21/21 审核通过；21 套都有组件级 override，5 套有颜色 override
- `theme-gallery.html` 裁到 21 张卡，`theme-furniture-gallery.html` 重新生成

## 字体内嵌

主题里写的 Inter / Noto Sans SC / 微软雅黑，在没装这些字体的机器上会静默回落，标题比例跟着变。HTML 交付不该受这个影响。

- **`themes/fonts.map.json`**：把字体分成 `embed`（随包 woff2）/ `substitute`（厂商字体换 OFL 近似体）/ `system`（走系统栈）三类
- **`assets/fonts/`**：Inter 400/600/700、Poppins 400/600/700、Archivo Black、Carlito 400/700、Roboto Condensed 700，全部 OFL-1.1，许可证原文在同目录 `OFL-NOTICE.md`
- **`scripts/lib/fonts.mjs`**：扫描 HTML 里的 `font-family` / `--theme-font-*` / SVG 属性，生成 `@font-face` 并改写字体栈
- **`svg-deck-to-html.mjs`** 默认内嵌，`--no-embed-fonts` 关闭；导出时打印内嵌了哪些字体、替换了哪些
- **`scripts/check-fonts.mjs`**：按主题看每个角色最终渲染成什么，标出 `fallbackRisk`
- **`references/fonts.md`**：为什么 CJK 不内嵌、PPTX 为什么只能走 `*_stack_ppt`

替换表：Arial Black→Archivo Black、Calibri→Carlito（字宽兼容）、Arial Narrow→Roboto Condensed。

## 为什么 CJK 不内嵌

一套中文子集 3–10 MB，而 PingFang / 微软雅黑 / Noto Sans SC 互相替换不会破坏版面，栈里本来就有回落链。要"中文也一模一样"只能整包带 CJK 子集或导出图片。

## 验证

| 检查 | 结果 |
|---|---|
| `check-fonts.mjs --all` | 21 套，0 套 fallbackRisk |
| 酸性主题导出 HTML | 内嵌 Archivo Black +12.9 KB，`Arial Black` 原位保留 |
| 含 Inter 主题导出 HTML | 内嵌 Inter 三个字重 +95.0 KB |
| `build-components --check` / `build-decorations --check` | 21 套同步 |
| `audit-themes.mjs` | 21/21 通过 |
| `theme-select` 场景推荐 | 21 套内工作正常（科研类落到 scientific-atlas） |

## 不变

- 主题默认关闭；组件层和装饰层不改故事
- PPTX 仍走 `*_stack_ppt`，不承诺字形一致

# V0.5.0 — 组件也跟主题：图表、表格、KPI 不再是一套通用样式

0.4.0 让主题管住了页面家具（页眉标签、标题线、硬投影、页脚带），但内容载体还是散的：表格永远是 1px 灰框，条形图永远是同一套条高，KPI 永远没有边框。所以一份酸性稿子，标题和标签是酸性的，图表和表格却是默认的商务风。

这一版把组件也纳入主题。

## 新增

- **`components` token 块**：`kpi` / `table` / `chart` / `line` / `callout` / `list` 六类组件的描边、填充、行线、斑马纹、条高、轴线、网格、圆角、标记形状。颜色同样写角色名。
- **两套来源**：`themes/components.profiles.json` 按 16 个 visualStyle 家族给默认值，`themes/components.overrides.json` 按主题 id 修正——已为用户选中的 21 套主题逐套写过。`scripts/build-components.mjs` 展开到 38 套 token，并为每套生成 `components.json` 和 `components.fragment.md`（带可复制的 SVG 片段）。
- **`--scope components`**：`apply-theme.mjs` 新档位，写 §V 的 `### Component System` 和 `spec_lock.md` 的 `## components`；`--scope design` 现在同时写组件层和装饰层。
- **`theme-furniture.mjs` 换成组件样本页**：一张 1280×720 里同时画 KPI 卡、表格、条形图、引用块、要点列表，直接看这套主题的组件长什么样。
- **`check-theme-fidelity.mjs` 加组件校验**：内容页必须有 `data-component` 组；表格边框/行线、条形高度/描边、KPI 和引用块边框必须等于主题声明的数值，否则阻断。
- **`themes/scenarios.json` 场景表**：38 套主题各写 `intent`（用途桶）、`scenes`（适用场景）、`signals`（命中词）、`avoid`（不推的场景）。`theme-select.mjs` 用它加分/扣分，并按家族限流（同家族最多 2 条），brief 没信号时按家族轮转铺开。

## 为什么

用户反馈两件事：一是主题没真正影响组件，酸性稿的图表、表格还是通用样式；二是 38 套里翻来覆去只被选中几套商务报告主题。前者的根因是装饰层只覆盖页面家具，后者的根因是推荐只按关键词打分、缺少场景信息和多样性约束。

## 验证

| 检查 | 结果 |
|---|---|
| `build-components.mjs` 生成 38 套 | 通过，16 个家族 + 22 个主题 override |
| `apply-theme --scope components` | §V Component System + lock `## components` 写入，overlay 记录 scope=components |
| `apply-theme --scope design` | 组件层与装饰层同时写入 |
| `check-theme-fidelity` 正向（酸性组件样本页） | 0 error |
| `check-theme-fidelity` 反向（内容页无组件组） | 阻断：content page has no component group |
| 推荐：季度经营复盘 | `financial-bluegreen-modern` 17 分居首，`swiss-signal` 次之 |
| 推荐：科研立项答辩 | `research-deepblue` / `forest-academic` / `classical-gold-academic` |
| 推荐：品牌发布会（tone=大胆） | `brutalist-acid` 20 分居首 |

## 不变

- 主题仍然默认关闭
- 组件层不改页数、页序和每页内容结构
- PPTX 仍走后端

# V0.4.0 — 主题带版式：装饰系统进入设计契约

0.3.0 的主题只能改颜色和字体。`deck-020-acid-full` 那种效果——3px 黑边、8px 硬投影、错位色块、页眉酸性标签、4px 标题线——是逐页手写的，换个主题就没了，换份材料又得重写一遍。

这一版把装饰变成主题的一部分。

## 新增

- **`decoration` token 块**：描边（常规 / 重 / hairline）、投影偏移、页眉标签、标题分隔线、标记块、页脚信息带、图表条、圆角、页面家具清单。颜色写角色名，不写 hex。
- **两套装饰来源**：`themes/decorations.profiles.json` 按 16 个 visualStyle 家族给默认值，`themes/decorations.overrides.json` 按主题 id 修正。`scripts/build-decorations.mjs` 生成到 38 套 token，并为每套产出 `decoration.json` 和 `decoration.fragment.md`（带可复制的 SVG 片段）。
- **`--scope design`**：`apply-theme.mjs` 新增档位，把装饰写进 `design_spec.md` §V（Composition tendency / Cross-page continuity / Decoration System）和 `spec_lock.md` 的 `## decoration`。仍然不碰 §I、§II、§VI–§X、页数、页序和每页内容结构。
- **`theme-furniture.mjs`**：把一套主题渲染成 1280×720 样本页，选主题前先看效果。
- **`check-theme-fidelity.mjs`**：页面写完后校验颜色是否越出 palette、描边宽度是否声明过、页面家具是否齐全，报告写到 `validation/theme-fidelity.json`。

## 验证

拿参考稿做了对照：

| 稿子 | 结果 |
|---|---|
| `deck-020-acid-full`（手写装饰版） | 0 error，14 页全部符合 |
| `deck-020-acid`（只换 token 版） | 28 error，缺页眉标签和标题线 |

也就是说，这个检查能区分"换了颜色"和"真的用了主题的版式语言"。

## 不变

- 主题仍然默认关闭，用户明确选择才启用
- `design` scope 只改视觉语言，不改故事
- PPTX 仍走后端，客户端不执行 Python

---

# V0.3.0 — 执行内核内置，装一个 skill 就够

0.2.0 只写了“按执行内核的方法做”，但执行内核本体不在包里，用户还得另装一份，两边的版本还可能对不上。这一版把上游 6.7.2 整棵子树放进 `runtime/engine/`，安装本 skill 即包含全部方法文档、模板和工具链源码。

## 变化

- 新增 `runtime/engine/`（17.3 MB / 8,381 文件），未改动任何上游运行文件
- 新增 `ENGINE.md`：上游版本、裁剪清单、完整性门禁、升级方式
- `SKILL.md` 增加子树路由：`SKILL_DIR` = `runtime/engine/`
- `SKILL.md` 增加项目路径硬规则：执行内核的默认项目目录会解析到 skill 安装目录，所有命令必须显式传路径
- 更新 `commercial-boundary.md`、`THIRD_PARTY_NOTICES.md`、`README.md`

## 没变的

- PPTX 仍然只走后端；客户端不安装 Python、PyMuPDF、ebooklib
- 主题覆盖仍然默认关闭
- 38 套主题、门禁、HTML 导出逻辑不变

## 裁剪

为控制体积和商标风险，排除了 simple-icons、chunk-filled、brands、sounds、上游测试与文档、字节码缓存。完整清单见 `ENGINE.md`。排除项不影响 `attribution_guard.py`，已实测返回 0。

---

# V0.2.0 — 回到执行内核，主题改为可选覆盖

0.1.0 把“选主题”放在了流程第一位，主题 token 里的封面结构、字体字号、边距和构图倾向直接接管了设计契约。结果是同一份素材生成的稿子在主题、故事和版式上都和纯执行内核不同：故事阶段没有落盘，页数从 14 页变成 12 页，目录页和需求热力页被合并。

这一版把顺序改回来。

## 流程

1. 输入与项目：沿用执行内核 Step 1–2。
2. 故事与设计契约：按执行内核 Step 4 写完整 `design_spec.md` §I–§X 和 `spec_lock.md`。
3. 门禁：`check-design-spec.mjs` 检查章节、§IX 页数、页面文件名顺序。
4. 主题覆盖：默认关闭；启用时只覆盖颜色，字体/间距需要显式 scope。
5. 页面执行：沿用执行内核 Step 6。
6. HTML：`svg-deck-to-html.mjs`，主题参数可选。
7. PPTX：后端编译。

## 新增

- `scripts/check-design-spec.mjs`
  - §I–§X 缺失即阻断
  - §IX 缺 `Audience move` / `Title` / `Core message` / `Content` 即阻断
  - §IX 页数与 §I Page Count 不一致即阻断
  - `svg_output/` 页数或编号不连续即阻断
  - `theme_overlay.json` scope 非法或触碰版式字段即阻断
- `scripts/apply-theme.mjs`
  - 三档 scope：`colors`（默认）/ `typography` / `full`
  - 只写 §III 配色、§IV 字体、§V spacing 一行
  - 永不写 §I、§II、§VI、§VII–§X、页数、页序、构图
  - 产出 `theme_overlay.json` 记录实际覆盖字段
- `init-project.mjs` 的 `--theme` 改为可选；不带主题时完全不碰执行内核的设计。

## 修正

- `theme-select.mjs choose` 默认 `source: auto`；只有画廊点选才写 `user`。0.1.0 默认写 `user`，会把 agent 的选择记成用户选择。
- `theme-picker-server.mjs` 显式传 `--source user`。
- `html-output.md` 不再要求客户端运行 `finalize_svg.py`。

## 未做

- 没有复制执行内核的 Plan/Executor 文档。运行时直接读执行内核的 `${SKILL_DIR}`，避免两套规则漂移。
- 38 套主题的 `coverStructure` 等版式字段仍然保留在 token 里，但只作为阅读参考，不参与覆盖。
