# 组件系统 · 赛博紫青年

家族：`dark-tech`。组件层决定图表、表格、KPI、引用块长什么样；颜色写的是 token 角色名，执行时按 `themes/tokens/cyber-purple-genz.json` 解析。

| 组件 | 规则 |
| --- | --- |
| KPI 卡 | 填充 surface（#FDFCFF） / 描边 1px / 投影 soft / 圆角 12 |
| 表格 | 表头 accent（#FF5DA2） / 边框 1px / 行线 1px / 斑马纹 surface（#FDFCFF） / 内边距 12·9 |
| 条形图 | 条高 14 / 描边 0px / 轴 1px / 网格 3 条 |
| 折线图 | 线宽 2.5px / 点径 6px / 面积 开 |
| 引用块 | 填充 accent2（#DAEFF0） / 侧条 4px / 投影 soft / 圆角 12 |
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
<rect x="64" y="80" width="300" height="132" rx="12" fill="#FDFCFF" stroke="#DAEFF0" stroke-width="1"/>
<text x="88" y="152" font-family="&quot;Noto Sans SC&quot;, &quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, sans-serif" font-size="36" font-weight="700" fill="#6B4EFF">224</text>
<text x="88" y="182" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" fill="#756E85">品牌提及</text>
```
> 填充 surface，描边 1px，投影 soft，圆角 12。

### 表格
```svg
<rect x="80" y="80" width="900" height="40" rx="8" fill="#FF5DA2"/>
<rect x="80" y="200" width="900" height="40" fill="#FDFCFF"/>
<text x="96" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#000000">核心指标</text>
<text x="380" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#000000">Q2</text>
<text x="560" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#000000">Q3</text>
<text x="740" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#000000">环比</text>
<rect x="80" y="120" width="900" height="1" fill="#CBC8D4"/>
<text x="96" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#23183A">有效任务</text>
<text x="380" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">1,284</text>
<text x="560" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">1,736</text>
<text x="740" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">+35%</text>
<rect x="80" y="160" width="900" height="1" fill="#CBC8D4"/>
<text x="96" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#23183A">留存率</text>
<text x="380" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">41%</text>
<text x="560" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">52%</text>
<text x="740" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">+11pt</text>
<rect x="80" y="200" width="900" height="1" fill="#CBC8D4"/>
<text x="96" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#23183A">人均耗时</text>
<text x="380" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">26 min</text>
<text x="560" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">18 min</text>
<text x="740" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#756E85">−31%</text>
<rect x="80" y="240" width="900" height="1" fill="#CBC8D4"/>
<rect x="80" y="80" width="900" height="160" rx="8" fill="none" stroke="#DAEFF0" stroke-width="1"/>
<rect x="82" y="81" width="896" height="158" fill="none"/>
```
> 表头 accent + onAccent；边框 1px；行线 1px；斑马纹 surface；单元格内边距 12 / 9；圆角 8。

### 条形图
```svg
<rect x="405" y="72" width="1" height="200" fill="#CBC8D4" opacity="0.6"/>
<rect x="650" y="72" width="1" height="200" fill="#CBC8D4" opacity="0.6"/>
<rect x="895" y="72" width="1" height="200" fill="#CBC8D4" opacity="0.6"/>
<text x="80" y="92" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#23183A">叙事</text>
<rect x="160" y="80" width="440" height="14" rx="0" fill="#FF5DA2"/>
<text x="608" y="92" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#23183A">92</text>
<text x="80" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#23183A">证据</text>
<rect x="160" y="128" width="374" height="14" rx="0" fill="#DAEFF0"/>
<text x="542" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#23183A">78</text>
<text x="80" y="188" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#23183A">数据</text>
<rect x="160" y="176" width="306" height="14" rx="0" fill="#FF5DA2"/>
<text x="474" y="188" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#23183A">64</text>
<text x="80" y="236" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#23183A">节奏</text>
<rect x="160" y="224" width="240" height="14" rx="0" fill="#DAEFF0"/>
<text x="408" y="236" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#23183A">50</text>
<rect x="160" y="272" width="980" height="1" fill="#DAEFF0"/>
```
> 条高 14px，描边 0px；坐标轴 1px；网格线 3 条；数值 14px / 600。

### 折线图
```svg
<path d="M160 250 L330 220 L500 180 L670 190 L840 140 L1010 110 L1010 300 L160 300 Z" fill="#6B4EFF" opacity="0.18"/>
<path d="M160 250 L330 220 L500 180 L670 190 L840 140 L1010 110" fill="none" stroke="#6B4EFF" stroke-width="2.5"/>
<circle cx="160" cy="250" r="3" fill="#FBFAFF" stroke="#6B4EFF" stroke-width="2"/>
<circle cx="330" cy="220" r="3" fill="#FBFAFF" stroke="#6B4EFF" stroke-width="2"/>
<circle cx="500" cy="180" r="3" fill="#FBFAFF" stroke="#6B4EFF" stroke-width="2"/>
<circle cx="670" cy="190" r="3" fill="#FBFAFF" stroke="#6B4EFF" stroke-width="2"/>
<circle cx="840" cy="140" r="3" fill="#FBFAFF" stroke="#6B4EFF" stroke-width="2"/>
<circle cx="1010" cy="110" r="3" fill="#FBFAFF" stroke="#6B4EFF" stroke-width="2"/>
```
> 线宽 2.5px，点径 6px；面积填充 开（0.18）。

### 引用块 / 结论条
```svg
<rect x="86" y="86" width="420" height="120" rx="12" fill="#DAEFF0" stroke="#FF5DA2" stroke-width="1"/>
<rect x="86" y="86" width="4" height="120" fill="#FF5DA2"/>
<text x="110" y="140" font-family="&quot;Noto Sans SC&quot;, &quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, sans-serif" font-size="17" font-weight="700" fill="#000000">判断先行，证据在后</text>
<text x="110" y="170" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" fill="#000000">一页只留一个主导对象，装饰不替代表达。</text>
```
> 填充 accent2，描边 1px，侧条 4px，投影 soft，圆角 12。

### 要点列表
```svg
<rect x="80" y="87" width="6" height="6" fill="#DAEFF0"/>
<text x="104" y="96" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#23183A">判断先行，证据在后</text>
<rect x="80" y="131" width="6" height="6" fill="#DAEFF0"/>
<text x="104" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#23183A">一页只留一个主导对象</text>
<rect x="80" y="175" width="6" height="6" fill="#DAEFF0"/>
<text x="104" y="184" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#23183A">装饰不替代关系表达</text>
```
> 标记 square，6px，填充 accent2。
