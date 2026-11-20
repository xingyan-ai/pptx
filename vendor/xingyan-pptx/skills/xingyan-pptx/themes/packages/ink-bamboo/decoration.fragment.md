# 装饰系统 · Ink Bamboo 青绿水墨竹韵

家族：`ink-wash`。颜色写的是 token 角色名，执行时按 `themes/tokens/ink-bamboo.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 无描边（hairline 1px #18352D） |
| 硬投影 | 无 |
| 标签 | 无（用普通 kicker 文字） |
| 分隔线 | 1px #18352D |
| 标记块 | 4×4，0px 描边，text 填充 |
| 图表条 | 高 10，0px 描边，填充 text / textMuted |
| 圆角 | 0px |
| 页面家具 | rule、marker |

## 用法

1. 先建立全局背景和一个固定网格：页边距 72，列间距 32。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="1" fill="#18352D"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="4" height="4" fill="#18352D"/>
```

### 条形图
```svg
<rect x="150" y="230" width="440" height="10" fill="#18352D"/>
<rect x="150" y="298" width="423" height="10" fill="#697C74"/>
<text x="602" y="253" font-family=""Songti SC", "Noto Serif SC", "SimSun", serif" font-size="13" fill="#18352D">310</text>
```
> 条高 10px，填充在 text / textMuted 之间交替。
