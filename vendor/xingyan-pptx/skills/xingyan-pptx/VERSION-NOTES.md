# V1.0.38 — Windows 运行安全（不改变视觉）

本轮只修"在 Windows 上会失败 / 会弹窗 / 会静默读坏"的问题，不碰版式与字体。

## 修复

1. **Python 子进程统一 UTF-8**：新增 `pythonEnv()`，所有 spawn 传
   `PYTHONUTF8=1`、`PYTHONIOENCODING=utf-8`、`PYTHONNOUSERSITE=1`、`PYTHONDONTWRITEBYTECODE=1`。
   Windows 分支此前没有这些变量，`extract_source.py` 的 stdout 会按 cp936 写出、被 Node 当 UTF-8 读；
   实测 emoji 文件名会 `UnicodeEncodeError` 直接崩。
2. **JSON 读取统一剥 BOM / 兼容 UTF-16**：新增 `scripts/lib/json.mjs`，42 处
   `JSON.parse(fs.readFileSync(...))` 全部换成 `readJsonFile()`。
   此前带 BOM 的 `outline.json` 会崩，`deck-name` 会静默退化成目录名，质量报告读失败会让门禁形同虚设。
3. **源文件编码探测**：`extract_source.py` 对 HTML/TXT/MD/CSV 识别 UTF-8 BOM、UTF-16LE/BE、GB18030。
   此前 UTF-16 文本被静默读成替换字符（实测 `chars=32` 但内容全坏）。
4. **`icacls` 不再弹窗**：`runtime/engine/scripts/svg_to_pptx/pptx_package/builder.py` 增加
   `creationflags=CREATE_NO_WINDOW`（本地补丁，上游分叉，已在代码注释标注）。
5. **文档跨平台化**（11 处）：
   - 删除 `${CLAWHIVE_PYTHON_EXECUTABLE:-python3}` 手工 finalize 命令、后端 endpoint 命令
   - `grep`/`sed` 指引改为 `Select-String` / 文件读取工具
   - `--brief-json '…'` 改为 `--brief <file>`；`/tmp` 改为项目内路径
   - `apply_template.py` 改为 `prepare-brand-project.mjs`；`&&` 改为两行 + `$LASTEXITCODE`
   - `chrome --headless` 删除；`open`/`start` 按平台区分
   - 新增「执行环境（跨平台）」小节
   - 修正「PPTX 只走后端」与「HTML 不需要 Python」两处自相矛盾
6. **`~` 展开**：新增 `scripts/lib/paths.mjs`，21 个入口的路径参数先展开 `~`；
   此前 `init-project ~/deck` 会在当前目录建一个名叫 `~` 的目录。

## 验证

- 复现用例：BOM JSON（修复后取到项目名）、UTF-16 源文件（修复后正常解出中文）、`~` 路径（落到 home）
- 回归：`build-deck --format pptx` → `mode: structured / errors: 0`，产物正常
- `__pycache__`：导出后引擎目录 0 个（`PYTHONDONTWRITEBYTECODE` 生效）
- `self-check` 通过（含引擎完整性校验，icacls 补丁不影响门禁）

## 未包含（1.0.39 版式批次）

- `check-fonts` 平台判定与退出码、无衬线主题的"宋体兜底"、`PAGE_TITLE` 截断、卡片/指标槽位溢出、Inter→Arial 映射

## 已降级、未改

- `spawnSync('node')` PATH 依赖、`process.execPath` 为 electron 的情形：真实会话里均不成立，作为后续加固项

# V1.0.37 — Windows 不再弹命令窗口

Windows 客户机上，员工每次导出都会弹出一个黑色控制台窗口，标题是 `...\runtimes\python-win\python.exe`。

## 根因

- 包的 Node 脚本用 `spawnSync` 拉起 `python.exe` / `node.exe`，都是**控制台子系统程序**；在 Electron 这类没有控制台的父进程下，Windows 会为子进程新建一个控制台窗口
- 整个包此前**没有任何一处设置 `windowsHide`**：`pptx-export` / `build-deck` / `extract-source` / `init-project` / `theme-picker-server` / `self-check` 全都可能闪窗

## 变更

- 7 个脚本、19 处子进程调用统一加 `windowsHide: true`（macOS/Linux 上无副作用）：
  `pptx-export.mjs`(7)、`extract-source.mjs`(4)、`self-check.mjs`(3)、`build-deck.mjs`(2)、`init-project.mjs`(1)、`theme-picker-server.mjs`(1)、`lib/python-runtime.mjs`(1)

## 边界

- 只影响包自己拉起的子进程；客户端自身的导出管线原本就带 `windowsHide`
- 如果模型在会话里直接执行 `python.exe`（例如手写 `finalize_svg.py`），窗口取决于宿主 shell，包侧管不到

# V1.0.36 — 大纲固定用表格呈现

17:53 那次会话里，大纲被写成编号列表（1. 封面 — … 2. 目录 — …），而 17:00 那次是表格。格式没有规则约束，模型每次自由发挥。

## 变更

- `Agent.md` 第 3 步：明确"**必须用 Markdown 表格呈现**（列固定 `页 | 标题 | 核心信息`，品牌稿加 `版式`），不要用编号列表"
- `SKILL.md` ④：同一规则，另注明"制作参数用列表即可"，避免模型把参数也塞进表格

## 未包含

- 宿主大纲页本身的表格样式（那是客户端渲染，本次只约束对话里的呈现）

# V1.0.35 — 去掉重复的流程句

1.0.33 在 22 张模板卡片里补了「先出大纲草稿，等我确认后再生成页面」，1.0.34 又在参数块补了同一句，聊天里同一句话出现两次。

## 变更

- 22 张卡片恢复成只说明模板：`请用 <名称>（<id>）模板制作演示稿。`（品牌卡多一句安全区提示）
- 流程句只保留在参数块最后一行：`流程：先出大纲草稿，等我确认后再生成页面。`

# V1.0.34 — 参数块补一行流程

1.0.33 只在模板卡片的 `prompt` 里补了「先出大纲草稿，等我确认后再生成页面」。如果用户不选卡片、只填参数提交，消息里就没有这句，只能靠 `Agent.md` 兜底。

## 变更

- `agent/home.json` 的 `promptTemplate` 追加一行：`流程：先出大纲草稿，等我确认后再生成页面。`
- 参数块仍然是 5 行，不是一屏

## 渲染结果

```
场景：通用汇报
内容密度：standard
导出格式：PPTX
语言：zh-CN
流程：先出大纲草稿，等我确认后再生成页面。
```

# V1.0.33 — 恢复「先出大纲、等用户确认」的两步流程

17:39 那次真实会话里，员工跳过大纲确认，4m37 / 128 积分一次跑完并直接交付 PPTX。

## 根因

- 1.0.30 把「先出大纲草稿…等我确认」从消息模板删掉；1.0.31 又把模板卡片 prompt 里的同一句删掉。消息里只剩「请用 X 模板制作演示稿 + 4 行参数」，模型就按"直接做完"理解
- `Agent.md` / `SKILL.md` 里的流程还在，但"大纲已确认"是靠模型自己写 `status: "confirmed"` 满足的——没有任何机制阻止它自我确认
- `Agent.md` 的「连贯执行（硬规则）：不设第二个确认点」容易被读成"别停下来问"

## 变更

- 22 张模板卡片的 `prompt` 补回一句：`先出大纲草稿，等我确认后再生成页面。`
- `Agent.md`：把「连贯执行」改成「先确认，再连贯执行」，明确确认前必须停在草稿、**不得自行置 `confirmed`**、不得在回复前跑 `outline-to-spec` / `build-deck`
- `SKILL.md` 硬门禁补一句：`confirmed` 只能来自用户确认，agent 不得自行写入

## 未包含

- 大纲配方与品牌/主题分流仍未做

# V1.0.32 — 只要 PPTX 就只产出 PPTX

制作参数里选的是「导出格式：PPTX」，但 17:10 那次真实会话里模型执行的是 `build-deck --format both`，于是多出一个 552KB 的 HTML，交付说明也把它列了出来。

## 根因

- 文档里所有示例都写死 `--format both`（`SKILL.md` 快速命令、品牌-core 段、`Agent.md` 第 7/9 步），模型只能照抄
- 没有任何一处把「制作参数的导出格式」映射到 `--format` 参数

## 变更（中泰版规则）

- 示例统一改成 `--format <pptx|html>`，并新增硬规则：选 PPTX → `--format pptx`，只交付 PPTX，不附带 HTML；选 HTML → `--format html`；只有用户明确要两种才 `both`
- 交付说明只列实际产出的文件：PPTX 交付不写 HTML
- `build-deck` 本身默认值仍是 `pptx`，未改代码

## 未包含

- 大纲配方（`outline-recipe-brand`）与品牌/主题分流尚未做，待单独确认

# V1.0.31 — 模板卡片提示词瘦身

点模板卡片时，卡片自己的 `prompt` 也会拼进消息，里面夹着完整的流程说明和版式常量（示例见 1.0.30 回归截图）。用户看到两段重复的"说明书"。

## 变更

- 21 张主题卡的 `prompt` 压成一句：`请用 <名称>（<id>）模板制作演示稿。`
- 品牌卡压成：`请用中泰专用模板（zhongtai-v5）制作演示稿。版式必须落在模板安全区内。`（保留安全区提示作为保险，删掉 x=204 与四档字号——它们在 `references/brand-template.md`，并由 `compose-deck` 与 `check-design-spec` 强制）
- 提示词最长从 150 字降到 65 字

## 为什么不能整段删

"用哪套模板/主题"只在卡片 `prompt` 文本里。模板文件路径虽然作为独立参数传入会话（`EmployeeHomePage.tsx:297-326`），但主题 id 不在其中；整段删掉模型就不知道用户选了哪套。

## 边界

- 流程句「先整理大纲草稿…等我确认后再生成」已由 `Agent.md:5/86` 与 SKILL 主流程承担
- 需要一次真实会话回归：确认消息里只剩「用户原话 + 一句卡片说明 + 4 行参数」

# V1.0.30 — 消息模板瘦身

员工首页的 `promptTemplate` 会把整屏操作说明拼在用户消息后面（截图里那段红框），用户观感很差。

## 变更

- `agent/home.json`：`promptTemplate` 只保留 4 行参数——场景 / 内容密度 / 导出格式 / 语言。这是表单值到达模型的唯一通道（`employeeHomePackage.ts:264-265`），不能整段删除
- 流程、自检、浏览器禁令、导出降级全部由 `Agent.md` 承担，不依赖消息里那段文字
- 删掉「页面必须复制所选模板的整页 SVG（保留全部 `data-pptx-*`）」：只对品牌母版成立，21 套主题没有整页 SVG

## 边界

- 模板卡片自己的 `prompt`（「请用中泰专用模板（zhongtai-v5）…」）保留，那是用户点卡片时的引导语
- 需要一次真实会话回归：确认聊天里只剩 4 行参数、仍然产出 PPTX、不再弹 AskHuman

# V1.0.29 — 品牌稿不再因为一张没用到的底图降级 flat；构建可重跑

## 根因

用真实材料跑品牌稿时发现：大纲里没有「项目名页」→ `bg-title.jpg` 被写进 §VIII 与 `spec_lock.md` 的 images，但没有任何页面引用它 → 质量门禁报 1 条 error → `pptx-export` 按「有错就降级」把整套稿转成 flat，母版与版式全丢（实测 247KB / 1 master 1 layout；补上项目名页后 345KB / 4 master 9 layout）。

另外，上一次构建在 `build-toc` 失败后会在 `svg_output/` 留下不完整页面集，再次构建时 `check-design-spec` 报「pages do not match」，让重跑失败在与真正原因无关的地方。

## 修复

- `fill-brand-contract.mjs`：按大纲实际使用的页面类型声明底图（cover / title / content / ending），并从 `design_spec.md` §VIII 与 `spec_lock.md` 的 images 里删除未使用的行；不再无条件写四张底图
- `build-deck.mjs`：非单页修复（不带 `--only`）时，在 `check-design-spec` 之前清空 `svg_output/*.svg`，让失败后的重跑自动回到干净状态

## 本轮追加（同版本）

- `pptx-export.mjs`：只有**结构性**错误（placeholder 契约、layout 原型、pptx_layouts/masters、缺 spec_lock、data-pptx-layout）才降级 flat；内容类错误照常结构化导出，只在 brief 里列出。结构化转换本身失败时仍会自动降 flat 重试一次
- `gen-spec-lock.mjs --flat`：切换 flat 时保留 `## images`、`## forbidden` 等非结构段；之前整段丢弃导致降级后门禁报 4 条 `absent from spec_lock.md images`，把真正原因盖住
- `outline-check.mjs`：标题超过目录槽位（16 字宽）提前告警，不再等到 `build-toc` 硬阻断
- `build-deck.mjs`：清空页面只发生在品牌/core 合成流程，并打印清掉了几页
- 新增 `outputs/pack-zhongtai-pptx.mjs`：校验版本一致 → 跑 self-check → 排除 `__pycache__`/`.pyc`/`.DS_Store` → 打包并回读校验
- 导出文件名改为按内容命名：`contract.projectName` → 封面标题 → 项目名页 → 目录名，格式 `<名称>_<YYYYMMDD-HHmm>.<ext>`；同一次构建的 pptx/html 共用时间戳（新增 `scripts/lib/deck-name.mjs`）

## 验证

- 无项目名页的品牌稿：0 error，结构化导出，母版含 Cover / Contents / Three Claim Cards / Data Table / Metrics Row / Table and Metrics / Closing
- 有项目名页：额外得到 Project Title 版式
- 连续两次构建均成功（幂等）

# V1.0.28 — 写稿不再弹浏览器；导出不再中断问人

## 1. 写稿不再弹浏览器

1.0.26 起，员工写 PPT 时会自己起一个本地静态服务（如 `127.0.0.1:8899`）再用 Playwright MCP 逐页截图自检，用户会看到浏览器反复弹出、常驻两个标签页（MCP 的 `--isolated` 启动自带一个空白标签页）。

- `agent/Agent.md`：三条硬规则——不碰浏览器、自检只跑脚本、只有已存在的图片才用 `read_image`；Safety Rules 增加对应禁令
- `skills/zhongtai-pptx/SKILL.md`：硬规则区同步
- `agent/home.json`：`promptTemplate` 明确禁止起本地服务与截图自检
- `references/stage1-theme-selection.md`：删掉"开 5055 让用户点卡"，改为给 `theme-gallery.html` / `theme-furniture-gallery.html` 路径

## 2. 导出不再中断问人

客户端上出现过这样的 AskHuman：「Python 可用，但本地导出器在 spec_lock 预检卡住……先交付 HTML / 换品牌母版 / 配后端端点？」。根因是包内没有导出失败的处理规则，且旧脚本只找 `runtimes/python/<target>`、探测还要求 PyYAML。

- 新增 `scripts/lib/python-runtime.mjs`：按 `--python` → `CLAWHIVE_PPTX_PYTHON` → `CLAWHIVE_PYTHON_EXECUTABLE` → ClawHive 运行时（含 Windows `runtimes/python-win/`）→ Harness 运行时 → 本机 `python` 的顺序解析解释器
- `pptx-export.mjs` / `build-deck.mjs` / `extract-source.mjs` 共用该解析器；探测改为 `pptx, PIL, lxml`，不再要求 PyYAML（引擎本来把 yaml 当可选）
- Agent.md / SKILL.md / home.json：写明三档降级（structured → 自动 flat → 只交付 HTML），禁止为导出弹 AskHuman；删除"换品牌母版""配后端端点"两个伪选项
- 文档同步：README / ENGINE / engine-usage / brand-template

## 边界

- 浏览器禁令是**软约束**：客户端仍可能给员工挂 Playwright MCP。要彻底不弹窗，需客户端配置 `headless: true` 或不挂该 MCP。
- 包内不提供 PNG 渲染能力，"读已渲染 PNG"只适用于配图产物与用户提供的图片；页面视觉确认由用户看 HTML。
- 后端导出（`references/pptx-backend.md`）保留为服务端部署参考；客户端没有配置 endpoint，不要主动建议。
- **打包前清掉 `__pycache__`**：1.0.26 的 zip 里有 157 个 `.pyc` 条目；跑过自检或导出就会重新写入，打包脚本要排除。

# V1.0.26 — 修复模板安装门禁导致生成阶段 700+ 积分

1.0.25 的 run：大纲 8m33/269 积分，生成 23m19/**764 积分**（94 次调用 / 9.63M token）。
生成阶段的根因不是页面生成，而是**品牌模板装不进去**：

## 根因

- `apply_template.py` 会跑引擎的 template-mode 校验，检查 `design_spec.md` 的 Page Roster。
- 1.0.24/1.0.25 新增了 12 个原型（04c_* / 06*），但品牌 `design_spec.md`：
  - `page_count` 还是 11，实际目录有 23 个 SVG
  - Page Roster / frontmatter placeholders 没有列出这 12 个文件
- 更关键：roster 解析器的正则只接受 `[0-9A-Za-z_]+\.svg`，**不认连字符**。
  `04c_cards-3.svg`、`04c_metrics-4.svg` 等 5 个文件即使写进 roster 也永远匹配不到。
- 结果：`apply_template.py` 固定失败，`templates/` 装不进去；agent 只能去读
  `checker.py` / `spec_lock` / `gen-spec-lock` 源码，手动补 design_spec/spec_lock，
  94 次调用、9.6M token、23 分钟、764 积分。

## 修复

1. **品牌 design_spec 同步 roster**
   - `page_count: 23`
   - frontmatter placeholders 补齐 04c_* / 06* 共 12 项
   - `## V. Page Slots` 改为 `## V. Page Roster`，列出全部 23 个模板
2. **5 个带连字符的原型改名下划线**（layout key 不变）
   - `04c_cards-3` → `04c_cards3`
   - `04c_content-rich` → `04c_contentrich`
   - `04c_metrics-4` → `04c_metrics4`
   - `04c_metrics-compare` → `04c_metricscompare`
   - `04c_table-metrics` → `04c_tablemetrics`
   - 同步 `compose-deck` / `self-check` / SKILL / brand-template 的引用
3. **品牌模板自动安装**
   - 新增 `prepare-brand-project.mjs`
   - `build-deck` 在 brand 模式下发现没有 `templates/` 时自动安装品牌模板 + 底图 + template.json
   - agent 不再需要手跑 `apply_template.py`
4. **品牌-core 项目名页推断**
   - outline 里 `project-title` 角色是 `section` 且没有显式 template 时，映射到 `title`
   - 之前会落到 `section` 页，用 `bg-content`，导致 `bg-title.jpg` 未被引用，
     触发 image lock 错误并降级 flat
5. **06k_kpi_evidence 证据槽高度** 260 → 280，避免正文垂直溢出

## 验证

- `apply_template.py`：安装 29 个文件成功，exit 0
- 全新 brand 项目（不跑 apply_template）：`build-deck` 自动装模板，structured **0 error**
- 全新 brand-core 项目：structured **0 error**，4 master / 9 layout
- `self-check`：通过

## 预期

生成阶段从 94 次调用 / 9.63M token / 764 积分回到：
一次 `build-deck` + 少量模型编排，约 **5–15 次 / 0.5–1M token**；
按 11-10 的平台积分单价，约 **50–150 积分**（单价问题另见 1.0.25 的说明）。

# V1.0.25 — 大纲阶段的低上下文优化（只改提示词）

1.0.24 的真实 run：大纲 11.8 分钟 / 185 积分，生成 3.9 分钟 / 75 积分，
合计 260 积分。生成链路已经没问题，大纲成了瓶颈。

日志显示 11 分钟里约 5 分钟在读 skill 源码/模板，另外约 5 分钟在写大纲：
- 18:36:30 读完整 `schemas/outline.schema.json`，一步 122 秒
- 18:42:22 直接 `write outline.json`，报 `file has not been read`，空转 100 秒
- 同一阶段十几个文件逐个 `cat`/`grep`，每次一次模型往返

这一版只改提示词，不动生成链路，也不动品牌/主题两条流程的边界：

- **批量读**：同一阶段多个文件用一条 `grep`/`sed`/`cat` 一起读
- **不读完整 schema**：大纲字段以 `references/outline-contract.md` 为准；
  只有 contract 没覆盖的字段再按需查 schema 片段
- **先 read 再 write**：`outline.json` 已存在时先 `read`，不存在直接 `write`；
  不要写两次

**没有改**（避免影响 21 套主题稿）：
- 没有加“只读用户材料 + outline-contract”的阅读白名单——主题稿仍需要读
  `page-patterns.md` / `theme-system.md` / theme token
- 没有删掉“补 design_spec §II–§VIII/§X”的手工步骤——主题稿没有品牌模板可继承

预期：大纲从 32 次调用 / 3.08M token / 185 积分降到约
12–18 次 / 1–1.5M / 60–100 积分；生成阶段保持 1.0.24 的水平。

# V1.0.24 — 修正：中泰品牌框架 + PPT Master 内容版式

1.0.23 把整本 deck 换成了中性的 `presentation_core`，丢了中泰的 logo、底图、目录、
结束页——这是理解错误。这一版修正为：**品牌框架不动，只换内容页构图**。

## 修正内容

- `prepare-core-project.mjs`：不再装中性 presentation_core，不再套 21 主题 paint。
  它从中泰品牌模板复制：
  - 固定页：`01_cover` / `02_title` / `03_toc_*` / `04s_section` / `05_ending`
  - 品牌底图：`images/bg-cover/title/content/ending.jpg`
  - 新增的 6 个 `core-*` 内容版式
- 新增 6 个品牌-core 内容版式（中泰背景/logo/标题条/安全区/页码不变）：
  - `06c_three_card.svg` — 3 段卡 + 结论条
  - `06d_four_card.svg` — 4 段卡 + 结论条
  - `06k_kpi_evidence.svg` — 4 个品牌红指标 + 证据面板
  - `06cmp_comparison.svg` — 指标带 + 左右对比 + 结论条
  - `06t_timeline.svg` — 4 步流程 + 结论条
  - `06s_data_story.svg` — 证据面板 + 右侧判断 + 来源
- `compose-core.mjs`：固定页沿用中泰 token；内容页按 `template` 映射到 `core-*`：
  - 3 卡 → `core-three-card`；4 卡 → `core-four-card`
  - metrics-4 → `core-kpi-evidence`；metrics-compare → `core-comparison`
  - structure → `core-timeline`；table / table-metrics / content-rich → `core-data-story`
  - TOC 跳过，由 `build-toc.mjs` 生成品牌目录
- `build-deck --layout-system core`：prepare → 投影 → 品牌契约 → compose-core →
  build-toc → gen-spec-lock → check-pages → PPTX/HTML

## 验证（易盾 run outline，11 页）

- `check-pages`：11 页通过
- `svg_quality_checker`：0 error
- `pptx-export`：`mode=structured`，**4 master / 9 layout / 50 placeholder**，0 error
- 视觉：封面/项目名/目录/结尾仍是中泰品牌；内容页为
  4 段卡（品牌红标题 + 结论条）、KPI + 证据面板、数据故事、时间线
- HTML：单文件，品牌底图内联

## 边界

- 表格页目前用 `core-data-story` 的文本表格；原生 `table_summary` 后续
- chart / picture 版式未使用
- 品牌-core 不套 21 主题；21 主题仍用于非品牌主题稿

# V1.0.23 — 内容版式切到 PPT Master 的 presentation_core（已被 1.0.24 修正）

1.0.22 解决了源文件、门禁、契约和密度，但内容版式仍是中泰自己的 15 个简化版式。
这一版把结构层换成引擎自带的 `presentation_core` 20 个版式；21 套主题只负责 paint，
不再继续扩写中泰版式。

## 新增

- `scripts/prepare-core-project.mjs <project> [--theme <id>]`
  - 把 `runtime/engine/templates/layouts/presentation_core/templates/` 的 20 个版式装进项目
  - 默认 `zhongtai-brand` paint；也可选 `themes/tokens/<id>.json` 的 21 套主题
  - 写 `template.json`（type=layout）和 `theme_selection.json`
  - 把文字 `object` 槽位映射成 `body`：PPTX 的 object 槽位会继承项目符号，
    会把卡片标题 / KPI 值变成 bullet；映射后正文无项目符号
- `scripts/compose-core.mjs <project> [--check] [--only PXX] [--json]`
  - 按 `template` 映射到 core 版式：cover/title→title_slide，toc→title_content，
    cards-3→three_card，metrics-4→kpi_dashboard，metrics-compare→comparison，
    structure→process_timeline，table/table-metrics/content-rich→data_story
  - 4 张卡自动落到 `kpi_dashboard`（4 个标题块 + 内容面板）；3 张卡用 `three_card`
  - 文本按 `data-pptx-bounds` 算每行字数，标题/正文分字号，卡片标题用品牌色加粗
  - paint：把 core 的中性色映射到 theme 的 background/surface/text/muted/primary/rule
- `build-deck.mjs --layout-system core`
  - 自动 prepare（未装时）→ outline-check → 投影 → 契约 → compose-core →
    gen-spec-lock → check-pages → PPTX / HTML
  - 目录也由 compose-core 生成，不再跑 build-toc
- `fill-brand-contract.mjs` 支持 `type=layout`：不塞品牌底图；spec_lock 的
  typography 用 core 字号（display 54 / metric 28 / title 36 / subtitle 24 /
  body 22 / annotation 14）
- `check-pages.mjs` 视觉构件阈值改为 standard ≥3、rich ≥4（core 版式 3 个面板是合法构图），
  并保留 1.0.22 的正文密度门禁（<160 字阻断）

## 验证（易盾 run outline，11 页）

- `build-deck --layout-system core --format both`：12 个步骤全 ok
- `check-pages`：11 页通过
- `svg_quality_checker`：0 error
- `pptx-export`：`mode=structured`，**1 master / 6 layout / 24 placeholder**，0 error
- HTML：单文件，无外部资源
- 视觉：title_slide / title_content TOC / three_card（红标题 + 正文）/
  process_timeline / data_story（证据面板 + 右侧 key message）/ kpi_dashboard

## 已知边界

- `table_summary` 的原生表格还没接：表格页先用 `data_story` 的文本表格
- `chart_insight` / picture 版式未使用（需要图表/图片数据）
- 中泰品牌 logo/底图还没做成 core skin；默认 core 是中性版式 + 品牌色 paint
- paint 是中性色映射，不是把每套主题的组件/装饰系统完整执行

# V1.0.22 — 源文件读取 + 一条命令构建 + 品牌契约自动继承

上一版 compose 把页面生成变成 0 次模型调用，但真实 run 仍然花了 1526 积分：
出大纲 511（PDF 解析折腾 10 分钟）+ 生成 1015（30 次门禁、23 次改 design_spec/spec_lock、
8 次 HTML 导出、7 次 PPTX 导出）。这一版把这三个放大器一起拆掉。

## 1. `extract-source`：复用 PPT Master 的 PDF 读取

- 新增 `scripts/extract-source.mjs` + `scripts/extract_source.py`
- 商业默认 pypdf（BSD-3，纯文本）；可选 pdfplumber（MIT）
- 引擎的 `runtime/engine/scripts/source_to_md/pdf_to_md.py` 本身是 MIT，但依赖 **PyMuPDF（AGPL-3.0）**。
  它只在后端/自托管、显式 `--allow-agpl` 时启用；分发给客户的客户端不要走这条路径
- PyMuPDF 路径：按字号推断 H1–H3、提取表格为 Markdown、去页眉页脚、写 `<!-- Page N -->`
- DOCX / PPTX 有 stdlib fallback；HTML / Markdown / TXT 直接读取
- 实测易盾白皮书：PyMuPDF 29 页 / 19,876 字 / 3.1 秒；pypdf 29 页 / 18,422 字 / 0.5 秒
- 注意：应用自带 hardened Python 不能加载 PyMuPDF（Team ID 限制）；需要 uv/系统 Python
  + `pip install pymupdf`，或继续用 pypdf 回退

## 2. `build-deck`：一条命令跑完整条链路

- 新增 `scripts/build-deck.mjs`
- 顺序：outline-check → outline-to-spec → fill-brand-contract → check-design-spec →
  compose → build-toc → gen-spec-lock → check-pages → PPTX / HTML
- 失败停在具体步骤并打印该步输出；`--only P07` 只重跑单页链路
- 实测：从空 design_spec/spec_lock 开始，12 页 structured + HTML 共 **2.5 秒**，0 error
- 替代真实 run 里的 30 次门禁 + 8 次 HTML + 7 次 PPTX + 41 次查看

## 3. `fill-brand-contract`：品牌契约自动继承

- 新增 `scripts/fill-brand-contract.mjs`
- 从 `template.json` + `outline.json` 填 design_spec §I–§VIII/§X 与 spec_lock 的
  colors / typography / visual_style / icons / images；不再留 `[fill]`
- `gen-spec-lock` 自动生成 `page_layouts`（P01 → 01_cover 这种原型映射）
- 实测：空 design_spec → check-design-spec 0 warning；spec_lock 无 `[fill]`；
  structured 导出 0 error
- 替代真实 run 里的 23 次 design_spec/spec_lock 手改和 30 次门禁

## 4. 内容密度：用满 outline 的四层

- `compose-deck` 的卡片自动吸收 `evidence`；soWhat 默认变成结论条；source 变成脚注
- 实测同一份 run outline：
  - P04 117 → 230 字
  - P07 89 → 252 字
  - P06 139 → 296 字
  - P09 126 → 208 字
  - P10 130 → 213 字
- `compose-deck --check` 新增每页正文字数；低于 180 字给出密度告警

## 5. PPT Master 版式的发现（下一版）

引擎自带 `runtime/engine/templates/layouts/presentation_core/`，有 **20 个结构版式**：
title_slide / title_content / section_header / two_content / comparison / title_only / blank /
content_caption / picture_caption / hero_statement / editorial_split / three_card /
kpi_dashboard / process_timeline / data_story / title_picture / two_picture_caption /
screenshot_focus / chart_insight / table_summary。

它和 21 套主题的正确关系是：**presentation_core 管结构，主题管 paint**。
1.0.23 计划把内容版式切到 presentation_core，品牌母版作为 skin；详见 OPTIMIZATION-LOG。

# V1.0.21 — 页面确定性合成：把模型从逐页生成里拿出来

V1.0.20 把「目录空行」和「整页文字」变成了机制，也补了 6 个 proxy 内容版式；但页面仍然是模型逐页画的：
大纲确认后要写生成脚本、跑门禁、改卡片/表格坐标，一次 12 页稿仍然 170 次左右的模型往返。

这一版加的是 **compose-deck.mjs**：大纲确认后，固定页原样复制，内容页按 `template` 选版式，
把卡片 / 表格 / 指标 / 对比画进原型自带的 `content-proxy` 画布。页面生成 0 次模型调用，
placeholder 契约天然一致。

## 新增

- `scripts/compose-deck.mjs`：从 `outline.json` + `<project>/templates/` 合成 `svg_output/P01..PNN.svg`
  - `--check` 只校验、不写文件；`--only P07` 只重生成失败页；`--json` 输出机器报告
  - 内容页 6 个渲染器：`cards`（2–4 张）、`metrics`（3–4 个）、`table`（原生表格）、
    `metrics-compare`（指标 + 双栏）、`table-metrics`（表格 + 指标）、`content-rich`（结论条 + 卡片）
  - 固定页：cover / title / section / ending / summary / structure / two_content 走 token 填充，
    目录页跳过，由 `build-toc.mjs` 生成
  - 大纲字段：`template` + `cards` / `metrics` / `table` / `compare` / `layers` / `takeaway`；
    缺省时按 role 与内容形态推断（表格 → `table`，指标 → `metrics-4`，其余 → `cards-3`）
- `template.json`：补齐 `two_content` 与 6 个 proxy 版式的 `pages` 元数据、`density.capacity` 和 `compose` 映射
- `schemas/outline.schema.json`：登记 `template` / `cards` / `metrics` / `table` / `compare` / `layers` / `takeaway` / `projectNo` / `department` / `date`
- `SKILL.md` / `Agent.md` / `brand-template.md` / `outline-contract.md` / `page-patterns.md`：
  页面执行改为「先 compose，再 build-toc，再 check-pages」；门禁失败只用 `--only` 重生成失败页
- `package.json`：新增 `compose` / `compose:check`
- 文案：员工 `metadata.json` 改为「支持单文件 HTML 与可编辑 PPTX」，移除「后端可用时才导出 PPTX」的旧口径；`Agent.md` / skill metadata / `agents/openai.yaml` / `engine-usage.md` 同步

## 验证（易盾白皮书 + 服务器配置 DOCX，12 页）

- 页面生成：**0 次模型调用**（compose-deck 纯脚本）
- `check-pages.mjs`：12 页构图通过
- `svg_quality_checker.py --canonical-authoring --stage final`：0 error
- `pptx-export.mjs`：`mode=structured`，4 master / 11 layout / 49 placeholder，0 error
- 视觉抽查：封面、项目名、8 条目录、三段卡、4 卡、分层结构、5 行能力表、指标 + 双方案对比、
  配置表 + QPS 指标、四效益指标 + 结论条，均落在安全区
- 修复回归：卡片正文重复标题、指标单位压数字、表格 GPU 列截断、卡片高度留白、48px 未声明字号

## 预期影响

- 页面阶段从 122 次往返 / 12.4M token（原 run 的 73%）降到 0；
- 整单预计从 171 次 / 17.0M token / 1368 积分降到约 **25–45 次 / 1.5–3M token / 120–350 积分**（估算，需一次真实员工 run 复核）
- 前提：大纲阶段要为每页写 `template` 和对应数据；这仍然是一次模型 pass，但不再逐页执行

## 兼容

- 1.0.20 的 `build-toc`、`check-pages`、原子导出（snapshot/restore）、6 个 proxy key 全部保留；
- 手写页面仍可用于 `content-rich` 自定义构图，但必须先复制原型，不要改 `content` 的文字槽。

# V1.0.20 — 目录空行与整页文字两个硬伤

上一版加了 6 条 / 双栏目录原型和「纯文字页」提示，但都只是“有更好”：
模型照样复制 10 槽模板填空 8 条，导出时纯文字页也只打一行 warning。这一版改成机制。

## 目录页：按章节数生成，不再留空槽

- 新增 `scripts/build-toc.mjs`：从 `outline.json` 推导章节（目录页之后、结尾页之前的 section / content 页），
  按实际条数重排序号与行距（最多 10 条，超过报错让大纲合并章节），整块在安全区内垂直居中
- 条目槽从 300 加宽到 552 并右移到 x 640–1192：32px 下「合规风控及安全方案」原来溢出 1.8%，现在放得下
- 原型 `03_toc_10.svg` / `03_toc_6.svg` 的第 9、10 行原来落在 y=618（越过安全区 576、压进底部红曲线），
  改为 142–565；条目上限 20，超过报错让大纲合并章节
- `{{TOC_ITEM_n}}` 由脚本填实，不再留占位符

## 内容页：整页文字直接阻断

- 新增 `scripts/check-pages.mjs`：按页统计母版层以外的视觉构件，standard 页 <4、rich 页 <5 即报错；
  `hero` 与 `density: "lean"` 豁免；同一版式占内容页一半以上给告警
- `pptx-export.mjs` 在转换前跑这道门禁，未通过直接 exit 3（`--force` 才放行）；
  原来的「纯文字页」warning 改成写进交付说明的摘要
- 新增 `references/page-patterns.md`：8 种版式的坐标与 SVG 写法（三段卡、指标条、原生表格、
  分层结构块、左右对比、2×2 矩阵、流程条、结论条 + 三卡），先选形态再填字
- `SKILL.md` / `brand-template.md` / `Agent.md` 同步：编号要点只允许 `dense → lean` 的页，一套稿最多一页

## 版式契约：proxy 页面必须有自己的 key

改形状时发现一个会静默降级的问题：把 `04_content` 的正文槽改成 `data-pptx-binding="proxy"`
却仍用 `content` 这个 key，ppt-master 会报 `changed its placeholder contract`，结构化导出
自动降级 flat，母版和版式全丢（文件还能打开，但用户在 PPT 里看到的是白板）。

- 新增 6 个 proxy 内容版式原型：`cards-3` / `table` / `metrics-4` / `metrics-compare` /
  `table-metrics` / `content-rich`，都带独立 key 与 picker 名
- `build-toc.mjs` 生成目录时按条数写版式 key `toc-<n>`，并在 `templates/` 落同名原型
- `check-pages.mjs` 增加 `proxy-layout-key` 规则：proxy 页面还挂 `content` key 直接报错

# V1.0.2（中泰版）— 品牌母版模板 + 导出格式参数
## V1.0.2

- 模板改为 ppt-master 的「整页 SVG 工作区」形态：`templates/*.svg` + `images/` + `design_spec.md`
- 五页按 master / layout / slot 三层标记，底图与 logo 进母版，可编辑区用 `data-pptx-placeholder`
- 新增结构化导出：`--pptx-structure structured`，导出文件里是真母版与版式
- 文档补 spec_lock 的 `pptx_masters` / `pptx_layouts` / `page_pptx_layouts` 写法

## V1.0.1

- 封面改为纯品牌整图，不再叠加任何文字
- 目录改为模板原样式：左侧红「目录」+ CONTENTS，中间竖线，右侧 32px 条目，最多 10 条
- 结尾页改为红底白字
- 新增 `structure.fixedPages`（cover / title / toc / ending），生成为复用而非重画
- 导出格式选项精简为 HTML / PPTX
- 补充表格与系统架构图的放置规则

## 品牌母版模板

- 新增 `templates/brand/zhongtai-v5/`：三张品牌底图（封面 / 封二 / 内页）、`template.json`、6 张预览图
- 模板管形式、不管骨架：结构层锁死（安全区、底部禁区、标题条 x=204、四档字号），常量层可替换（颜色、字体、底图）
- `template.json` 内置三种场景骨架：内部立项 17 页、方案汇报 9 页、客户提案 6 页
- 新增 `references/brand-template.md`

## 导出格式参数

- 制作参数新增「导出格式」：HTML 单文件 / PPTX 可编辑
- 新增 `scripts/pptx-export.mjs`：先跑质量门禁，再调本地引擎导出原生 PPTX；没有可用 Python 时明确报错，不静默降级
- `ENGINE.md` 调整执行边界：默认后端执行，本地有运行时时允许经该脚本执行

## 首页

- 模板列表把「中泰证券 立项建设方案 V5」放在第一位
- showcase 增加中泰 6 页（封面、项目名页、目录、表格页、内容页、尾页），排在最前

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

# V71 — 改名 zhongtai-pptx

这个包正式归入 `zhongtai-pptx` 这条技能线，版本号 V71。

## 变化

| 项 | 旧 | 新 |
|---|---|---|
| 技能名 / 安装目录 | `clawhive-deck-studio` | `zhongtai-pptx` |
| 版本 | `0.8.1` | `v71` |
| 安装包 | `clawhive-deck-studio-0.8.1.skill` | `zhongtai-pptx-v71.skill` |

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
unzip -q zhongtai-pptx-v71.skill -d "$T/SKILLs/"
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
