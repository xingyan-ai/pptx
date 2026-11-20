# 极简水墨

- id: `minimal-ink`
- density: `spacious`
- visual style: `ink-wash`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

黑白灰墨迹与深绿锚点的极简艺术风，适合研究、文化与作品展示

## 视觉行为

气质：极简、留白、艺术；视觉语汇：黑白灰墨迹、单一深绿锚点、微小几何标记；装饰：ink texture, hairline geometry and deliberate empty space；构图：one object or relationship per page; text remains crisp

## 禁忌

- 避免把水墨当背景贴图
- 保持单一主视觉
- 正文不使用浅灰低对比

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
