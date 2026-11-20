# Neon 3D 霓虹立体

- id: `neon-3d`
- density: `standard`
- visual style: `dark-tech`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

透视舞台、悬浮物件、信号轨、错位平台与电影式大图

## 视觉行为

气质：沉浸、未来、戏剧化；视觉语汇：透视舞台、青粉霓虹边、悬浮物与景深；装饰：perspective grid, glow rim and floating object；构图：image/object dominant; text stays in a clean safe field

## 禁忌

- 避免每页都用3D物件
- 霓虹字须有对比底
- 不要遮挡主体图片

## PPT 降级策略

霓虹发光改为静态渐变与描边，不使用混合模式

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
