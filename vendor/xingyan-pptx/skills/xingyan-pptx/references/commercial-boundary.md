# 商用边界

## 1. 方案 A：客户端不做 PDF / EPUB

> 1.0.22 补充：`extract-source` 的商业默认是 **pypdf（BSD-3）**；可选 **pdfplumber（MIT）**。
> 引擎的 `pdf_to_md.py` 本身是 MIT，但依赖 **PyMuPDF（AGPL-3.0）**，只能在后端/自托管
> 显式 `--allow-agpl` 时启用。分发给客户的客户端不得默认或静默使用 PyMuPDF。

帝王蟹客户端里的这个 skill 只接受：

- Markdown
- HTML
- DOCX
- PPTX
- XLSX / CSV

遇到 `.pdf` / `.epub` 时：

> 当前客户端版本不内置 PDF/EPUB 转换。请先转成 Markdown/HTML，或使用云端完整转换服务。

原因：

- PyMuPDF / pymupdf4llm / pymupdf_layout 是 AGPL-3.0（或 Artifex 商业许可）
- ebooklib 是 AGPL-3.0
- 客户端是分发给客户的，打包这些依赖会触发 AGPL 的分发义务

客户端不打包 Python，也不打包上述库。

## 2. 字体

| 字体 | 处理 |
|---|---|
| PingFang SC / Songti SC / Helvetica Neue | Apple 系统字体，不打包，只写字体栈 |
| Microsoft YaHei / DengXian / SimSun | Windows 系统字体，不打包 |
| Arial / Arial Black / Calibri / Georgia | Microsoft/Office 字体，不打包 |
| Inter / Poppins / Noto Sans SC / Noto Serif SC | OFL，可在需要跨平台一致时打包，附许可证 |

PPT 侧使用 `*_stack_ppt`，Inter / Poppins 自动落到 Arial。不要从系统字体目录复制字体文件到应用资源。

## 3. 图标

本 skill 只使用：

- `tabler-outline`（MIT）
- `tabler-filled`（MIT）
- `phosphor-duotone`（MIT）

不使用：

- `chunk-filled`（CC BY 4.0，需要署名）
- `simple-icons`（CC0 文件，但品牌商标权不授予）

如果以后需要品牌 Logo：按需放单个素材，只用于指认品牌，不能暗示合作/背书，不能当应用图标。

## 4. 主题

- 21 套主题卡由 ClawHive 自建，`themes/catalog.json` 明确写 `no external vendor assets included`
- 主题 token、预览、画廊都是自有资产
- 如果某套主题参考了第三方设计语言，只保留抽象规则，不复制第三方素材/模板/品牌资产
- `themes/overrides.json` 的人工修正同样属于自有资产

## 5. 执行内核

- 执行内核本体 MIT，允许商用、修改、分发
- 0.3.0 起随包内置在 `runtime/engine/`，客户端只读设计参考和模板；导出时只调用 `svg_quality_checker.py` 与 `svg_to_pptx.py` 两步
- 客户端加载边界见 `references/engine-usage.md`；引擎自带的路由、Step 1–7 和 Python 命令不适用于客户端
- PPTX 由客户端用宿主注入的 Python（随包 wheels：python-pptx / XlsxWriter / lxml / Pillow）导出；后端部署同一份 `runtime/engine/`，两边不维护第二份代码
- 必须原样保留 `LICENSE`、`SPONSORS.md`、`SPONSORS_CN.md` 和 `scripts/attribution_guard.py`；改动会导致 `exit 78`
- 不要删除原作者的版权声明；白标时在第三方声明页保留
- 裁剪清单（simple-icons、chunk-filled、brands、sounds 等）见 `ENGINE.md`，排除项不影响完整性门禁

## 6. 后端依赖

允许：

```text
python-pptx        MIT
XlsxWriter         BSD-2
skia-pathops       BSD-3
uharfbuzz          Apache-2.0
Pillow             HPND
numpy              BSD-3
PyYAML             MIT
```

禁止进入核心链路：

```text
PyMuPDF             AGPL-3.0 / Artifex commercial
pymupdf4llm         AGPL-3.0
pymupdf_layout      AGPL-3.0
ebooklib            AGPL-3.0
edge-tts            LGPL-3.0（另有微软服务条款）
```

`edge-tts` 如果只做旁白，可作为可选模块，保留可替换性和许可证声明；商用前确认微软服务条款。

## 7. 内容和素材

- 用户上传的报告、图片、引语、数据，版权归原权利人
- skill 里加提示：商用交付前由使用方确认素材授权
- 不要把第三方品牌模板、客户机密材料、未授权的小红书图片打进 skill 包

## 8. 交付前检查

- [ ] 客户端依赖里没有 AGPL/GPL
- [ ] 没有打包 Apple / Microsoft 字体
- [ ] 图标只有 Tabler / Phosphor
- [ ] 没有 `chunk-filled` / `simple-icons`
- [ ] 没有第三方品牌模板
- [ ] `runtime/engine/` 的 `LICENSE`、`SPONSORS*`、`attribution_guard.py` 未被改动
- [ ] `python3 runtime/engine/scripts/attribution_guard.py` 返回 0
- [ ] `THIRD_PARTY_NOTICES.md` 已更新
- [ ] 后端依赖清单通过 `pip-licenses` 检查
