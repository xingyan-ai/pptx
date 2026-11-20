# 主题选择与覆盖

## 1. 主题在流程里的位置

用户在提交内容前就选了主题，但**选择和应用是两件事**：

1. 收到 `contract.themeId` 时只记录，写 `theme_selection.json`
2. 大纲确认、§IX 投影完成、设计契约写完并过门禁之后，才执行 `apply-theme.mjs`

先选主题、后应用，是因为主题只覆盖视觉，应用时需要 §III / §IV / §V 已经在契约里。用户仍然可以"先挑主题"，只是它在第 ⑨ 步才落地。

没有选主题时：

- 不运行 `theme-select.mjs choose`
- 不运行 `apply-theme.mjs`
- `design_spec.md` 的颜色、字体、版式完全由执行内核的 Plan 决定

## 2. 选择入口

### 用户在界面上选

宿主下拉框回传主题 id，写进 `contract.themeId`。落盘时保留来源：

```bash
node scripts/theme-select.mjs choose --theme scientific-atlas --source user \
  --out <project>/theme_selection.json
```

只有 `--source user` 才表示用户选的。agent 自己挑主题时不要伪装成用户选择。

### 用户想看大图再选

```bash
node scripts/theme-picker-server.mjs --project <project> --port 5055
```

浏览器打开 `http://127.0.0.1:5055/`，点一张主题卡；这条路径把 `source` 写成 `user`。

### agent 推荐

```bash
node scripts/theme-select.mjs recommend --brief-json '{"goal":"季度经营复盘","density":"dense"}' --limit 5
```

推荐不是纯关键词打分，它读 `themes/scenarios.json`：

1. **场景命中**：brief 里出现主题的 `signals` 或 `scenes` 加分，命中 `avoid` 扣分
2. **用途桶**：brief 的用途倾向（经营 / 科研 / 营销 / 校园 / 技术…）和主题 `intent` 一致加 4 分，不一致扣 2 分
3. **家族限流**：候选里同一个 `visualStyle` 家族最多 2 条
4. **无信号铺开**：brief 什么都没说时按家族轮转，不返回字母序前五个

推荐用的 `density` 是稿级密度（用户下拉框的默认密度），只参与打分，**不写进契约**。

## 3. 两条轴

主题被拆成两组字段，这是 0.7.0 的核心约束：

| 轴 | 字段 | 决定什么 | 默认 |
|---|---|---|---|
| **视觉** | 配色、字体族与字号档、组件画法（KPI/表格/图表/引用/列表）、装饰（描边/投影/标签/分隔线/标记块/信息带/家具） | 页面长什么样 | 开 |
| **版式** | §V Spacing anchors、Composition tendency、Cross-page continuity | 一页能放多少、怎么排 | 关 |

**密度不来自主题。** `theme.density` 只用于推荐打分（`scripts/theme-select.mjs`），不写进 `design_spec.md` 或 `spec_lock.md`。页面的内容量由 `outline.json` 的 `points` 和 `density` 决定。

主题的字号仍然决定一页的**物理上限**，这个绕不开。但目标量由用户定：超过上限时，回到大纲（宿主页面或对话）拆页，不删内容、不缩字号。

## 4. 覆盖范围

```bash
node scripts/apply-theme.mjs <project> --theme <id> --scope visual
```

| Scope | 写什么 | 轴 | 默认 |
|---|---|---|---|
| `colors` | §III 配色表、lock `colors` | 视觉 | — |
| `typography` | 再加 §IV、lock `typography` | 视觉 | — |
| `components` | 再加 §V Component System、lock `## components` | 视觉 | — |
| `decoration` | 再加 §V Decoration System、lock `## decoration` | 视觉 | — |
| **`visual`** | **以上四项全部** | **视觉** | **推荐** |
| `layout` | §V Spacing anchors / Composition tendency / Cross-page continuity | 版式 | 仅显式要求 |
| `full` | 旧档：typography + spacing anchors | 混合 | 弃用，会警告 |
| `design` | 旧档：visual + layout | 混合 | 弃用，会警告 |

`layout` 只在用户明确说“连版式也按这套主题来”时使用。选主题时顺手带 `layout` 会让主题预先决定构图，和内容驱动的版式打架。

### 主题卡里哪些散文进契约

默认只作参考、不写进契约：

- `coverStructure`
- `sectionStructure`
- `titleTreatment`
- `decorativeLanguage`
- `bodyCompositionBias`

两个例外：

- `tocStructure` 和 `heroStructure` 会在**用户没有写 Composition** 时，被投影到目录页和 hero 页的 `Composition`，并标注“主题建议（非绑定）”。用户或大纲写了 Composition，以用户的为准。
- `behavior` 里的构图描述只在 `layout` scope 下写进 §V。

这样目录页和 hero 页能沿用主题自己的版式语言，同时不覆盖用户的结构决定。

## 5. 覆盖记录

`apply-theme.mjs` 写 `<project>/theme_overlay.json`：

```json
{
  "schemaVersion": 2,
  "themeId": "scientific-atlas",
  "scope": "visual",
  "axis": "visual",
  "deprecated": false,
  "source": "user",
  "applied": [
    "design_spec §III Color Scheme",
    "spec_lock colors",
    "design_spec §IV",
    "spec_lock typography",
    "design_spec §V Component System",
    "spec_lock components",
    "design_spec §V Decoration System",
    "spec_lock decoration"
  ],
  "layoutFieldsTouched": [],
  "layout": {
    "before": "205dd471…",
    "after": "205dd471…",
    "changed": false
  },
  "untouched": ["§I", "§II", "§VI", "§VII", "§VIII", "§IX", "§X", "page count", "page order", "page structure", "spacing", "composition", "cross-page continuity"]
}
```

两个自证字段：

- `layoutFieldsTouched`：这个 scope 实际写了哪些版式字段，视觉 scope 必须为空
- `layout.before / after`：§V 三行版式字段的哈希，视觉 scope 必须相等

`check-design-spec.mjs` 会拦：scope 非法、视觉 scope 带了版式字段、视觉 scope 改了 §V 版式行。

## 6. 失败与回退

- 没有 `outline.json` 或还没 `confirmed`：先完成大纲，不要套主题
- 没有 `design_spec.md` / `spec_lock.md`：先跑 `outline-to-spec.mjs`，再补设计契约
- 没有 §IX：停止，先投影故事
- 选中的主题缺 token 或缺 components / decoration 块：停止，不要猜
- 主题与内容密度冲突：回大纲（宿主页面或对话）拆页或换主题，不要删内容、不要缩字号
- 画廊打不开：在对话里列出 21 个 id + 名称 + 密度 + 保真度，让用户回一个 id
