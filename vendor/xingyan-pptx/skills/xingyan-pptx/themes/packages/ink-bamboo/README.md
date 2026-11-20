# Ink Bamboo 青绿水墨竹韵

- id: `ink-bamboo`
- density: `spacious`
- visual style: `ink-wash`
- PPT fidelity: `native`
- audited: `True`

## 主题描述

全幅水墨竹画、宣纸画板、朱砂印章与宋体层级

## 视觉行为

气质：克制、东方、沉静；视觉语汇：宣纸留白、青绿墨色与朱砂印记、书卷式细线；装饰：ink wash, fine rules and sparse vermilion mark；构图：single focus with generous negative space

## 禁忌

- 避免满页水墨装饰
- 朱砂只作提示
- 不牺牲正文可读性

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
