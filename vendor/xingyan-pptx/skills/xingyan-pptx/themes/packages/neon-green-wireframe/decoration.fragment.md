# 装饰系统 · 荧光绿线框

家族：`blueprint`。颜色写的是 token 角色名，执行时按 `themes/tokens/neon-green-wireframe.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 1px #7A5CFF（重描边 2px，hairline 1px） |
| 硬投影 | 无 |
| 标签 | accent2 填充 + 0px 描边，12px / 600，高 26 |
| 分隔线 | 1px #7A5CFF |
| 标记块 | 6×6，0px 描边，accent 填充 |
| 图表条 | 高 10，1px 描边，填充 accent / accent2 |
| 圆角 | 0px |
| 页面家具 | tag、rule、marker |

## 用法

1. 先建立全局背景和一个固定网格：页边距 72，列间距 32。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 页眉标签
```svg
<rect x="64" y="64" width="170" height="26" fill="#7A5CFF"/>
<text x="74" y="81" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="12" font-weight="600" fill="#F8F9FB">标签文字</text>
```

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="1" fill="#7A5CFF"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="6" height="6" fill="#02BF31"/>
```

### 条形图
```svg
<rect x="150" y="230" width="440" height="10" fill="#02BF31" stroke="#7A5CFF" stroke-width="1"/>
<rect x="150" y="298" width="423" height="10" fill="#7A5CFF" stroke="#7A5CFF" stroke-width="1"/>
<text x="602" y="253" font-family=""Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif" font-size="13" fill="#7A5CFF">310</text>
```
> 条高 10px，填充在 accent / accent2 之间交替。
