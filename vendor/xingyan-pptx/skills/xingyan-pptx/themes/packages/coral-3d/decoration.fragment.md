# 装饰系统 · 珊瑚三维

家族：`soft-rounded`。颜色写的是 token 角色名，执行时按 `themes/tokens/coral-3d.json` 解析成 hex。

| 项 | 规则 |
| --- | --- |
| 描边 | 无描边（hairline 1px #D4D4D4） |
| 硬投影 | 0px / 6px #3B3B3B，透明度 0.12 |
| 标签 | accent2 填充 + 0px 描边，13px / 700，高 30 |
| 分隔线 | 无 |
| 标记块 | 8×8，0px 描边，accent 填充 |
| 图表条 | 高 14，0px 描边，填充 accent / accent2 |
| 圆角 | 20px |
| 页面家具 | tag、softShadow、marker |

## 用法

1. 先建立全局背景和一个固定网格：页边距 72，列间距 32。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

### 页眉标签
```svg
<rect x="64" y="64" width="170" height="30" fill="#3B3B3B"/>
<text x="78" y="84" font-family=""PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif" font-size="13" font-weight="700" fill="#000000">标签文字</text>
```

### 要点标记块
```svg
<rect x="700" y="212" width="8" height="8" fill="#FAD0C4"/>
```

### 硬投影卡片
```svg
<rect x="940" y="126" width="252" height="312" fill="#3B3B3B" fill-opacity="0.12"/>
<rect x="940" y="120" width="252" height="312" fill="#3B3B3B"/>
```
> 投影块先画，卡片后画；偏移量固定，不做模糊。

### 条形图
```svg
<rect x="150" y="230" width="440" height="14" fill="#FAD0C4"/>
<rect x="150" y="298" width="423" height="14" fill="#3B3B3B"/>
<text x="602" y="255" font-family="Calibri, Arial, "PingFang SC", sans-serif" font-size="14" fill="#D4D4D4">310</text>
```
> 条高 14px，填充在 accent / accent2 之间交替。
