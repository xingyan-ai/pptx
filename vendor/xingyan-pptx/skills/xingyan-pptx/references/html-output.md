# HTML 输出

## 1. 输入

优先读 `<project>/svg_final/*.svg`；没有时回退到 `<project>/svg_output/*.svg`。

`svg_final` 必须已经内嵌图标和图片，否则导出的单文件 HTML 会引用外部资源并失败。

客户端不运行 Python。优先使用已经自包含的 `svg_output`；需要 `svg_final` 时由后端或执行内核的导出链路生成，客户端只负责打包和外部引用检查。

## 2. 输出

```text
<project>/exports/<name>_<timestamp>.html
```

单文件，无 CDN、无外部 CSS/JS、无外链图片。页面里的 SVG 直接内联，文字仍然可选、可搜索。

`<html lang>` 从 `outline.json` 的 `primaryLanguage` 读取并归一化为 BCP-47；没有时回退到 `design_spec.md` 的 `Language` 行，最后回退到 `zh-CN`。这样英文 deck 的读音、断词和辅助技术不会继续按中文处理。

## 3. 行为

| 操作 | 行为 |
|---|---|
| `→` / `PageDown` / 空格 | 下一页 |
| `←` / `PageUp` | 上一页 |
| `Home` / `End` | 首页 / 末页 |
| `O` | 总览网格 |
| `N` | 演讲备注面板（如果有 `notes/`） |
| `P` | 打印 |
| 点击左右半屏 | 上一页 / 下一页 |
| `#page=N` | 直接打开第 N 页 |
| `Esc` | 关闭总览/备注 |

## 4. 主题

主题是可选参数。不传时 HTML 使用暗色导航壳，幻灯片本身的颜色、字体、间距全部来自 SVG，不做二次设计。

传 `--theme themes/tokens/<id>.json` 只影响：

- 页面底色与导航/HUD 的辅助变量
- 字体栈变量

幻灯片内部不会因为 HTML 侧主题重新排版。主题要改变页面，必须先在写页面之前通过 `apply-theme.mjs` 写进 `design_spec.md` / `spec_lock.md`。

## 5. 打印

`@media print` 会隐藏导航，每页强制分页，适合导出 PDF：

```bash
chrome --headless --print-to-pdf=deck.pdf deck.html
```

## 6. 校验

导出前会检查 SVG 中是否存在外部 `href` / `xlink:href`。只允许 `data:` 和 `#`。发现外部引用直接失败，不生成半成品。

## 7. 字体

HTML 使用 `title_stack` / `body_stack`（Web 栈），可以使用 Inter / Poppins。不要把 Apple / Microsoft 字体文件打进 HTML 或客户端；需要一致时打包 OFL 字体并附许可证。
