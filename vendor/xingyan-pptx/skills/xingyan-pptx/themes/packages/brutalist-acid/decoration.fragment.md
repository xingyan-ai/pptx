# 装饰系统 · Brutalist Acid 酸性粗野主义

家族：`brutalist`。颜色写的是 token 角色名，执行时按 `themes/tokens/brutalist-acid.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 3px #090909（重描边 6px，hairline 1px） |
| 硬投影 | 8px / 8px #090909，透明度 1 |
| 标签 | accent 填充 + 3px 描边，14px / 800，高 32 |
| 分隔线 | 4px #090909 |
| 标记块 | 12×12，2px 描边，accent 填充 |
| 图表条 | 高 22，3px 描边，填充 accent / surfaceAlt |
| 圆角 | 0px |
| 页面家具 | tag、rule、marker、hardShadow、offsetBlock |

## 用法

1. 先建立全局背景和一个固定网格：页边距 64，列间距 28。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 页眉标签
```svg
<rect x="64" y="64" width="170" height="32" fill="#D7FF00" stroke="#090909" stroke-width="3"/>
<text x="80" y="85" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="14" font-weight="800" fill="#000000">标签文字</text>
```

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="4" fill="#090909"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="12" height="12" fill="#D7FF00" stroke="#090909" stroke-width="2"/>
```

### 硬投影卡片
```svg
<rect x="948" y="128" width="252" height="312" fill="#090909"/>
<rect x="940" y="120" width="252" height="312" fill="#D7FF00" stroke="#090909" stroke-width="3"/>
```
> 投影块先画，卡片后画；偏移量固定，不做模糊。

### 条形图
```svg
<rect x="150" y="230" width="440" height="22" fill="#D7FF00" stroke="#090909" stroke-width="3"/>
<rect x="150" y="298" width="423" height="22" fill="#D1F1E7" stroke="#090909" stroke-width="3"/>
<text x="602" y="259" font-family=""Arial Black", Arial, "PingFang SC", sans-serif" font-size="16" fill="#090909">310</text>
```
> 条高 22px，填充在 accent / surfaceAlt 之间交替。
