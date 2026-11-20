## III. Visual Theme

### Theme Style

- **Mode**: pyramid
- **Visual style**: data-journalism
- **Theme**: Capital Journal 全球资本新闻
- **Tone**: 审慎、权威、调查感

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #EFE9D8 | 纸张/画布底色 |
| Secondary background | #F5F1E7 | 卡片、次级区块 |
| Primary | #224E75 | 主结构色、标题与关键图形 |
| Accent | #224E75 | 强调色，用于关键数字与结论 |
| Secondary accent | #B52326 | 次级数据与装饰 |
| Body text | #181B1D | 正文与表格文字 |
| Secondary text | #6A6964 | 注释、来源、脚注 |
| Divider | #C0BCAF | 规则线、表格分隔、边框 |

- **Color rule**: `accent` 只用于填充和大色块；文字强调使用 `primary`；低对比强调色使用 `textAccent`。

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | Georgia | Georgia | Georgia / Inter | Noto Serif SC, SimSun, serif |
| Body | Noto Serif SC | Noto Serif SC | Inter / Helvetica Neue | Noto Sans SC, Microsoft YaHei, sans-serif |

- **Title stack**: Georgia, "Noto Serif SC", "Songti SC", serif
- **Body stack**: "Songti SC", SimSun, "Noto Serif SC", serif

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
- **Composition tendency**: multi-column reading allowed, but one conclusion leads
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
