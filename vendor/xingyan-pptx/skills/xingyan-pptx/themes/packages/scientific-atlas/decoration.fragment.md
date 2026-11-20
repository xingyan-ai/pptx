# 装饰系统 · Scientific Atlas 科学图谱

家族：`data-journalism`。颜色写的是 token 角色名，执行时按 `themes/tokens/scientific-atlas.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 1px #C3C9C8（重描边 2px，hairline 1px） |
| 硬投影 | 无 |
| 标签 | primary 填充 + 0px 描边，13px / 700，高 28 |
| 分隔线 | 2px #172A31 |
| 标记块 | 8×8，0px 描边，accent 填充 |
| 图表条 | 高 14，0px 描边，填充 primary / accent2 |
| 圆角 | 0px |
| 页面家具 | tag、rule、marker |

## 用法

1. 先建立全局背景和一个固定网格：页边距 56，列间距 24。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 页眉标签
```svg
<rect x="64" y="64" width="170" height="28" fill="#166D59"/>
<text x="76" y="83" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">标签文字</text>
```

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="2" fill="#172A31"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="8" height="8" fill="#15A47A"/>
```

### 条形图
```svg
<rect x="150" y="230" width="440" height="14" fill="#166D59"/>
<rect x="150" y="298" width="423" height="14" fill="#4978D1"/>
<text x="602" y="255" font-family="Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="14" fill="#C3C9C8">310</text>
```
> 条高 14px，填充在 primary / accent2 之间交替。
