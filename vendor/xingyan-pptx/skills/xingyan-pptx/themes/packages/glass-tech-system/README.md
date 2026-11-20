# Glass Tech System 玻璃科技

- id: `glass-tech-system`
- density: `standard`
- visual style: `glassmorphism`
- PPT fidelity: `approximate`
- audited: `True`

## 主题描述

glass visual system

## 视觉行为

气质：透明、冷静、系统化；视觉语汇：玻璃半透明面、细边框与模糊层、高亮蓝黄点；装饰：glass panels, blur edge and sparse luminous accents；构图：layering supports hierarchy; keep text surfaces opaque enough

## 禁忌

- 避免透明导致对比不足
- 不在每层叠加阴影
- 不可用玻璃替代层级

## PPT 降级策略

玻璃模糊改为半透明填充 + 细边框，不使用 backdrop-filter

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
