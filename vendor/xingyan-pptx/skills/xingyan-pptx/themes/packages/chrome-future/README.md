# Chrome Future 银铬未来

- id: `chrome-future`
- density: `standard`
- visual style: `glassmorphism`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

银铬冷白与电蓝信号的未来感科技风，适合产品与技术发布

## 视觉行为

气质：冷峻、前卫、科技；视觉语汇：金属渐变暗示、电蓝信号、留白中的细框；装饰：chrome edge, hairline frame and small neon dot；构图：airy split between claim and proof, no glossy overload

## 禁忌

- 避免把所有东西做成金属
- 渐变不用于长文本底
- 不使用赛博噪声覆盖信息

## PPT 降级策略

金属反射改为线性渐变，避免复杂 filter

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
