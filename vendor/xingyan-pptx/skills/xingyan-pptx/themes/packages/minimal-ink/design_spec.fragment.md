## III. Visual Theme

### Theme Style

- **Mode**: pyramid
- **Visual style**: ink-wash
- **Theme**: 极简水墨
- **Tone**: 极简、留白、艺术

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F5F5F5 | 纸张/画布底色 |
| Secondary background | #F9F9F9 | 卡片、次级区块 |
| Primary | #244842 | 主结构色、标题与关键图形 |
| Accent | #244842 | 强调色，用于关键数字与结论 |
| Secondary accent | #FFFFFF | 次级数据与装饰 |
| Body text | #111111 | 正文与表格文字 |
| Secondary text | #686868 | 注释、来源、脚注 |
| Divider | #C3C3C3 | 规则线、表格分隔、边框 |

- **Color rule**: `accent` 只用于填充和大色块；文字强调使用 `primary`；低对比强调色使用 `textAccent`。

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | Noto Serif SC | Noto Serif SC | Georgia / Inter | Noto Serif SC, SimSun, serif |
| Body | Songti SC | Songti SC | Inter / Helvetica Neue | Noto Sans SC, Microsoft YaHei, sans-serif |

- **Title stack**: "Songti SC", SimSun, "Noto Serif SC", serif
- **Body stack**: "Songti SC", "Noto Serif SC", "SimSun", serif

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Display | 57 |
| Title | 44 |
| Metric | 37 |
| Subtitle | 25 |
| Body | 22 |
| Annotation | 13 |

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 标题先给判断，正文给证据，注释给口径
- **Composition tendency**: one object or relationship per page; text remains crisp
- **Cross-page continuity**: 同一套颜色、字体、页边距与页码位置贯穿全 deck
- **Spacing posture**: spacious
- **Spacing anchors**: 页面边距 72 px；块间距 32 px；栏间距 32 px；圆角 8 px；正文行距 1.6

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
