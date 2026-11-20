# Scientific Atlas 科学图谱

- id: `scientific-atlas`
- density: `dense`
- visual style: `data-journalism`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

图谱标注与青绿蓝编码的严谨科学风，适合研究、实验与技术解释

## 视觉行为

气质：严谨、探索、可验证；视觉语汇：图谱式标注、青绿与蓝色编码、坐标/刻度视觉；装饰：ticks, callouts, coordinates and measured lines；构图：diagram or data should carry the page, prose explains it

## 禁忌

- 不可伪造实验数据
- 图表必须有单位
- 不要用线框替代解释

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
