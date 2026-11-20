# Zen Stone 静石留白空间

- id: `zen-stone`
- density: `spacious`
- visual style: `soft-rounded`
- PPT fidelity: `native`
- audited: `True`

## 主题描述

章节编号、单图观察、材料矩阵、留白结语

## 视觉行为

气质：安静、平衡、冥想；视觉语汇：石色底与细边框、单一主视觉、大块呼吸留白；装饰：stone-toned frame, tiny number and no ornamental clutter；构图：single-focus composition; secondary detail recedes

## 禁忌

- 避免为了填空堆内容
- 不要使用高饱和色
- 图片必须有观察价值

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
