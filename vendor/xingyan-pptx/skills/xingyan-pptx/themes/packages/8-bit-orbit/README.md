# 8-Bit Orbit 像素轨道

- id: `8-bit-orbit`
- density: `standard`
- visual style: `pixel-art`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

任务地图、关卡门、Boss 判断、道具栏、技能树与像素场景

## 视觉行为

气质：游戏化、冒险、进取；视觉语汇：像素颗粒、任务地图节点、黄紫道具栏；装饰：nodes, gates, item bars and small pixel stars；构图：sequence and decision path over decorative game UI

## 禁忌

- 避免把严肃结论游戏化
- 像素字体只用于短标签
- 不堆叠无意义道具

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
