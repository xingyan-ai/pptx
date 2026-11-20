# 装饰系统 · 田园政企绿色

家族：`editorial`。颜色写的是 token 角色名，执行时按 `themes/tokens/rural-green.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 无描边（hairline 1px #C6D1CA） |
| 硬投影 | 无 |
| 标签 | 无（用普通 kicker 文字） |
| 分隔线 | 1px #C6D1CA |
| 标记块 | 6×6，0px 描边，accent 填充 |
| 图表条 | 高 12，0px 描边，填充 accent / textMuted |
| 圆角 | 0px |
| 页面家具 | rule、marker |

## 用法

1. 先建立全局背景和一个固定网格：页边距 64，列间距 28。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="1" fill="#C6D1CA"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="6" height="6" fill="#DE0000"/>
```

### 条形图
```svg
<rect x="150" y="230" width="440" height="12" fill="#DE0000"/>
<rect x="150" y="298" width="423" height="12" fill="#6C8678"/>
<text x="602" y="254" font-family=""Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif" font-size="14" fill="#C6D1CA">310</text>
```
> 条高 12px，填充在 accent / textMuted 之间交替。
