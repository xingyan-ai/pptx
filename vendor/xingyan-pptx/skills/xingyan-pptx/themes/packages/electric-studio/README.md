# Electric Studio 电气工作室

- id: `electric-studio`
- density: `standard`
- visual style: `swiss-minimal`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

暖底与电气青强调的实验型视觉，适合创意提案与概念发布

## 视觉行为

气质：实验、明快、创意；视觉语汇：电气青强调线、海报式标题、暖底与冷色碰撞；装饰：electric lines, registration marks and poster cutouts；构图：diagonal/offset grouping is welcome when hierarchy stays clear

## 禁忌

- 避免双色平均分配
- 不让背景抢主判断
- 保持投影可读性

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
