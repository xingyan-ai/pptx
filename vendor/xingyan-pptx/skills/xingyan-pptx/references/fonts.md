# 字体

## 1. 问题

主题里写了字体，但 HTML 打开后没生效——因为 `font-family` 只是"请求"，浏览器只会用用户机器上装了的字体。`Inter`、`Noto Sans SC`、`微软雅黑`、`DengXian` 都不是 macOS 自带的，所以 21 套里有 20 套的标题会悄悄回落成 PingFang 或 Arial，版面比例跟着变。

既然交付物是 HTML，就不能指望用户装字体。HTML 可以自带字体，PPTX 不行。

## 2. 三类字体

`themes/fonts.map.json` 是唯一事实源。

| render | 做法 | 体积 | 当前 |
|---|---|---|---|
| `embed` | 随包的 woff2（latin 子集）在导出时以 base64 data URI 写进 HTML | 每个字重约 8–25 KB | Inter（400/600/700）、Poppins（400/600/700） |
| `substitute` | 厂商字体不能分发，换成可内嵌的 OFL 近似体，原字体名仍留在栈里做兜底 | 同上 | Arial Black → Archivo Black；Calibri → Carlito；Arial Narrow → Roboto Condensed |
| `system` | 不内嵌，依赖系统字体，按栈顺序回落 | 0 | Arial、Helvetica Neue、Georgia、PingFang SC、微软雅黑、Songti SC、SimSun、DengXian、Noto Sans SC / Noto Serif SC |

字体文件在 `assets/fonts/`，全部 OFL-1.1，许可证原文在 `assets/fonts/OFL-NOTICE.md`。

## 3. 为什么不内嵌中文

- 一套 CJK 字体一个常用子集就 3–10 MB，整包体积会翻几倍
- 中文的视觉差异主要来自衬线/无衬线，而不是厂商：PingFang SC、微软雅黑、Noto Sans SC 三者互相替换不会破坏版面
- 主题栈里本来就写了 CJK 回落链：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`

如果确实要做"中文也必须一模一样"，只有两条路：整包带 CJK 子集（体积换一致性），或者导出 PDF 图片化（牺牲可编辑）。

## 4. HTML 导出

```bash
node scripts/svg-deck-to-html.mjs <project> --theme themes/tokens/<id>.json
```

默认行为：

1. 扫描 HTML 里所有 `font-family` 声明、`--theme-font-*` 变量和 SVG 的 `font-family` 属性
2. 命中 `embed` / `substitute` 的家族生成 `@font-face`，woff2 转 base64
3. 替换字体栈：`Arial Black, Arial` → `"Archivo Black", Arial Black, Arial`
4. 把 `@font-face` 块插到 `<head>`

关掉：`--no-embed-fonts`。典型内嵌量：只用到 Inter 的稿子 +95 KB（三个字重），酸性那类 +13 KB（只有一个 Archivo Black）。

## 5. PPTX 的边界

PowerPoint for macOS 不认内嵌字体（Windows 版可以，但字体授权通常不允许），所以 PPTX 侧不承诺字形：

- 一律用 token 里的 `title_stack_ppt` / `body_stack_ppt`
- Inter / Poppins 在 PPT 里落到 Arial；中文落到 PingFang / 微软雅黑 / 宋体
- 想要 PPTX 与 HTML 完全一致，只能把标题转成图形，代价是不能再编辑

## 6. 检查

```bash
node scripts/check-fonts.mjs --theme brutalist-acid
node scripts/check-fonts.mjs --all --json
```

输出每个角色的结论：内嵌 / 替代 / 系统，以及 `fallbackRisk`——栈首是厂商字体又没替代的主题，换台机器就会变样。
