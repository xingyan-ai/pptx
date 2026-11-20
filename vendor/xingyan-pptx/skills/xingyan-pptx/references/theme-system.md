# 主题系统

## 1. 主题卡与 token

`themes/cards/*.json` 是唯一事实源。每张卡只有 5 个颜色和 2 个排版角色，`scripts/theme-select.mjs` 只读取，不修改。`themes/tokens/*.json` 是构建期展开后的执行 token，`themes/overrides.json` 是人工审阅后的修正。

不要手改 `themes/tokens/`；改主题卡或 overrides 后重新运行生成脚本。

## 2. 颜色角色

| Token | 用途 |
|---|---|
| `background` | 页面底色 |
| `surface` | 卡片、次级区块 |
| `surfaceAlt` | 强调块面、图表底板 |
| `text` | 正文 |
| `textMuted` | 注释、来源、脚注 |
| `primary` | 主结构色、标题、关键图形 |
| `accent` | 强调色，用于填充和大色块 |
| `textAccent` | 文字安全的强调色；当 `accent` 对比度不足时等于 `primary` |
| `accent2` | 第二强调色 |
| `rule` | 规则线、边框 |
| `onAccent` / `onPrimary` | 放在强调色/主色上的文字色 |

**规则**：`accent` 只做填充；需要文字强调时用 `textAccent` 或 `primary`。低对比度的荧光色、浅粉色、浅青色都属于填充色。

## 3. 排版角色

| 角色 | 用途 |
|---|---|
| `display` | 封面、结尾大主张 |
| `title` | 页面标题 |
| `metric` | KPI 大数字 |
| `subtitle` | 副标题、引导句 |
| `body` | 正文 |
| `annotation` | 注释、来源、页码 |

每套 token 有两套字体栈：

- `title_stack` / `body_stack`：HTML 用，保留 Inter / Poppins。
- `title_stack_ppt` / `body_stack_ppt`：PPTX 用，Inter / Poppins 落到 Arial，中文落到 PingFang / 微软雅黑 / 宋体。

## 4. 装饰系统

每套 token 带一个 `decoration` 块，由 `themes/decorations.profiles.json`（按 `visualStyle` 家族）和 `themes/decorations.overrides.json`（按主题 id）生成。运行 `node scripts/build-decorations.mjs` 写入 token，同时在 `themes/packages/<id>/` 生成 `decoration.json` 和 `decoration.fragment.md`。

| 字段 | 说明 |
|---|---|
| `stroke` | 描边宽度：常规 / 重描边 / hairline，以及颜色角色 |
| `shadow` | 投影偏移与颜色；`opacity < 1` 视为柔和投影 |
| `tag` | 页眉标签的填充、文字色、描边、字号、字重、高度、内边距 |
| `rule` | 标题分隔线的厚度与颜色 |
| `marker` | 要点标记块尺寸、描边、填充 |
| `bands` | 页脚信息带开关与配色 |
| `chart` | 条形高度、描边、交替填充、数值字号 |
| `radius` | 圆角 |
| `furniture` | 页面家具清单：`tag` / `rule` / `marker` / `hardShadow` / `softShadow` / `offsetBlock` |

颜色字段写角色名，不写 hex，执行时通过 `token.colors` 解析。

装饰的作用边界：

- `--scope design` 把装饰写进 `design_spec.md` §V 和 `spec_lock.md` 的 `## decoration`
- 不改 §I、§II、§VI–§X、页数、页序和每页的内容结构
- 页面家具是跨页一致性约束：内容可变，家具不换

执行后的校验：

```bash
node scripts/theme-furniture.mjs <theme-id> --out /tmp/sample.svg   # 看装饰长什么样
node scripts/check-theme-fidelity.mjs <project>                     # 页面是否真的用了这套装饰
```

`check-theme-fidelity.mjs` 检查三件事：颜色是否越出 palette、描边宽度是否声明过、页面家具是否齐全。缺家具的页面按错误处理，不降级为警告。

## 5. 组件系统

装饰管页面家具，组件管图表、表格、KPI 这些"内容载体"长什么样。每套 token 带一个 `components` 块，由 `themes/components.profiles.json`（按家族）和 `themes/components.overrides.json`（按主题）生成，运行 `node scripts/build-components.mjs` 写入，同时在 `themes/packages/<id>/` 生成 `components.json` 和 `components.fragment.md`。

| 组件 | 字段 |
|---|---|
| `kpi` | `fill` / `border` / `borderColor` / `shadow` / `radius` / `numberScale` / `labelCase` |
| `table` | `headerFill` / `headerText` / `border` / `borderColor` / `rowRule` / `rowRuleColor` / `zebra` / `cellPadX` / `cellPadY` / `radius` |
| `chart` | `barHeight` / `barStroke` / `barFill` / `axisRule` / `axisColor` / `gridlines` / `gridColor` / `valueSize` / `valueWeight` / `labelSize` |
| `line` | `stroke` / `dot` / `dotFill` / `dotStroke` / `area` / `areaOpacity` |
| `callout` | `fill` / `text` / `border` / `borderColor` / `shadow` / `barWidth` / `barColor` / `radius` |
| `list` | `marker`（`square` / `circle` / `dot`）/ `markerSize` / `markerStroke` / `markerFill` |

同一个家族的组件默认值一致，主题 override 只写要改的字段。以酸性为例：表格 3px 黑边 + 黑色表头、行线 3px、条形图条高 22px 带 3px 描边、KPI 硬投影 + 3px 黑边、引用块酸性色底黑边。换成 swiss-minimal 就变成无填充、hairline 行线、无投影。

执行边界：

- `--scope components` 把组件规则写进 §V 的 `### Component System` 和 `spec_lock.md` 的 `## components`
- `--scope design` 会同时写组件层和装饰层
- 页面里用 `data-component="table|chart|kpi|callout|list"` 标记组件组，`check-theme-fidelity.mjs` 按这些标记校验
- 不改页数、页序和每页的内容结构

## 6. 密度

| 密度 | 页边距 | 块间距 | 栏间距 | 圆角 | 行距 |
|---|---:|---:|---:|---:|---:|
| spacious | 72 | 32 | 32 | 8 | 1.6 |
| standard | 64 | 24 | 28 | 6 | 1.5 |
| dense | 56 | 18 | 24 | 4 | 1.4 |

## 7. PPT 保真度

| 值 | 含义 | 处理 |
|---|---|---|
| `native` | 颜色、字体、几何可直接映射 | 不做特殊处理 |
| `approximate` | 玻璃、霓虹、纸纹、3D 等效果无法完全原生 | 用静态渐变、半透明填充、烘焙背景近似；阅读 `pptFallback` |
| `html-only` | 依赖动画、混合模式等 HTML 能力 | HTML 保留，PPT 用静态降级 |

当前 21 套中 5 套有颜色人工 override，全部 21 套有组件级 override；审核全部通过。`assets/theme-audit.json` 记录每套的对比度、保真度和问题。

## 8. Visual style 映射

主题卡的 `visualStyle` 映射到执行内核的 18 个内置风格之一或 `custom`。内置风格只负责形状语言和装饰密度，颜色和字体仍由 token 显式提供。

## 9. 场景表

`themes/scenarios.json` 给 21 套主题各写四件事：

| 字段 | 用途 |
|---|---|
| `intent` | 粗粒度用途桶：`business-ops` / `market-research` / `academic` / `marketing` / `portfolio` / `campus` / `culture` / `tech` / `product-launch` / `industrial` / `public-sector` / `creative-lab` |
| `scenes` | 具体适用场景，例如「经营复盘」「科研答辩」「社团招新」 |
| `signals` | 用户话里出现就会加分的词 |
| `avoid` | 明确不适合的场景，命中会扣分 |

`theme-select.mjs` 用这张表做三件事：命中加分、用途桶一致加分（不一致扣分）、候选按 `visualStyle` 家族限流——同一家族最多 2 条，避免五条候选都是同一类商务蓝。brief 完全没有信号时按家族轮转铺开，而不是返回 id 字母序的前五个。

## 10. 字体策略

`themes/fonts.map.json` 把主题里出现的每个字体家族归到三类：

| render | 含义 | 当前字体 |
|---|---|---|
| `embed` | 随包 woff2（latin 子集），HTML 导出时以 data URI 内嵌 | Inter、Poppins |
| `substitute` | 厂商字体换成可内嵌的 OFL 近似体，原字体名保留在栈里 | Arial Black→Archivo Black、Calibri→Carlito、Arial Narrow→Roboto Condensed |
| `system` | 只走系统栈 | Arial、Helvetica Neue、Georgia、PingFang SC、微软雅黑、Songti SC、SimSun、DengXian、Noto Sans/Serif SC |

- HTML 导出默认内嵌，`--no-embed-fonts` 关闭；内嵌量约 90–120 KB（Inter 三个字重）
- CJK 字体不内嵌：整套动辄十几 MB，且 macOS / Windows 都有可用替代
- PPTX 不走这套逻辑，一律用 token 里的 `*_stack_ppt`

查看某套主题的最终渲染：`node scripts/check-fonts.mjs --theme <id>`。

## 11. 人工 overrides

`themes/overrides.json` 目前处理了：

- 7 套 `accent == accentSecondary` 的主题，补第二强调色
- 3 套低对比强调色主题，明确「填充色 / 文字强调色」分工
- `cyber-purple-genz` 补齐紫色主色和粉色强调

每条 override 都带 `note`，写入 token 的 `overrideNote`。
