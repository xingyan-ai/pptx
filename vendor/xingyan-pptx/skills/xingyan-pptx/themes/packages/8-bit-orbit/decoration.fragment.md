# 装饰系统 · 8-Bit Orbit 像素轨道

家族：`pixel-art`。颜色写的是 token 角色名，执行时按 `themes/tokens/8-bit-orbit.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 2px #FFFFFF（重描边 4px，hairline 1px） |
| 硬投影 | 4px / 4px #FFFFFF，透明度 1 |
| 标签 | accent 填充 + 2px 描边，13px / 700，高 30 |
| 分隔线 | 4px #FFFFFF |
| 标记块 | 8×8，2px 描边，accent2 填充 |
| 图表条 | 高 16，2px 描边，填充 accent / accent2 |
| 圆角 | 0px |
| 页面家具 | tag、rule、marker、hardShadow |

## 用法

1. 先建立全局背景和一个固定网格：页边距 64，列间距 28。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 页眉标签
```svg
<rect x="64" y="64" width="170" height="30" fill="#FFCC31" stroke="#FFFFFF" stroke-width="2"/>
<text x="76" y="84" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="13" font-weight="700" fill="#000000">标签文字</text>
```

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="4" fill="#FFFFFF"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="8" height="8" fill="#5B39FF" stroke="#FFFFFF" stroke-width="2"/>
```

### 硬投影卡片
```svg
<rect x="944" y="124" width="252" height="312" fill="#FFFFFF"/>
<rect x="940" y="120" width="252" height="312" fill="#FFCC31" stroke="#FFFFFF" stroke-width="2"/>
```
> 投影块先画，卡片后画；偏移量固定，不做模糊。

### 条形图
```svg
<rect x="150" y="230" width="440" height="16" fill="#FFCC31" stroke="#FFFFFF" stroke-width="2"/>
<rect x="150" y="298" width="423" height="16" fill="#5B39FF" stroke="#FFFFFF" stroke-width="2"/>
<text x="602" y="256" font-family="Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="14" fill="#FFFFFF">310</text>
```
> 条高 16px，填充在 accent / accent2 之间交替。
