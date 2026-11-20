# Memphis Motion 孟菲斯节奏

- id: `memphis-motion`
- density: `standard`
- visual style: `memphis`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

孟菲斯几何与粉青跳色的轻快视觉，适合活动、营销与创意内容

## 视觉行为

气质：俏皮、动感、乐观；视觉语汇：孟菲斯曲线、粉红与青绿跳色、大小不一的几何贴纸；装饰：squiggles, dots, arcs and offset geometric tokens；构图：varied grouping and scale; preserve an obvious reading path

## 禁忌

- 避免图案铺满内容区
- 强调色一次只突出一个判断
- 避免幼稚图标墙

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
