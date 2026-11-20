# 引擎参考使用边界

`runtime/engine/` 是随包内置的执行内核 6.7.2 只读副本，提供设计方法、模板和图标参考。**它是参考，不是客户端的执行手册。**

这份文档解决一件事：引擎自带的 `SKILL.md`、`workflows/`、`scripts/` 是按「引擎自己跑完整流水线」写的，而客户端不跑 Python、PPTX 走后端。两边冲突时，以本 skill 的 `SKILL.md` 和 `references/` 为准。

## 1. 谁负责什么

| 层 | 负责 | 不负责 |
|---|---|---|
| 外壳（`SKILL.md` + `references/` + `scripts/*.mjs`） | 大纲、§IX 投影、设计契约门禁、主题、HTML 导出、PPTX 后端调用 | 不执行引擎的路由和 Python 流水线 |
| 引擎 `references/` / `templates/` | 设计方法、Design Spec / Content Outline 写法、Executor 参考、模板与图标素材 | 不决定客户端的确认流程、门禁顺序和导出方式 |
| 引擎 `workflows/` / `scripts/` | 引擎自己的 Step 1–7、确认 UI、Python 工具链 | 客户端不读 `workflows/`，不执行 `scripts/` |

## 2. 允许读

只读这些，用来写 `design_spec.md` §II–§VIII、§X 和页面：

- `ENGINE_DIR/SKILL.md`：只读 Vocabulary / Phase Frame 里的术语和角色定义；**不执行** Mandatory Load Order、routing、Step 1–7。
- `ENGINE_DIR/references/plan-core.md`
- `ENGINE_DIR/references/strategist.md`：只读 Design Spec / Content Outline 的写法；**不执行** Stage 1/2 确认、confirm UI、refine-spec。
- `ENGINE_DIR/references/canvas-formats.md`
- `ENGINE_DIR/references/shared-standards-core.md`
- `ENGINE_DIR/references/semantic-svg.md`
- `ENGINE_DIR/references/executor-base.md`
- `ENGINE_DIR/references/preset-shape-vocabulary.md`
- `ENGINE_DIR/references/visual-styles/`：只读选定的风格文件
- `ENGINE_DIR/references/modes/`：只读选定的 mode 文件
- `ENGINE_DIR/references/executor-*.md`：按页面任务读
- `ENGINE_DIR/templates/design_spec_reference.md`
- `ENGINE_DIR/templates/spec_lock_reference.md`
- `ENGINE_DIR/templates/scaffolds/design_spec.md`
- `ENGINE_DIR/templates/scaffolds/spec_lock.md`
- `ENGINE_DIR/templates/icons/`：只读实际存在的 `tabler-outline` / `tabler-filled` / `phosphor-duotone`
- `ENGINE_DIR/templates/charts/`、`ENGINE_DIR/templates/tables/`：需要图表/表格词汇时读

## 3. 不读、不执行

- `ENGINE_DIR/workflows/` 全部默认不读：`routing.md`、`generate-pptx.md`、`edit-native-pptx.md`、`create-template.md`、`profiles/*`、`stages/*`。这些是引擎自己的路由和流水线。
- 不运行 `ENGINE_DIR/scripts/` 下的任何 Python 命令，包括但不限于：
  - `attribution_guard.py`（只在打包/CI 跑）
  - `project_manager.py`
  - `source_to_md.py`
  - `text_measure.py`
  - `svg_editor/server.py`
  - `svg_quality_checker.py`
  - `finalize_svg.py`
  - `svg_to_pptx.py`
  - `icon_sync.py`
  - `confirm_ui/server.py`
- 不照抄引擎的 Step 1–7；客户端流程以 `SKILL.md` 的「主流程」为准。

## 4. 失效资产

引擎文档里可能提到、但本包实际没有的内容：

| 引擎文档里的说法 | 包内实际 | 客户端规则 |
|---|---|---|
| `simple-icons`（3,675 个品牌 logo） | 不存在 | 不用。品牌 logo 只能用用户提供的素材；通用图形用 Tabler / Phosphor |
| `chunk-filled`（641 个） | 不存在 | 不用 |
| `templates/brands/` / `brands_index.json` | 不存在 | 不做品牌模板选择 |
| `templates/sounds/` / `sound-vocabulary.md` | 不存在 | 不做音效 |
| `templates/icons/README.md` 的「12,027 icons / five libraries」 | 实际三个库共 7,711 个 | 以上游原文看待，数量与库清单以本节为准 |

实际可用的图标库：

- `tabler-outline`：5,138 个，线稿，默认 `stroke-width="2"`
- `tabler-filled`：1,055 个，实心圆角
- `phosphor-duotone`：1,518 个，双色

引用格式仍然是 `data-icon="tabler-outline/home"` 这类完整 `library/name`。不要引用不存在的库，也不要运行 `icon_sync.py`；图标展开属于导出层的已知问题，不在本文件解决。

## 5. 路径

- 引擎文档里写死的旧工作区路径（`skills/...`）一律视为过期。
- 需要读文件时，用 `ENGINE_DIR`（即 `runtime/engine/`）拼接。
- 不要把引擎的默认项目目录当作客户端项目目录；所有命令显式传 `<project>`。

## 6. 冲突时的权威顺序

1. 本 skill 的 `SKILL.md` 与 `references/`
2. `outline.json` 与 `design_spec.md` 的投影
3. 引擎 `references/` / `templates/`

典型冲突按这个顺序处理：

| 引擎说 | 客户端实际做法 |
|---|---|
| 读 `workflows/routing.md` 选路 | 不选；流程按 `SKILL.md` 的大纲优先主流程 |
| 跑 `project_manager.py validate` | 跑 `outline-check.mjs` + `check-design-spec.mjs` |
| 跑 `text_measure.py calibrate --outline` | 不跑；文本预算由执行层按 §IX 内容自行控制 |
| 跑 `svg_quality_checker.py` / `finalize_svg.py` / `svg_to_pptx.py` | 不跑；页面检查用 `check-theme-fidelity.mjs` / `check-fonts.mjs`，PPTX 走 `pptx-backend-client.mjs` |
| 用 `simple-icons` / `chunk-filled` / brands / sounds | 不用；只用三个实际存在的图标库 |
| 用旧工作区路径（`skills/...`） | 用 `ENGINE_DIR/...` |

## 7. 不在本文件解决的事

带图/图标稿的 `svg_final` 生成、PPTX 后端的质量报告要求，属于导出层问题，分别以 `references/html-output.md` 和 `references/pptx-backend.md` 为准。**不要为了补这些缺口去调用引擎的 Python 命令。**
