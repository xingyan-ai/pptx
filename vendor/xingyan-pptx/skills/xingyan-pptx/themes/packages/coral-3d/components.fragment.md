# 组件系统 · 珊瑚三维

家族：`soft-rounded`。组件层决定图表、表格、KPI、引用块长什么样；颜色写的是 token 角色名，执行时按 `themes/tokens/coral-3d.json` 解析。

| 组件 | 规则 |
| --- | --- |
| KPI 卡 | 填充 surface（#FFFFFF） / 描边 0px / 投影 soft / 圆角 16 |
| 表格 | 表头 surfaceAlt（#DCDCDC） / 边框 0px / 行线 1px / 斑马纹 无 / 内边距 14·10 |
| 条形图 | 条高 14 / 描边 0px / 轴 1px / 网格 0 条 |
| 折线图 | 线宽 3px / 点径 6px / 面积 开 |
| 引用块 | 填充 accent（#FAD0C4） / 侧条 0px / 投影 soft / 圆角 16 |
| 要点列表 | 标记 circle 8px |

## 用法

1. 每一页至少一个组件（图表 / 表格 / KPI / 引用块 / 列表）必须按这张表画，不允许回到"通用卡片 + 细线"的默认样式。
2. 表格的边框、行线、斑马纹只能取表里的值；不要自创 1px 灰框。
3. 条形图的条高、描边、轴线和网格线取表里的值；数值标签用 `valueSize`。
4. 组件占位先于装饰：先把图表/表格画对，再加页眉标签和标题线。
5. `node scripts/check-theme-fidelity.mjs <project>` 会检查页面里的组件是否越界。

## SVG 片段

### KPI 卡
```svg
<rect x="64" y="80" width="300" height="132" rx="16" fill="#FFFFFF"/>
<text x="88" y="152" font-family="Calibri, Arial, &quot;PingFang SC&quot;, sans-serif" font-size="37" font-weight="700" fill="#A48D86">224</text>
<text x="88" y="182" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" fill="#858585">品牌提及</text>
```
> 填充 surface，描边 0px，投影 soft，圆角 16。

### 表格
```svg
<rect x="80" y="80" width="900" height="40" rx="14" fill="#DCDCDC"/>
<text x="96" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="700" fill="#3B3B3B">核心指标</text>
<text x="380" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="700" fill="#3B3B3B">Q2</text>
<text x="560" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="700" fill="#3B3B3B">Q3</text>
<text x="740" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="700" fill="#3B3B3B">环比</text>
<rect x="80" y="120" width="900" height="1" fill="#D4D4D4"/>
<text x="96" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#3B3B3B">有效任务</text>
<text x="380" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">1,284</text>
<text x="560" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">1,736</text>
<text x="740" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">+35%</text>
<rect x="80" y="160" width="900" height="1" fill="#D4D4D4"/>
<text x="96" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#3B3B3B">留存率</text>
<text x="380" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">41%</text>
<text x="560" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">52%</text>
<text x="740" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">+11pt</text>
<rect x="80" y="200" width="900" height="1" fill="#D4D4D4"/>
<text x="96" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#3B3B3B">人均耗时</text>
<text x="380" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">26 min</text>
<text x="560" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">18 min</text>
<text x="740" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="400" fill="#858585">−31%</text>
<rect x="80" y="240" width="900" height="1" fill="#D4D4D4"/>
```
> 表头 surfaceAlt + text；边框 0px；行线 1px；斑马纹 无；单元格内边距 14 / 10；圆角 14。

### 条形图
```svg
<text x="80" y="92" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#3B3B3B">叙事</text>
<rect x="160" y="80" width="440" height="14" rx="0" fill="#FAD0C4"/>
<text x="608" y="92" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#3B3B3B">92</text>
<text x="80" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#3B3B3B">证据</text>
<rect x="160" y="128" width="374" height="14" rx="0" fill="#DCDCDC"/>
<text x="542" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#3B3B3B">78</text>
<text x="80" y="188" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#3B3B3B">数据</text>
<rect x="160" y="176" width="306" height="14" rx="0" fill="#FAD0C4"/>
<text x="474" y="188" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#3B3B3B">64</text>
<text x="80" y="236" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="17" fill="#3B3B3B">节奏</text>
<rect x="160" y="224" width="240" height="14" rx="0" fill="#DCDCDC"/>
<text x="408" y="236" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="600" fill="#3B3B3B">50</text>
<rect x="160" y="272" width="980" height="1" fill="#D4D4D4"/>
```
> 条高 14px，描边 0px；坐标轴 1px；网格线 0 条；数值 14px / 600。

### 折线图
```svg
<path d="M160 250 L330 220 L500 180 L670 190 L840 140 L1010 110 L1010 300 L160 300 Z" fill="#A48D86" opacity="0.14"/>
<path d="M160 250 L330 220 L500 180 L670 190 L840 140 L1010 110" fill="none" stroke="#A48D86" stroke-width="3"/>
<circle cx="160" cy="250" r="3" fill="#FFFFFF" stroke="#A48D86" stroke-width="2"/>
<circle cx="330" cy="220" r="3" fill="#FFFFFF" stroke="#A48D86" stroke-width="2"/>
<circle cx="500" cy="180" r="3" fill="#FFFFFF" stroke="#A48D86" stroke-width="2"/>
<circle cx="670" cy="190" r="3" fill="#FFFFFF" stroke="#A48D86" stroke-width="2"/>
<circle cx="840" cy="140" r="3" fill="#FFFFFF" stroke="#A48D86" stroke-width="2"/>
<circle cx="1010" cy="110" r="3" fill="#FFFFFF" stroke="#A48D86" stroke-width="2"/>
```
> 线宽 3px，点径 6px；面积填充 开（0.14）。

### 引用块 / 结论条
```svg
<rect x="86" y="86" width="420" height="120" rx="16" fill="#FAD0C4"/>
<text x="106" y="140" font-family="Calibri, Arial, &quot;PingFang SC&quot;, sans-serif" font-size="18" font-weight="700" fill="#000000">判断先行，证据在后</text>
<text x="106" y="170" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" fill="#000000">一页只留一个主导对象，装饰不替代表达。</text>
```
> 填充 accent，描边 0px，侧条 0px，投影 soft，圆角 16。

### 要点列表
```svg
<circle cx="85" cy="90" r="4" fill="#FAD0C4"/>
<text x="106" y="96" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="19" fill="#3B3B3B">判断先行，证据在后</text>
<circle cx="85" cy="134" r="4" fill="#FAD0C4"/>
<text x="106" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="19" fill="#3B3B3B">一页只留一个主导对象</text>
<circle cx="85" cy="178" r="4" fill="#FAD0C4"/>
<text x="106" y="184" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="19" fill="#3B3B3B">装饰不替代关系表达</text>
```
> 标记 circle，8px，填充 accent。
