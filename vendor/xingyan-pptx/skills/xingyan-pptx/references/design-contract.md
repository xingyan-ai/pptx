# 设计契约与页面约定

## 1. 项目目录

```text
<project>/
├── sources/                 # Markdown / HTML / DOCX / PPTX / XLSX / CSV
├── outline.json             # 故事事实源：页序、标题、每页核心信息与内容
├── design_spec.md           # 完整 §I–§X 契约；§IX 由 outline.json 投影
├── spec_lock.md             # 执行锁：颜色、字体、图标、page_rhythm、组件、装饰
├── theme_selection.json     # 可选：主题选择结果
├── theme_overlay.json       # 可选：主题覆盖了哪些字段、有没有碰版式
├── svg_output/P01.svg …     # 页面源，顺序与 §IX 一致
├── svg_final/               # 自包含预览
├── icons/tabler-outline/    # 预置图标
├── notes/                   # 可选演讲备注
├── validation/              # 质检与导出报告
└── exports/                 # HTML / PPTX
```

## 2. 设计契约

`design_spec.md` 必须包含 §I–§X。§IX 由 `outline-to-spec.mjs` 投影，其余章节按执行内核Strategist 方法写：

| 章节 | 内容 | 谁能改 |
|---|---|---|
| §I | 项目信息、Page Count、沟通意图 | 大部分由 `outline.json` 的契约投影；其余内容侧 |
| §II | 画布、边距、内容区 | 项目侧 |
| §III | 视觉主题、配色 | 内容侧；主题可覆盖配色子块 |
| §IV | 字体与字号 | 内容侧；主题可覆盖（`typography` 及以上） |
| §V | 版式原则、间距锚点、组件系统、装饰系统 | 版式行归内容侧；组件与装饰归主题 |
| §VI | 图标规范 | 内容侧 |
| §VII | 可视化引用 | 内容侧 |
| §VIII | 图片资源 | 内容侧 |
| §IX | 逐页故事 | **投影产物，用户字段只读** |
| §X | 生成与备注设置 | 内容侧 |

`spec_lock.md` 从 `design_spec.md` 派生：`communication`、`mode`、`colors`、`typography`、`icons`、`page_rhythm`、`page_visualizations`、`pptx_structure`、`components`、`decoration`、`forbidden`。

## 3. §IX 是投影，不是创作

`design_spec.md` §IX 是 `outline.json` 的确定性投影，开头带一行标记：

```markdown
## IX. Content Outline

<!-- outline-rev: 3 sha:06ad02… -->

#### Slide 01 - 墨水屏赛道：三个已被验证的切口

- **Audience move**: 从陌生到关注
- **Relationships**: none
- **Composition**: 由执行层按内容决定
- **Title**: 墨水屏赛道：三个已被验证的切口
- **Core message**: 513 篇帖子指向同一结论
- **Content**: 主标题；数据概要
- **Evidence**: 513 篇帖子、4394 条评论；护眼被提到 144 次
- **So what**: 用户要的是场景里的省心，不是参数表
- **Action**: 下一版按场景组织卖点
- **Source**: 小红书 2026-08，人工编码
```

规则：

- **用户字段只读**：`Title`、`Core message`、`Content`、`Evidence`、`So what`、`Action`、`Source`、页数、页序来自 `outline.json`，不得在 §IX 里改。
- **派生行可补**：`Relationships`、`Composition`，以及图表 / 表格 / 图片引用可以补，门禁不会把它们当成漂移。
- **编号从 01 连续递增**，数量等于 §I 的 Page Count。
- **要改故事，回到大纲（宿主页面或对话）改，再重跑 `outline-to-spec.mjs`**；不要直接编辑 §IX。
- 写页面时不得新增、合并或删除页面。

## 3.1 内容密度与 Reading Mode

内容密度不是一个独立轴，而是 Reading Mode 的预设：

| 内容密度 | `readingMode` | `density` | 页面语法 |
|---|---|---|---|
| 丰富 | `text` | `rich` | 完整断言、短段落、图注、表格；组件少、文字块大 |
| 标准 | `balanced` | `standard` | 一个主主张 + 简洁解释 + 结构化证据 |
| 精简 | `presentation` | `lean` | 一页一个主张、关键词、大图或大数字 |

优先级：

1. 内容密度决定 `readingMode`（丰富 → `text`，精简 → `presentation`，标准沿用场景默认）
2. 场景决定 `mode`、页数窄范围和主题候选
3. 篇幅决定目标页数

`density` 再投影成 `page_rhythm`：`lean` → `breathing`，其余 → `dense`。

装不下时按执行内核的顺序：**扩区 → 换表达（prose → points）→ 删限定语 → 拆页**；不缩字号、不叠文字。

## 4. 门禁

写完设计契约后、写第一页之前必须运行：

```bash
node scripts/outline-check.mjs <project>
node scripts/check-design-spec.mjs <project>
```

`outline-check.mjs` 阻断：

- 没有封面页、`id` 重复或不是 kebab-case
- `confirmed` 时缺标题或核心信息
- 内容页没有 `points`
- `readingMode` 非法；与场景默认不一致时告警，不阻断
- `mode` 与场景建议不一致时告警，不阻断
- `pageBudget` 非法；页数超出场景窄范围或 `pageBudget` 时告警，不阻断
- create 稿的内容页正文 <80 字，或使用占位词
- 还有 `needs-draft`
- `primaryLanguage` 不是规范 BCP-47
- `themeId` 不在包内

`check-design-spec.mjs` 阻断：

- 缺 §I–§X 任一章节
- §I 没有 Page Count，或与 §IX 数量不符
- 仍有 `[fill]` / `{{…}}` 占位符
- §IX 没有 `#### Slide NN`、编号不连续、缺必填字段
- §IX 的用户字段或页序与 `outline.json` 不一致，或标记的 `revision` / `sha` 过期
- `outline.json` 还是 `draft` 却已经有页面
- `svg_output/` 页面数与契约不符，或编号不连续
- `theme_overlay.json` 的 scope 非法、视觉 scope 带了版式字段、或改了 §V 版式行

## 5. 主题覆盖

主题分两条轴（完整表见 `references/stage1-theme-selection.md`）：

- **视觉轴**：`colors` / `typography` / `components` / `decoration`，以及把它们合起来的 `visual`
- **版式轴**：`layout`，写 §V 的 Spacing anchors、Composition tendency、Cross-page continuity
- 旧档 `full` / `design` 跨两轴，保留兼容但会警告

永不写入：§I、§II、§VI–§X、页数、页序、每页内容结构。视觉 scope 也不写 §V 的三行版式字段。

每次覆盖写 `theme_overlay.json`，记录 `themeId`、`scope`、`axis`、`applied`、`layoutFieldsTouched` 和 §V 版式行的前后哈希。

## 6. §V 的归属

| 位置 | 归属 | 谁能写 |
|---|---|---|
| `### Deck-wide Direction` 的 Spacing anchors / Composition tendency / Cross-page continuity | 版式轴 | 内容侧；主题仅 `layout` |
| `### Component System` | 视觉轴 | 主题的 `components` / `visual` |
| `### Decoration System` | 视觉轴 | 主题的 `decoration` / `visual` |

## 7. 页面约定

- 画布：`viewBox="0 0 1280 720"`
- 根节点：`data-pptx-page-role="cover|toc|section|content|ending"`
- 每个逻辑单元一个顶层 `<g id="...">`，带 `data-pptx-bounds`
- 顶层 group 不重叠（容差 1px）
- 一个段落一个 `<text>`，换行用 `<tspan>` + 正数 `dy`
- 字号只用 `spec_lock.md` 里的角色：`display/title/metric/subtitle/body/annotation`
- 字体用 token 里的 `title_stack_ppt` / `body_stack_ppt`
- 图标用 `data-icon="tabler-outline/..."`
- 不写 `mask`、`<style>`、`class`、`foreignObject`、`textPath`、动画、脚本
- 图表、表格、KPI、引用块、列表用 `data-component="chart|table|kpi|callout|list"` 标记组件组，按 `## components` 的数值画；内容页至少要有一个组件组
- 图片用 `../images/...` 或 data URI；最终 `svg_final` 必须自包含
- HTML 实体不要用于排版符号；用原始 Unicode，XML 保留字符用实体

## 8. HTML 与 PPTX 的关系

- `svg_output` 是唯一页面源
- `svg_final` 是自包含预览，供 HTML 和导出链路使用
- HTML 是本地单文件产物，不重新设计页面
- PPTX 是编译产物（客户端或后端同一份引擎），不在导出时重新排版
