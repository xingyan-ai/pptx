# 组件系统 · Brutalist Acid 酸性粗野主义

家族：`brutalist`。组件层决定图表、表格、KPI、引用块长什么样；颜色写的是 token 角色名，执行时按 `themes/tokens/brutalist-acid.json` 解析。

| 组件 | 规则 |
| --- | --- |
| KPI 卡 | 填充 surface（#F8F6F1） / 描边 3px / 投影 hard / 圆角 0 |
| 表格 | 表头 text（#090909） / 边框 3px / 行线 3px / 斑马纹 无 / 内边距 16·11 |
| 条形图 | 条高 22 / 描边 3px / 轴 2px / 网格 0 条 |
| 折线图 | 线宽 5px / 点径 8px / 面积 关 |
| 引用块 | 填充 accent（#D7FF00） / 侧条 0px / 投影 hard / 圆角 0 |
| 要点列表 | 标记 square 12px |

## 用法

1. 每一页至少一个组件（图表 / 表格 / KPI / 引用块 / 列表）必须按这张表画，不允许回到"通用卡片 + 细线"的默认样式。
2. 表格的边框、行线、斑马纹只能取表里的值；不要自创 1px 灰框。
3. 条形图的条高、描边、轴线和网格线取表里的值；数值标签用 `valueSize`。
4. 组件占位先于装饰：先把图表/表格画对，再加页眉标签和标题线。
5. `node scripts/check-theme-fidelity.mjs <project>` 会检查页面里的组件是否越界。

## SVG 片段

### KPI 卡
```svg
<rect x="80" y="96" width="300" height="132" rx="0" fill="#090909"/>
<rect x="64" y="80" width="300" height="132" rx="0" fill="#F8F6F1" stroke="#090909" stroke-width="3"/>
<text x="88" y="152" font-family="&quot;Arial Black&quot;, Arial, &quot;PingFang SC&quot;, sans-serif" font-size="38" font-weight="800" fill="#7A9004">224</text>
<text x="88" y="182" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" fill="#62615E">BRAND MENTIONS</text>
```
> 填充 surface，描边 3px，投影 hard，圆角 0。

### 表格
```svg
<rect x="80" y="80" width="900" height="40" rx="0" fill="#090909"/>
<text x="96" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#F4F1E8">核心指标</text>
<text x="380" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#F4F1E8">Q2</text>
<text x="560" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#F4F1E8">Q3</text>
<text x="740" y="106" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" font-weight="700" fill="#F4F1E8">环比</text>
<rect x="80" y="120" width="900" height="3" fill="#090909"/>
<text x="96" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#090909">有效任务</text>
<text x="380" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">1,284</text>
<text x="560" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">1,736</text>
<text x="740" y="146" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">+35%</text>
<rect x="80" y="160" width="900" height="3" fill="#090909"/>
<text x="96" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#090909">留存率</text>
<text x="380" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">41%</text>
<text x="560" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">52%</text>
<text x="740" y="186" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">+11pt</text>
<rect x="80" y="200" width="900" height="3" fill="#090909"/>
<text x="96" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#090909">人均耗时</text>
<text x="380" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">26 min</text>
<text x="560" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">18 min</text>
<text x="740" y="226" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="15" font-weight="400" fill="#62615E">−31%</text>
<rect x="80" y="240" width="900" height="3" fill="#090909"/>
<rect x="80" y="80" width="900" height="160" rx="0" fill="none" stroke="#090909" stroke-width="3"/>
<rect x="82" y="81" width="896" height="158" fill="none"/>
```
> 表头 text + background；边框 3px；行线 3px；斑马纹 无；单元格内边距 16 / 11；圆角 0。

### 条形图
```svg
<text x="80" y="96" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">叙事</text>
<rect x="160" y="80" width="440" height="22" rx="0" fill="#D7FF00" stroke="#090909" stroke-width="3"/>
<text x="608" y="96" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="800" fill="#090909">92</text>
<text x="80" y="144" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">证据</text>
<rect x="160" y="128" width="374" height="22" rx="0" fill="#D1F1E7" stroke="#090909" stroke-width="3"/>
<text x="542" y="144" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="800" fill="#090909">78</text>
<text x="80" y="192" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">数据</text>
<rect x="160" y="176" width="306" height="22" rx="0" fill="#D7FF00" stroke="#090909" stroke-width="3"/>
<text x="474" y="192" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="800" fill="#090909">64</text>
<text x="80" y="240" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">节奏</text>
<rect x="160" y="224" width="240" height="22" rx="0" fill="#D1F1E7" stroke="#090909" stroke-width="3"/>
<text x="408" y="240" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="16" font-weight="800" fill="#090909">50</text>
<rect x="160" y="272" width="980" height="2" fill="#090909"/>
```
> 条高 22px，描边 3px；坐标轴 2px；网格线 0 条；数值 16px / 800。

### 折线图
```svg
<path d="M160 250 L330 220 L500 180 L670 190 L840 140 L1010 110" fill="none" stroke="#7A9004" stroke-width="5"/>
<circle cx="160" cy="250" r="4" fill="#F4F1E8" stroke="#7A9004" stroke-width="2"/>
<circle cx="330" cy="220" r="4" fill="#F4F1E8" stroke="#7A9004" stroke-width="2"/>
<circle cx="500" cy="180" r="4" fill="#F4F1E8" stroke="#7A9004" stroke-width="2"/>
<circle cx="670" cy="190" r="4" fill="#F4F1E8" stroke="#7A9004" stroke-width="2"/>
<circle cx="840" cy="140" r="4" fill="#F4F1E8" stroke="#7A9004" stroke-width="2"/>
<circle cx="1010" cy="110" r="4" fill="#F4F1E8" stroke="#7A9004" stroke-width="2"/>
```
> 线宽 5px，点径 8px；面积填充 关。

### 引用块 / 结论条
```svg
<rect x="94" y="94" width="420" height="120" rx="0" fill="#090909"/>
<rect x="86" y="86" width="420" height="120" rx="0" fill="#D7FF00" stroke="#090909" stroke-width="3"/>
<text x="106" y="140" font-family="&quot;Arial Black&quot;, Arial, &quot;PingFang SC&quot;, sans-serif" font-size="17" font-weight="800" fill="#000000">判断先行，证据在后</text>
<text x="106" y="170" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="14" fill="#000000">一页只留一个主导对象，装饰不替代表达。</text>
```
> 填充 accent，描边 3px，侧条 0px，投影 hard，圆角 0。

### 要点列表
```svg
<rect x="80" y="84" width="12" height="12" fill="#D7FF00" stroke="#090909" stroke-width="2"/>
<text x="110" y="96" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">判断先行，证据在后</text>
<rect x="80" y="128" width="12" height="12" fill="#D7FF00" stroke="#090909" stroke-width="2"/>
<text x="110" y="140" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">一页只留一个主导对象</text>
<rect x="80" y="172" width="12" height="12" fill="#D7FF00" stroke="#090909" stroke-width="2"/>
<text x="110" y="184" font-family="&quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, &quot;Noto Sans SC&quot;, sans-serif" font-size="18" fill="#090909">装饰不替代关系表达</text>
```
> 标记 square，12px，填充 accent。
