# ClawHive PPTX

大纲优先的 16:9 演示稿 skill：用户先编辑并确认 `outline.json`，脚本把它确定性投影成 `design_spec.md` §IX，之后由执行内核写设计与页面。大纲支持「结论 → 证据 → 含义 → 动作」四层（`points` / `evidence` / `soWhat` / `action`），内容页默认按下限和占位词门禁起草，不再是标题清单。9 个场景（通用汇报 / 竞品调研 / 销售汇报 / 客户方案 / 行业洞察 / 经营复盘 / 培训赋能 / 产品发布 / 客户案例）只填合同默认值，不锁 `mode` / `readingMode`；页数用 `pageBudget` 提示，不做硬门禁。主题是可选覆盖，且只覆盖视觉——配色、字体字号、组件系统、装饰系统；页边距、块间距、构图倾向和内容量不跟主题走。本地导出 HTML，PPTX 走后端。执行内核内置，作为设计参考，不执行它的路由与 Python 流水线。

## 自包含

包解压出来就能独立工作，不依赖市场、CLI、其他 skill、网络或本机字体：

| 自带 | 说明 |
|---|---|
| 执行内核 | `runtime/engine/` 内置子树：设计参考、模板、脚手架、图标库（已裁 `brands` / `sounds` / `simple-icons` / `chunk-filled`） |
| 主题 | 21 套 token、组件、装饰、场景表 |
| 字体 | 10 个 OFL woff2，导出 HTML 时内联 |
| 图标 | 5100+ Tabler / 1500+ Phosphor |
| 脚本 | 只用 Node 内置模块，无 `node_modules` |

```bash
node scripts/self-check.mjs --smoke
```

会检查缺文件、外部 import、绝对路径、外部命令，并离线跑一遍"大纲 → 契约 → 主题 → 页面 → 单文件 HTML"。

安装：把包解压到技能的扫描目录即可，不经过市场，也不需要 `openclaw` CLI。

```bash
unzip -q clawhive-pptx-72.0.0.skill -d <skills-root>/
```

唯一不随包的是 PPTX 导出：按产品架构走后端接口，客户端不执行 Python。

## 状态

| 项 | 状态 |
|---|---|
| 执行内核 | 6.7.2 内置在 `runtime/engine/`，只读，完整性门禁通过 |
| 故事事实源 | `outline.json`：用户增删改序并确认 |
| 页面类型 | 封面 / 目录 / 章节 / hero / 内容 / 结尾，投影为内核的页面角色 |
| 目录与 hero | 21 套主题各自定义 `tocStructure` / `heroStructure`，未指定构图时作为非绑定建议 |
| 故事契约 | `design_spec.md` §IX 由 `outline-to-spec.mjs` 投影；`check-design-spec.mjs` 校验漂移 |
| 默认流程 | 大纲 → 投影 → 执行内核设计契约 → 视觉主题 → Executor |
| 21 套主题 token | 全部生成 |
| 21 套 3 页预览 | 全部生成 |
| 自动审核 | 21/21 通过 |
| 人工 overrides | 5 套颜色 + 21 套组件 |
| 主题覆盖 | 视觉轴 `colors` / `typography` / `components` / `decoration` / `visual`；版式轴 `layout` 仅显式启用 |
| 装饰系统 | 21 套按 visualStyle 家族生成，acid 系已对齐参考稿 |
| 组件系统 | 21 套全部有主题级 override：KPI、表格、条形图、折线图、引用块、列表 |
| 场景表 | `themes/scenarios.json`：21 套的用途桶、适用场景、命中词、不推场景 |
| 字体 | HTML 内嵌 OFL 子集，厂商字体自动替代；PPTX 走 `*_stack_ppt` |
| 保真度校验 | `check-theme-fidelity.mjs`：palette / 描边 / 页面家具 / 组件 |
| HTML 导出 | Node 单文件，已验证 |
| PPTX | 后端接口 + 客户端，已用 mock 后端验证 |
| PDF/EPUB | 客户端不内置（方案 A） |

## 快速开始

```bash
# 建项目（默认不绑定主题）
node scripts/init-project.mjs ./demo --name "Deck title"
node scripts/check-inputs.mjs ./demo          # 拒绝 PDF/EPUB

# 1. 写大纲草稿（agent），用户在大纲页或对话里确认
node scripts/outline-check.mjs ./demo

# 2. 投影成设计契约，再补 §II–§VIII 与 §X
node scripts/outline-to-spec.mjs ./demo
node scripts/outline-to-spec.mjs ./demo --check
node scripts/check-design-spec.mjs ./demo

# 3. 应用视觉主题（不改版式）
node scripts/theme-select.mjs recommend --brief-json '{"goal":"经营复盘","density":"dense"}' --limit 5
node scripts/theme-select.mjs choose --theme scientific-atlas --source user --out ./demo/theme_selection.json
node scripts/apply-theme.mjs ./demo --theme scientific-atlas --scope visual

# 4. 页面写完后校验
node scripts/check-theme-fidelity.mjs ./demo
node scripts/check-fonts.mjs --theme scientific-atlas

# 5. 导出
node scripts/svg-deck-to-html.mjs ./demo
node scripts/pptx-backend-client.mjs ./demo \
  --endpoint "$DECK_STUDIO_PPTX_ENDPOINT" \
  --token "$DECK_STUDIO_TOKEN"
```

大纲的编辑和确认由宿主产品负责；本 skill 不提供、也不启动本地大纲编辑器。没有宿主页面时，在对话里呈现大纲并让用户明确确认。

只有在用户明确要求"连版式也按主题来"时才用 `--scope layout`。旧档 `full` / `design` 保留兼容，会打弃用警告。

## 目录

```text
clawhive-pptx/
├── SKILL.md
├── ENGINE.md             # 内核版本、只读边界、完整性校验与升级
├── THIRD_PARTY_NOTICES.md
├── runtime/engine/       # 执行内核（只读，17.3 MB / 8,381 文件）
├── schemas/              # outline.schema.json：宿主大纲页/调用方的机器契约
├── themes/               # 21 cards + tokens（含 decoration / components）+ packages + overrides
├── previews/             # 21 × 3 页样例
├── theme-gallery.html    # 交互式主题画廊
├── theme-furniture-gallery.html # 21 套组件样本（同一内容骨架）
├── assets/icons/         # 6 个 Tabler 图标
├── scripts/              # Node 脚本
└── references/           # 契约、主题、HTML、PPTX、引擎边界、商用边界
```

## 商用

- 客户端执行的代码只依赖 Node 内置模块
- 执行内核以 MIT 源码内置，`LICENSE` / `SPONSORS*` / `attribution_guard.py` 原样保留
- 不打包含 Python 解释器、PyMuPDF、ebooklib、edge-tts
- 不打包 Apple / Microsoft 字体
- 图标只带 Tabler / Phosphor；simple-icons、chunk-filled、brands 已裁剪
- PPTX 由后端生成

详细清单见 `references/commercial-boundary.md` 和 `THIRD_PARTY_NOTICES.md`。
