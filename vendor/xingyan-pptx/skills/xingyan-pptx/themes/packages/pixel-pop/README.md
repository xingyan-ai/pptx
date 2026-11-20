# Pixel Pop 像素波普

- id: `pixel-pop`
- density: `standard`
- visual style: `pixel-art`
- PPT fidelity: `native`
- audited: `True`

## 主题描述

pixelpop visual system

## 视觉行为

气质：轻快、复古、社交；视觉语汇：像素边框、黄青撞色、低分辨率图形；装饰：pixel frame, tiny sprite and stepped divider；构图：short blocks and clear adjacency; no sprite wall

## 禁忌

- 避免像素纹理干扰小字
- 不使用过多颜色
- 内容关系仍须清楚

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
