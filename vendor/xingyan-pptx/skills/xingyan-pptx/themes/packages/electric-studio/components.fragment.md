# 组件系统 · Electric Studio 电气工作室

家族：`swiss-minimal`。组件层决定图表、表格、KPI、引用块长什么样；颜色写的是 token 角色名，执行时按 `themes/tokens/electric-studio.json` 解析。

| 组件 | 规则 |
| --- | --- |
| KPI 卡 | 填充 无 / 描边 0px / 投影 none / 圆角 0 |
| 表格 | 表头 无 / 边框 0px / 行线 1px / 斑马纹 无 / 内边距 12·10 |
| 条形图 | 条高 13 / 描边 0px / 轴 1px / 网格 0 条 |
| 折线图 | 线宽 2px / 点径 0px / 面积 关 |
| 引用块 | 填充 无 / 侧条 4px / 投影 none / 圆角 0 |
| 要点列表 | 标记 square 6px |

## 用法

1. 每一页至少一个组件（图表 / 表格 / KPI / 引用块 / 列表）必须按这张表画，不允许回到"通用卡片 + 细线"的默认样式。
2. 表格的边框、行线、斑马纹只能取表里的值；不要自创 1px 灰框。
3. 条形图的条高、描边、轴线和网格线取表里的值；数值标签用 `valueSize`。
4. 组件占位先于装饰：先把图表/表格画对，再加页眉标签和标题线。
5. `node scripts/check-theme-fidelity.mjs <project>` 会检查页面里的组件是否越界。

## SVG 片段

### KPI 卡
```svg
<rect x="64" y="80" width="300" height="132" rx="0" fill="#F4F1E8"/>
<text x="88" y="152" font-family="Inter, &quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="36" font-weight="700" fill="#93493A">224</text>
<text x="88" y="182" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" fill="#676664">品牌提及</text>
```
> 填充 无，描边 0px，投影 none，圆角 0。

### 表格
```svg
<text x="96" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#101113">核心指标</text>
<text x="380" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#676664">Q2</text>
<text x="560" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#676664">Q3</text>
<text x="740" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#676664">环比</text>
<rect x="80" y="120" width="900" height="1" fill="#101113"/>
<text x="96" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#101113">有效任务</text>
<text x="380" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">1,284</text>
<text x="560" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">1,736</text>
<text x="740" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">+35%</text>
<rect x="80" y="160" width="900" height="1" fill="#C2C0B9"/>
<text x="96" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#101113">留存率</text>
<text x="380" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">41%</text>
<text x="560" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">52%</text>
<text x="740" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">+11pt</text>
<rect x="80" y="200" width="900" height="1" fill="#C2C0B9"/>
<text x="96" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#101113">人均耗时</text>
<text x="380" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">26 min</text>
<text x="560" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">18 min</text>
<text x="740" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#676664">−31%</text>
<rect x="80" y="240" width="900" height="1" fill="#C2C0B9"/>
```
> 表头 不铺底 + text；边框 0px；行线 1px；斑马纹 无；单元格内边距 12 / 10；圆角 0。

### 条形图
```svg
<text x="80" y="92" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#101113">叙事</text>
<rect x="160" y="80" width="440" height="13" rx="0" fill="#93493A"/>
<text x="608" y="92" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="500" fill="#101113">92</text>
<text x="80" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#101113">证据</text>
<rect x="160" y="128" width="374" height="13" rx="0" fill="#93493A"/>
<text x="542" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="500" fill="#101113">78</text>
<text x="80" y="188" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#101113">数据</text>
<rect x="160" y="176" width="306" height="13" rx="0" fill="#93493A"/>
<text x="474" y="188" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="500" fill="#101113">64</text>
<text x="80" y="236" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#101113">节奏</text>
<rect x="160" y="224" width="240" height="13" rx="0" fill="#93493A"/>
<text x="408" y="236" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="500" fill="#101113">50</text>
<rect x="160" y="272" width="980" height="1" fill="#C2C0B9"/>
```
> 条高 13px，描边 0px；坐标轴 1px；网格线 0 条；数值 14px / 500。

### 折线图
```svg
<path d="M160 250 L330 220 L500 180 L670 190 L840 140 L1010 110" fill="none" stroke="#93493A" stroke-width="2"/>
```
> 线宽 2px，点径 0px；面积填充 关。

### 引用块 / 结论条
```svg
<rect x="86" y="86" width="420" height="120" rx="0" fill="none"/>
<rect x="86" y="86" width="4" height="120" fill="#93493A"/>
<text x="110" y="140" font-family="Inter, &quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" font-weight="700" fill="#101113">判断先行，证据在后</text>
<text x="110" y="170" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" fill="#676664">一页只留一个主导对象，装饰不替代表达。</text>
```
> 填充 无，描边 0px，侧条 4px，投影 none，圆角 0。

### 要点列表
```svg
<rect x="80" y="87" width="6" height="6" fill="#93493A"/>
<text x="104" y="96" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#101113">判断先行，证据在后</text>
<rect x="80" y="131" width="6" height="6" fill="#93493A"/>
<text x="104" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#101113">一页只留一个主导对象</text>
<rect x="80" y="175" width="6" height="6" fill="#93493A"/>
<text x="104" y="184" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#101113">装饰不替代关系表达</text>
```
> 标记 square，6px，填充 primary。
