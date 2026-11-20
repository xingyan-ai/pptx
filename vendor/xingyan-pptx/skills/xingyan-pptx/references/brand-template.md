# 品牌母版模板

品牌母版模板和「视觉主题」并列，但约束更强：主题管配色和字体，品牌模板连**底图、标题位置、安全区**一起锁。

首批内置：`templates/brand/zhongtai-v5/`（中泰证券立项建设方案 V5）。

## 1. 模板管什么，不管什么

| 模板锁定 | 模板不管 |
|---|---|
| 画布 16:9、安全区、底部禁区 | 章节骨架 |
| 三张品牌底图（封面 / 封二 / 内页） | 页数 |
| 字体与四档字号 | 每页用表格还是卡片 |
| 标题条坐标（x=204，避让 logo） | 要不要封二、目录 |
| 页脚页码位置与颜色 | 内容深度与叙事顺序 |
| 品牌色与注释色 | |
| 组件样式（表头红底白字、卡片顶部品牌条） | |

**模板管形式，骨架由场景决定。** 「十一章节」属于「内部立项」这个场景，不属于模板。

## 2. 三层结构

```json
{
  "structure":  { "locked": true,  ... },   // 锁死：安全区/禁区/标题条/字号档
  "constants":  { "override": ["colors","fonts"], ... }, // 可替换：客户换色换字体
  "scenarios":  { "project-initiation": ..., "solution-brief": ..., "customer-pitch": ... }
}
```

- **结构层**：页面落在哪、字多大、页脚在哪。换客户也不能动。
- **常量层**：hex 与字体家族。同一集团下的兄弟公司只换这一层。
- **场景层**：骨架。同一套品牌资产可以出 17 页立项稿、9 页汇报稿、6 页客户提案。

## 3. 中泰 V5 的关键数字

| 项 | 值 |
|---|---|
| 画布 | 1280×720（16:9，96 px/in） |
| 安全区 | x 67–1212，y 96–576 |
| 底部禁区 | y > 576，只允许页脚 |
| logo 区 | x 30–190，y 23–63，禁止放内容 |
| 标题条 | x=204，基线 y=54，32px 加粗 |
| 字号档 | 80 / 32 / 21 / 19（对应 60/24/16/14pt） |
| 字体 | Microsoft YaHei |
| 品牌红 | `#B20017`；注释红 `#C00000` |

## 4. 怎么用（模板工作区）

模板不是一份坐标说明，而是一个可以直接装进项目的**整页 SVG 工作区**：

```
zhongtai-v5/
├── images/                 bg-cover / bg-title / bg-content / bg-ending
└── templates/
    ├── design_spec.md      frontmatter: deck_id / kind: deck / primary_color / placeholders
    ├── 01_cover.svg        纯品牌整图，无槽位
    ├── 02_title.svg        TITLE / PROJECT_NO / DEPARTMENT / DATE
    ├── 03_toc_10.svg       10 条原型；build-toc 以它为底板重排
    ├── 03_toc_6.svg        6 条原型
    ├── 03_toc_2col.svg     历史双栏原型（不参与生成；32px 下放不下长标题）
    ├── 04_content.svg      正文文字页（编号要点 / 短段落）
    ├── 04c_cards3.svg     三段主张卡（proxy 版式）
    ├── 04c_table.svg       原生表格（proxy 版式）
    ├── 04c_metrics4.svg   四格指标条（proxy 版式）
    ├── 04c_metricscompare.svg  指标 + 左右对比
    ├── 04c_tablemetrics.svg    表格 + 指标条
    ├── 04c_contentrich.svg     通用代理版式（矩阵 / 流程 / 其他构图）
    └── 05_ending.svg       CLOSING_TEXT
```

安装到项目：

```bash
node scripts/prepare-brand-project.mjs <project>   # 不要手跑 apply_template.py
```

装完项目里会有 `templates/`（页面原型）与 `images/`（底图）。生成时把原型复制成 `svg_output/P01.svg …`，只替换 `{{...}}`，不要重画坐标。

### 三层结构

| 层 | 标记 | 作用 |
|---|---|---|
| 母版 | `data-pptx-layer="master"` + `data-pptx-master="zt_*_master"` | 底图、logo、口号进 PowerPoint 母版 |
| 版式 | `data-pptx-layer="layout"` + `data-pptx-layout="cover|title|toc|content|closing"` | 红色竖条、目录横线进版式 |
| 槽位 | `data-pptx-placeholder="title|body|object|slide-number"` + `data-pptx-bounds` | 唯一可编辑区，一个 `data-pptx-carrier="true"` 子元素 |

母版/版式元素不参与顶层组的 bounds 与重叠校验，所以叠多少层都不会触发门禁。

### 页面合成：优先 compose-deck

品牌母版当前有 **15 种页面版式**：

- 基础：`cover` / `title` / `toc` / `section` / `content` / `two_content` / `summary` / `structure` / `ending`
- proxy 内容版式：`cards-3` / `table` / `metrics-4` / `metrics-compare` / `table-metrics` / `content-rich`
- 目录由 `build-toc.mjs` 按章节数生成 `toc-<n>`，不手填 10 槽模板

大纲确认后先跑合成器，不要逐页手写：

```bash
node scripts/compose-deck.mjs <project> --check
node scripts/compose-deck.mjs <project>
node scripts/compose-deck.mjs <project> --only P07
```

它在 `outline.json` 里读每页的 `template` 和 `cards` / `metrics` / `table` / `compare` / `layers` / `takeaway`，复制原型后只往 `content-proxy` 画形状；所有 `data-pptx-*` 原子保持不变。字段与容量见 `references/page-patterns.md` §0.2。

### spec_lock 用脚本生成，不要手写

```bash
node scripts/gen-spec-lock.mjs <project>          # 从 svg_output 反推四段
node scripts/gen-spec-lock.mjs <project> --check  # 只校验，缺什么报什么
```

脚本按页面实际的 `data-pptx-layout` / `data-pptx-master` 生成 `pptx_structure`、`pptx_masters`、`pptx_layouts`、`page_pptx_layouts`，**页数与版式分配完全跟随页面**，不假设骨架；只改这四段，其余段原样保留。

`pptx-export.mjs` 导出前会尝试补一次结构化配置；补不齐就自动降级 flat（母版/版式丢失），不影响出 PPTX。

### spec_lock 的四段长什么样

```markdown
## pptx_structure
- mode: structured

## pptx_masters
- zt_cover_master: Zhongtai Cover
- zt_title_master: Zhongtai Title
- zt_content_master: Zhongtai Content
- zt_ending_master: Zhongtai Ending

## pptx_layouts
- cover: zt_cover_master | Cover | template:01_cover.svg
- title: zt_title_master | Project Title | template:02_title.svg
- toc: zt_content_master | Contents | template:03_toc.svg
- content: zt_content_master | Title and Content | template:04_content.svg
- closing: zt_ending_master | Closing | template:05_ending.svg

## page_pptx_layouts
- P01: cover
- P02: title
- P03: toc
- P04: content
- P05: closing
```

页必须命名为 `P01`、`P02`…，`page_pptx_layouts` 的键必须是 `P<NN>`。

## 4.1 信息模型决定内容形态

正文页只有**一种骨架**（`04_content`），内容长成什么样由信息模型决定，不由模板预设：

| 信息模型 | 怎么画 |
| --- | --- |
| 定性关系（顺序 / 层级 / 包含 / 对比） | 可编辑形状搭结构：分层色块、流程块、矩阵 |
| 数值 / 日期 / 时长决定几何 | 条形、折线、饼图，标数值与单位 |
| 行头 × 列头的单元格事实 | 表格：红底白字表头、行线 3px、行高 44 |
| 纯论述 | 先拆成判断 + 支撑，再做卡片 / 结论条；**不要默认编号要点** |

每页只选一种形态；混排时拆页。具体坐标、代码和「内容长什么样 → 用哪个形态」的对照见 **`references/page-patterns.md`**。

**内容页不许整页只有文字。** 编号要点只允许出现在 `density: "lean"` 的页，一套稿最多一页。`scripts/check-pages.mjs` 会按页统计视觉构件，standard 页少于 4 个、rich 页少于 5 个直接拦。

**九种页面**：封面 / 项目名页 / 目录 / 章节过渡 / 单栏正文 / 两栏正文 / 执行摘要 / 信息结构图 / 结尾。

| 内容形态 | 用哪页 |
| --- | --- |
| 进入新章节 | `04s_section` |
| 背景 / 矛盾 / 解法三句话 | `04t_summary` |
| 流程图、架构图、矩阵、价值链 | `04u_structure` |

**密度与容量**（正文 19px）：单栏 120 / 240 / 400 字，两栏 160 / 300 / 480，执行摘要每栏 35 / 70 / 110（依次为精简 / 标准 / 丰富）。超出按「删限定语 → 换版式 → 拆页」处理，不缩字号。

**图文并排用两栏页**：`04b_two_content` 左栏 x 67–607、右栏 x 639–1212，中间 32px 不许跨越。纯论述或整幅表格/图用单栏 `04_content`。

**章节序号由模板提供**：`{{CHAPTER}}` 填「一、」…「十、」，`{{PAGE_TITLE}}` 只写章节名与当页结论，不要重复序号。

## 5. 固定页：样式不变，只换文字

封面、项目名页、目录、结尾页这四页**沿用模板原样**，只替换文字，不重新设计版式。

| 页 | 做法 | 禁止 |
|---|---|---|
| 封面 | 直接用 `assets/bg-cover.jpg` 整图，不叠任何元素 | 加标题、部门、日期、口号 |
| 项目名页 | `assets/bg-title.jpg` + 红色竖条 + 项目名/编号/部门/日期 | 改竖条位置、换底图 |
| 目录 | 左侧红色「目录」+ CONTENTS，右侧竖线 + 条目列表（32px）；**条目数 = 章节数**，用 `build-toc.mjs` 生成 | 换版式、加页码、留空槽位、条目超过 16 字 |
| 结尾页 | `assets/bg-ending.jpg`（红底 + 白 logo + 口号）+ 白色致谢语 | 改底色、改致谢语以外的内容 |

这四页在 `template.json` 里标记为 `structure.fixedPages`，生成时应当复用，不要每次重画。

### 5.1 目录页必须用脚本生成

模板里有三种目录原型（6 / 10 / 双栏），**不要按章节数挑一个复制**——8 个章节复制 10 槽原型，
就会留下「九、」「十、」两行空序号；复制双栏原型又会多出一堆空槽。两边都难发现，导出后才露馅。

```bash
# 条目从 outline.json 推导：目录页之后、结尾页之前的 section / content 页标题
node scripts/build-toc.mjs <project>

# 章节名和页面标题不一致时手动指定
node scripts/build-toc.mjs <project> --items "产品概述,项目必要性,总体架构,…"

# 只看排版结果，不写文件
node scripts/build-toc.mjs <project> --dry-run
```

脚本做四件事：

1. 按实际条数重算序号（一…二十）和行距（44–76 自适应），整块在安全区内垂直居中
2. 最多 10 条；超过 10 条报错，让大纲合并章节或拆两页目录（32px 单栏塞不下更多）
3. 条目槽 x 640–1192（552 宽），32px 下约 16 字，超长直接报错
4. 生成完整页面，不留 `{{TOC_ITEM_n}}`；页码用目录页的真实页序
5. 同时在 `templates/` 落一份 `03_toc_<n>.svg` 原型，版式 key 用 `toc-<n>`

第 5 条不是可选项：ppt-master 的结构化导出会核对「页面版式 key ↔ `templates/` 原型」是不是同一套契约。
8 条目录沿用 `toc-10` 的 key 会报 `changed its placeholder contract`，导出降级成 flat。

生成后 `check-pages.mjs` 会再查一遍空行、孤儿序号和超宽。

## 6. 内容页：表格与架构图

- **表格**：表头红底白字、行高 44、行线 `#D9D9D9`；表格整体落在安全区内，底部不越过 576
- **系统架构图**：用分层色块表达（如接口层/业务层/中间件层），整块占满安全区宽度，块间留 24 间距；不要贴边、不要压底部红曲线
- **卡片组**：3–4 列等宽，白底 + 顶部 4px 品牌红条
- 任何页都要留出标题条区域（y 16–70）与页脚（y 650 以下）

## 7. 导出格式

模板支持两种产出，由「导出格式」参数决定：

| 格式 | 结果 |
|---|---|
| HTML 单文件 | `exports/<大纲名>_<时间戳>.html`，可直接打开、翻页、打印 |
| PPTX 可编辑 | 过质量门禁后调 `scripts/pptx-export.mjs`；有版式映射就出带母版/版式的原生 PPTX，没有就自动 flat |

PPTX 导出用宿主注入的 Python（依赖 python-pptx / lxml / Pillow，随客户端提供）：

```bash
node scripts/pptx-export.mjs <project>   # 解释器与文件名都自动，不用手配
```

没有可用运行时脚本会明确报错（不静默降级成图片版），此时只交付 HTML。
