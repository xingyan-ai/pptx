# Third-Party Notices

This package is part of ClawHive PPTX. The notices below cover the
third-party material that the client package or its recommended backend uses.

## PPT Master

- Project: https://github.com/hugohe3/ppt-master
- Version: 6.7.2
- License: MIT
- Copyright (c) 2025-2026 Hugo He

PPT Master is bundled unmodified under `runtime/engine/` as part of this
Skill. The client reads its documentation and templates but does not execute
its Python toolchain; PPTX export runs on the backend from the same subtree.

The upstream `LICENSE`, `SPONSORS.md`, `SPONSORS_CN.md`, and
`scripts/attribution_guard.py` are kept byte-for-byte. Do not modify or remove
them; the upstream integrity guard fails closed with exit code 78 otherwise.

Excluded from the bundled copy (full list and reasons in `ENGINE.md`):
`templates/icons/simple-icons`, `templates/icons/chunk-filled`,
`templates/brands`, `templates/sounds`, `scripts/tests`, `scripts/docs`,
`docs-zh`, `__pycache__`, `.venv`, `.env`, `projects`.

## Icons

The bundled PPT Master subtree ships only these libraries:

| Library | Path | License | Copyright |
|---|---|---|---|
| Tabler Icons (outline, filled) | `runtime/engine/templates/icons/tabler-*` | MIT | Copyright (c) 2020-2026 Paweł Kuna |
| Phosphor Icons (duotone) | `runtime/engine/templates/icons/phosphor-duotone` | MIT | Copyright (c) 2023 Phosphor Icons |

`chunk-filled` (CC BY 4.0) and `simple-icons` (CC0 files, brand trademarks
reserved) are intentionally excluded from this package, as are the
third-party brand templates under `templates/brands/`.

## Theme cards

The 38 theme cards, expanded tokens, previews, and overrides under `themes/`
are ClawHive-authored assets. `themes/catalog.json` records:

> ClawHive-authored style cards; no external vendor assets included.

## Fonts

No font files are distributed with this package. The theme tokens reference
system font stacks (PingFang SC, Songti SC, Microsoft YaHei, DengXian, SimSun,
Arial, Calibri, Georgia) and, where available, OFL families (Inter, Poppins,
Noto Sans SC, Noto Serif SC).

If a build bundles Inter, Poppins, or Noto fonts, include the SIL Open Font
License 1.1 and any Reserved Font Name notices.

## Client runtime

The client scripts use only Node.js built-in modules. No third-party npm
package is required.

The vendored PPT Master `scripts/` tree is Python source that ships for backend
deployment parity. It is never executed by the desktop client, and no Python
interpreter or PyPI package is distributed with this Skill.

## Source extraction (PDF)

`runtime/engine/scripts/source_to_md/pdf_to_md.py` is part of PPT Master (MIT).
It imports **PyMuPDF**, which is **AGPL-3.0** (or Artifex commercial). PyMuPDF is
not bundled and must not enter the distributed client. The client default is
`pypdf` (BSD-3-Clause); `pdfplumber` (MIT) is an optional commercial-safe
structured backend. The PyMuPDF path is backend/self-hosted only and requires
the explicit `--allow-agpl` flag.

## Backend dependencies

The recommended PPTX backend uses only permissively licensed packages:

| Package | License |
|---|---|
| python-pptx | MIT |
| XlsxWriter | BSD-2-Clause |
| skia-pathops | BSD-3-Clause |
| uharfbuzz | Apache-2.0 |
| Pillow | HPND |
| numpy | BSD-3-Clause |
| PyYAML | MIT |

The backend core must not include PyMuPDF, pymupdf4llm, pymupdf_layout,
ebooklib, or edge-tts. PDF/EPUB conversion is a separate optional service.

## Content

User-provided documents, images, quotes, and data remain subject to their own
rights. Commercial delivery requires the user to clear those rights.
