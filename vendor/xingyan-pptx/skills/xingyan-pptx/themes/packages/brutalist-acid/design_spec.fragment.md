## III. Visual Theme

### Theme Style

- **Mode**: pyramid
- **Visual style**: brutalist
- **Theme**: Brutalist Acid 酸性粗野主义
- **Tone**: 大胆、挑衅、年轻

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F4F1E8 | 纸张/画布底色 |
| Secondary background | #F8F6F1 | 卡片、次级区块 |
| Primary | #7A9004 | 主结构色、标题与关键图形 |
| Accent | #D7FF00 | 强调色，用于关键数字与结论 |
| Secondary accent | #2FF3E0 | 次级数据与装饰 |
| Body text | #090909 | 正文与表格文字 |
| Secondary text | #62615E | 注释、来源、脚注 |
| Divider | #C0BEB7 | 规则线、表格分隔、边框 |

- **Color rule**: `accent` 只用于填充和大色块；文字强调使用 `primary`；低对比强调色使用 `textAccent`。

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | Arial Black | Arial Black | Georgia / Inter | Noto Serif SC, SimSun, serif |
| Body | PingFang SC | PingFang SC | Inter / Helvetica Neue | Noto Sans SC, Microsoft YaHei, sans-serif |

- **Title stack**: "Arial Black", Arial, "PingFang SC", sans-serif
- **Body stack**: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Display | 55 |
| Title | 42 |
| Metric | 36 |
| Subtitle | 24 |
| Body | 21 |
| Annotation | 12 |

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 标题先给判断，正文给证据，注释给口径
- **Composition tendency**: asymmetric text-to-evidence scale; let one object dominate
- **Cross-page continuity**: 同一套颜色、字体、页边距与页码位置贯穿全 deck
- **Spacing posture**: standard
- **Spacing anchors**: 页面边距 64 px；块间距 24 px；栏间距 28 px；圆角 6 px；正文行距 1.5

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
