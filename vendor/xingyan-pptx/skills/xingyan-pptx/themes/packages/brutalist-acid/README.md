# Brutalist Acid 酸性粗野主义

- id: `brutalist-acid`
- density: `standard`
- visual style: `brutalist`
- PPT fidelity: `native`
- audited: `True`

## 主题描述

超大文字、酸性撞色、粗黑边与硬投影

## 视觉行为

气质：大胆、挑衅、年轻；视觉语汇：酸性色块、粗黑描边、硬投影与超大字；装饰：bold borders, cutout blocks and one hard shadow；构图：asymmetric text-to-evidence scale; let one object dominate

## 禁忌

- 不要把每页都做成海报
- 避免低对比荧光字
- 装饰不能替代关系

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
