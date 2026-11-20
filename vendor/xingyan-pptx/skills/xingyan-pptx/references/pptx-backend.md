# PPTX 后端契约

客户端不运行 Python，不打包 Python 解释器、PyMuPDF、ebooklib。执行内核以源码形式内置在 `runtime/engine/`，客户端只读文档和模板；PPTX 由后端用同一份子树把自包含 SVG 编译成原生 DrawingML。

## 1. 请求

```http
POST /v1/decks/pptx
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <deck-title>-<timestamp>
```

```json
{
  "schemaVersion": 1,
  "deck": {
    "title": "墨水屏趋势与AI地图",
    "themeId": "swiss-signal",
    "language": "zh-CN",
    "canvas": { "width": 1280, "height": 720 }
  },
  "pages": [
    { "id": "P01", "svg": "<svg ...>...</svg>" },
    { "id": "P02", "svg": "<svg ...>...</svg>" }
  ],
  "options": {
    "speakerNotes": false,
    "nativeCharts": false
  }
}
```

要求：

- 每页 SVG 必须是自包含的：图标已展开、图片是 data URI、无外部 `href`
- 每页 SVG 根节点的 `lang` 与 `deck.language` 都是 BCP-47；HTML 导出的 `<html lang>` 同源
- 页数 1–100
- 请求体 ≤ 20 MB
- `themeId` 可空；后端只用于日志/主题校验，不重新设计页面
- `options.speakerNotes` 为 true 时，后端从请求附加的 notes 或项目 notes 生成备注（当前客户端默认 false）

## 2. 响应

### 直接返回文件

```http
200 OK
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
```

### 返回下载地址

```json
{ "downloadUrl": "https://.../deck.pptx" }
```

### 异步任务

```json
{ "jobId": "job_...", "statusUrl": "https://.../jobs/job_..." }
```

客户端会轮询 `statusUrl`，最多 5 分钟；`status: succeeded` 时读 `downloadUrl`，`failed` 时报错。

## 3. 错误

| 状态 | 含义 |
|---|---|
| 400 | 请求结构错误、页数为 0、canvas 不支持 |
| 401/403 | token 无效或无权限 |
| 413 | 请求体超过 20 MB |
| 422 | SVG 质检失败，返回 JSON 报告 |
| 429 | 限流，客户端会重试一次 |
| 5xx | 后端错误，客户端会重试一次 |

422 示例：

```json
{
  "error": "quality_gate_failed",
  "report": {
    "blocking": [
      { "page": "P04", "issue": "root group overlap" }
    ]
  }
}
```

## 4. 后端职责

- 运行执行内核的 `svg_quality_checker.py`（可选，但建议）
- 运行 `svg_to_pptx.py`，把 SVG 编译成 DrawingML
- 返回 PPTX 和 postflight 报告
- 记录 `themeId`、页数、请求大小、耗时、失败原因
- 不保存用户内容超过必要时间；按租户隔离

后端依赖只允许 permissive：

```text
python-pptx        MIT
XlsxWriter         BSD-2
skia-pathops       BSD-3
uharfbuzz          Apache-2.0
Pillow             HPND
numpy              BSD-3
PyYAML             MIT
```

**不要**在后端核心链路引入 PyMuPDF、pymupdf4llm、pymupdf_layout、ebooklib、edge-tts。PDF/EPUB 转换走独立的完整转换服务，或买 Artifex 商业许可。

## 5. 客户端调用

```bash
node scripts/pptx-backend-client.mjs <project> \
  --endpoint "$DECK_STUDIO_PPTX_ENDPOINT" \
  --token "$DECK_STUDIO_TOKEN"
```

dry-run：

```bash
node scripts/pptx-backend-client.mjs <project> --dry-run
```

会写 `<project>/exports/<name>.payload.json`，用于检查请求体大小和页数。

## 6. 安全

- 只允许 `https://` 端点；本地调试可用 `http://127.0.0.1`
- token 不写进日志
- 不把用户 SVG 或 PPTX 用于训练
- 上传内容按租户隔离，设置保留期
- 对 SVG 做资源上限检查（页数、单页大小、总大小、文本长度）
