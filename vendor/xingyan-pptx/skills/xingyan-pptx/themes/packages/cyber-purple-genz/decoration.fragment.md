# 装饰系统 · 赛博紫青年

家族：`dark-tech`。颜色写的是 token 角色名，执行时按 `themes/tokens/cyber-purple-genz.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 1px #DAEFF0（重描边 3px，hairline 1px） |
| 硬投影 | 无 |
| 标签 | accent 填充 + 0px 描边，12px / 700，高 28 |
| 分隔线 | 2px #FF5DA2 |
| 标记块 | 6×6，0px 描边，accent2 填充 |
| 图表条 | 高 14，0px 描边，填充 accent / accent2 |
| 圆角 | 8px |
| 页面家具 | tag、rule、marker |

## 用法

1. 先建立全局背景和一个固定网格：页边距 64，列间距 28。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 页眉标签
```svg
<rect x="64" y="64" width="170" height="28" fill="#FF5DA2"/>
<text x="76" y="82" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="12" font-weight="700" fill="#000000">标签文字</text>
```

### 标题分隔线
```svg
<rect x="64" y="166" width="1152" height="2" fill="#FF5DA2"/>
```

### 要点标记块
```svg
<rect x="700" y="212" width="6" height="6" fill="#DAEFF0"/>
```

### 条形图
```svg
<rect x="150" y="230" width="440" height="14" fill="#FF5DA2"/>
<rect x="150" y="298" width="423" height="14" fill="#DAEFF0"/>
<text x="602" y="255" font-family=""Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif" font-size="14" fill="#DAEFF0">310</text>
```
> 条高 14px，填充在 accent / accent2 之间交替。

### 页脚信息带
```svg
<rect x="0" y="674" width="1280" height="46" fill="#FDFCFF"/>
<text x="64" y="703" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="12" fill="#23183A">来源 / 页码</text>
```
