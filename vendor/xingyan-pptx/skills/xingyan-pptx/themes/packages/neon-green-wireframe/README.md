# 荧光绿线框

- id: `neon-green-wireframe`
- density: `spacious`
- visual style: `blueprint`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

荧光绿线框与黑底叠层的轻量实验风，适合作品集与创意演示

## 视觉行为

气质：清新、实验、轻量；视觉语汇：荧光绿线框、黑底倾斜卡片、极细连接线；装饰：fine perspective lines, angled frame and one bright block；构图：network/sequence grouping preferred over repeated cards

## 禁忌

- 避免线框成为噪声
- 荧光绿不用于大段正文
- 不使用无意义透视

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
