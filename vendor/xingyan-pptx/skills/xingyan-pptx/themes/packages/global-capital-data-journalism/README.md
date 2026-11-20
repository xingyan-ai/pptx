# Capital Journal 全球资本新闻

- id: `global-capital-data-journalism`
- density: `dense`
- visual style: `data-journalism`
- PPT fidelity: `native`
- audited: `True`

## 主题描述

news visual system with adaptive composition

## 视觉行为

气质：审慎、权威、调查感；视觉语汇：报纸式分栏、红蓝标记线、数字与注释并置；装饰：hairlines, datelines and selective red/blue highlights；构图：multi-column reading allowed, but one conclusion leads

## 禁忌

- 避免新闻标题堆叠
- 红色仅用于风险/重点
- 不伪造来源或数据

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
