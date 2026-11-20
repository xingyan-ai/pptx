## III. Visual Theme

### Theme Style

- **Mode**: pyramid
- **Visual style**: data-journalism
- **Theme**: 冷蓝青绿月报
- **Tone**: 审慎、稳健、效率优先

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F5F7FB | 纸张/画布底色 |
| Secondary background | #F9FAFD | 卡片、次级区块 |
| Primary | #4A66AC | 主结构色、标题与关键图形 |
| Accent | #4A66AC | 强调色，用于关键数字与结论 |
| Secondary accent | #84BB1E | 次级数据与装饰 |
| Body text | #08194A | 正文与表格文字 |
| Secondary text | #626D8D | 注释、来源、脚注 |
| Divider | #D8DEE8 | 规则线、表格分隔、边框 |

- **Color rule**: `accent` 只用于填充和大色块；文字强调使用 `primary`；低对比强调色使用 `textAccent`。

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | Microsoft YaHei | Microsoft YaHei | Georgia / Inter | Noto Serif SC, SimSun, serif |
| Body | PingFang SC | PingFang SC | Inter / Helvetica Neue | Noto Sans SC, Microsoft YaHei, sans-serif |

- **Title stack**: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif
- **Body stack**: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Display | 49 |
| Title | 38 |
| Metric | 34 |
| Subtitle | 23 |
| Body | 20 |
| Annotation | 12 |

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 标题先给判断，正文给证据，注释给口径
- **Composition tendency**: data blocks are unequal: conclusion and variance lead
- **Cross-page continuity**: 同一套颜色、字体、页边距与页码位置贯穿全 deck
- **Spacing posture**: dense
- **Spacing anchors**: 页面边距 56 px；块间距 18 px；栏间距 24 px；圆角 4 px；正文行距 1.4

## VI. Icon Usage Specification

- **Primary bundled library**: tabler-outline
- **Stroke width**: 1.5

| Icon Path | Suitable Scenarios |
| --- | --- |
| icons/tabler-outline/book-2.svg | 阅读、内容场景 |
| icons/tabler-outline/sparkles.svg | AI、灵感 |
| icons/tabler-outline/users.svg | 用户、人群 |
| icons/tabler-outline/chart-bar.svg | 数据、趋势 |
| icons/tabler-outline/alert-triangle.svg | 风险、提示 |
| icons/tabler-outline/target-arrow.svg | 机会、动作 |
