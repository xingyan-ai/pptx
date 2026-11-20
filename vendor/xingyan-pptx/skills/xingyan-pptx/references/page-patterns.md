# 内容页版式食谱（中泰 V5）

内容页只有一种骨架（`04_content`），但**不允许整页只写编号要点**。
一页文字再多，也要有一个承担信息的视觉结构：卡片、表格、结构块、指标条、矩阵、流程。

`scripts/check-pages.mjs` 会拦：standard 页少于 4 个视觉构件、rich 页少于 5 个，
`pptx-export.mjs` 导出前强制跑。hero 页和 `density: "lean"` 的页豁免。

## 0. 先选形态，再写坐标

中泰 V5 的内容版式都带一个**版式 key**，key 和 `templates/` 里的原型一一对应。
页面根节点写 `data-pptx-layout="<key>"`，结构化导出才认；不要自己造 key。

| 内容长什么样 | 用哪个 | 版式 key | 本文件 |
|---|---|---|---|
| 3 条并列的论据 / 结论 | 三段主张卡 | `cards-3` | §1 |
| 4 个可对比的数字 | 指标条 | `metrics-4` | §2 |
| 行头 × 列头的配置、参数、对照 | 原生表格 | `table` | §3 |
| 分层、包含、上下游 | 分层结构块 | `structure` | §4 |
| 两种方案对比 | 左右对比双栏 | `metrics-compare` / `two-content` | §5 |
| 两个维度切四类 | 2×2 矩阵 | `content-rich` | §6 |
| 先后顺序、阶段 | 流程条 | `content-rich` | §7 |
| 一个结论 + 三条支撑 | 结论条 + 三卡 | `cards-3` | §8 |
| 表格 + 下面一排参数 | 表 + 指标 | `table-metrics` | §3 + §2 |
| 上面一排指标 + 下面双栏 | 指标 + 对比 | `metrics-compare` | §2 + §5 |

`content-rich` 是通用代理版式：没有预设结构，整块由页面自己画。上表之外的构图用它。

**为什么要有 key：** 这些版式的占位符是 `data-pptx-binding="proxy"`，页面里的形状直接进幻灯片，
但 ppt-master 的结构化导出会核对「页面用的 key ↔ `templates/` 里的原型」是否同一套契约。
直接改 `04_content.svg`（正文文字占位符）的形状会报 `changed its placeholder contract`，
导出降级成 flat，母版和版式全丢。

**编号要点只允许出现在 `density: "lean"` 的页**，一套稿最多一页。
同一个形态连续出现两次就要换；一套稿至少 3 种宏观构图。

## 0.1 落到页面里

从对应原型复制页面后：

1. 保留根节点属性、母版底图 `<image id="master-background">`、章节 / 标题 / 页码槽
2. 把根节点的 `data-pptx-layout` 保持成原型的 key，不要改回 `content`
3. 原型里的 `<g id="content-proxy"></g>` 就是画布，把本节后续的形状全部放进去
4. 代理内容里的文字仍然用独立 `<text>`，PPTX 里才可编辑

## 0.2 用 `compose-deck.mjs` 确定性合成

品牌母版稿不要逐页手写。在 `outline.json` 的每页写 `template`，再按形态补数据，然后跑合成器：

```bash
node scripts/compose-deck.mjs <project> --check   # 只校验，不写文件
node scripts/compose-deck.mjs <project>           # 写 svg_output
node scripts/compose-deck.mjs <project> --only P07 # 只重生成失败页
```

合成器复制整页原型，只把形状写进 `<g id="content-proxy">`；原型根节点、母版底图、章节 / 标题 / 页码槽和所有 `data-pptx-*` 原子都不动，所以结构化导出的 placeholder 契约天然一致。缺省 `template` 时按 role 和内容形态推断：有 `table` → `table`，有 `metrics` → `metrics-4`，有 `cards` → `cards-3`，标题含「架构 / 分层」→ `structure`，其余 → `cards-3`。

字段（都写在 slide 对象上，均可选）：

```json
{
  "template": "cards-3",
  "cards": [
    { "head": "监管层面", "body": ["《生成式 AI 服务管理暂行办法》", "TC260-003 基本要求"], "footer": "底线：不合规不得上线" }
  ],
  "metrics": [
    { "value": "50", "unit": "ms", "label": "文本检测", "note": "短文本平均响应" }
  ],
  "table": {
    "columns": [{ "label": "场景", "width": 240 }, { "label": "CPU", "width": 100 }],
    "rows": [["文本系统及大模型部署", "64 核"]]
  },
  "compare": {
    "left": { "head": "SaaS 云端接入", "lines": ["API 快速接入，部署简单"] },
    "right": { "head": "私有化本地部署", "lines": ["国产信创适配，数据不出域"] }
  },
  "layers": [{ "name": "接口层", "text": "文本 / 图像 / 音视频检测接口" }],
  "takeaway": "分层解耦接入、策略与基础设施"
}
```

容量规则：`cards` 2–4 张、每卡正文 ≤6 行；`metrics` 3–4 个、数值 ≤5 字；`table` 列宽合计 ≤1145、y=140 时最多 8 行；`table-metrics` 表格 + 指标合计不越过 y=576。溢出在 `--check` 阶段就报错，不会写出坏页。

## 1. 三段主张卡

3 列 × 368 宽，间距 19。顶部 4px 品牌红条，标题 21px 红，正文 19px 黑。

```svg
<rect x="67"  y="120" width="368" height="380" fill="#FFFFFF" stroke="#D9D9D9"/>
<rect x="67"  y="120" width="368" height="4"   fill="#B20017"/>
<text x="87"  y="176" fill="#B20017" font-size="21" font-weight="700">监管要求</text>
<text x="87"  y="222" fill="#000000" font-size="19">《生成式 AI 服务管理暂行办法》</text>
<text x="87"  y="262" fill="#000000" font-size="19">《政务大模型应用安全规范》</text>
<text x="87"  y="302" fill="#000000" font-size="19">TC260-003 基本要求</text>
<text x="87"  y="452" fill="#595959" font-size="14">底线：不合规不得上线</text>
<!-- 第 2、3 列 x 换成 454 / 841 -->
```

写作要求：每卡一个判断词做标题（21px），2–4 行事实（19px），底部一行灰字下结论。

## 2. 指标条（4 个数字）

4 列 × 272 宽，间距 19。数字 60px 品牌红，单位 21px，标签 19px。

```svg
<rect x="67"  y="140" width="272" height="180" fill="#FFFFFF" stroke="#D9D9D9"/>
<text x="87"  y="230" fill="#B20017" font-size="60" font-weight="700">50</text>
<text x="150" y="230" fill="#B20017" font-size="21">ms</text>
<text x="87"  y="276" fill="#000000" font-size="19">文本检测</text>
<text x="87"  y="306" fill="#595959" font-size="14">短文本平均响应</text>
<!-- 第 2–4 列 x 换成 358 / 649 / 940 -->
```

数字必须是真实口径，且 `source` 写清来源；四个数字量纲不同时，单位写在数字右侧。

## 3. 原生表格

表头红底白字 44 高，行线 `#D9D9D9`，整表不越过 y=576。
列宽按内容分，总宽 1145（x 67–1212）。

```svg
<rect x="67" y="140" width="1145" height="44" fill="#B20017"/>
<text x="79" y="170" fill="#FFFFFF" font-size="19" font-weight="700">部署场景</text>
<text x="307" y="170" fill="#FFFFFF" font-size="19" font-weight="700">CPU</text>
<!-- 其余表头同高 -->
<rect x="67" y="184" width="1145" height="44" fill="#FFFFFF" stroke="#D9D9D9"/>
<text x="79" y="214" fill="#000000" font-size="19">文本系统及大模型部署</text>
```

先画一张横贯的底色行，再逐格画竖线，比逐格画矩形少一半节点。
列宽示例（合计 1145）：场景 240 / CPU 100 / 内存 110 / GPU 190 / 存储 130 / 系统 150 / 说明 225。

## 4. 分层结构块

每层一条 1145×88 的白条，左侧 6px 红条，层名 21px 红，内容 19px。
层与层之间留 16。

```svg
<rect x="67" y="140" width="1145" height="88" fill="#FFFFFF" stroke="#D9D9D9"/>
<rect x="67" y="140" width="6"    height="88" fill="#B20017"/>
<text x="97" y="192" fill="#B20017" font-size="21" font-weight="700">接口层</text>
<text x="230" y="191" fill="#000000" font-size="19">文本 / 图像 / 音视频 / 文档检测接口及结果查询</text>
<!-- 下一层 y = 244，再下一层 y = 348 -->
```

层内再分小格时，小格宽度 = (1145 − 2×24 − 间隙) / 格数，不要跨出白条。

## 5. 左右对比双栏

两块 560×390，x=67 与 x=652，中间 25 空隙。每块顶部一条 44 高的色块做栏头。

```svg
<rect x="67"  y="120" width="560" height="390" fill="#FFFFFF" stroke="#D9D9D9"/>
<rect x="67"  y="120" width="560" height="44"  fill="#B20017"/>
<text x="87"  y="149" fill="#FFFFFF" font-size="21" font-weight="700">SaaS 云端接入</text>
<text x="87"  y="196" fill="#000000" font-size="19">API 快速接入，部署简单</text>
<text x="87"  y="236" fill="#000000" font-size="19">更新实时同步</text>
<!-- 右栏 x 换成 652；不建议两栏都白底，右栏可反色 #B20017 强调推荐项 -->
```

## 6. 2×2 矩阵

四格各 560×180，x=67 / 652，y=135 / 335。格内左上角放 21px 结论，下面 19px 事实。

```svg
<rect x="67"  y="135" width="560" height="180" fill="#FFFFFF" stroke="#D9D9D9"/>
<text x="87"  y="173" fill="#B20017" font-size="21" font-weight="700">高概率 × 高影响</text>
<text x="87"  y="213" fill="#000000" font-size="19">提示词注入、DAN 攻击</text>
```

矩阵必须标清两个轴各是什么；轴标签放在矩阵外侧 14px 注释位。

## 7. 流程条

4–5 步。5 步：块宽 213、间隙 20；块高 96，块间画 24px 箭头或 2px 连接线。

```svg
<rect x="67"  y="180" width="213" height="96" fill="#FFFFFF" stroke="#D9D9D9"/>
<rect x="67"  y="180" width="213" height="4"  fill="#B20017"/>
<text x="79"  y="220" fill="#B20017" font-size="21" font-weight="700">接入</text>
<text x="79"  y="252" fill="#000000" font-size="19">网关鉴权</text>
<path d="M288 228 L296 228" stroke="#B20017" stroke-width="2"/>
```

## 8. 结论条 + 三卡

顶部一条反色结论（1145×72，红底白字 21px），下面三卡承接论据。
适合「先给判断，再给三条支撑」的页。

```svg
<rect x="67" y="120" width="1145" height="72" fill="#B20017"/>
<text x="87" y="166" fill="#FFFFFF" font-size="21" font-weight="700">合规是底线，攻击是常态，安全围栏是前置刚需</text>
<!-- 三卡 y=216，高 288，其余同 §1 -->
```

## 9. 通用约束

- 坐标只落在安全区：x 67–1212，y 96–576；页码区 y>650。
- 字号只用 80 / 32 / 21 / 19 / 14；不要为了塞内容缩到 16。
- 颜色只用 token：`#B20017` 品牌红、`#C00000` 注释红、`#000000` 正文、`#595959` 弱化、`#D9D9D9` 线。
- 文字必须是独立 `<text>`，不许转成路径；PPTX 里要可编辑。
- 卡片正文每行 ≤26 字；放不下就删限定语或拆页，不要换小字号。
- 每页留一个结论（`So what`），可以放在卡片底部灰字、结论条，或右下角 14px 注释。
