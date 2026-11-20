# ppt-master v6.7.2 · 分发包说明

## 来源

- 上游：https://github.com/hugohe3/ppt-master
- 版本：6.7.2（SKILL.md frontmatter `metadata.version`）
- 许可：MIT，Copyright (c) 2025-2026 Hugo He，见 `LICENSE`
- 本包从 `~/.codex/skills/ppt-master/` 原样复制，未改动任何运行文件。

## 包内容

| 目录 | 说明 |
|---|---|
| `SKILL.md` | 入口：加载顺序、路由、全局执行纪律 |
| `workflows/` | 六条运行路线，主流程是 `generate-pptx.md` |
| `references/` | 角色定义与创作参考（strategist / executor / 各类模块） |
| `templates/` | brands / styles / layouts / decks / icons / charts / tables / sounds |
| `scripts/` | Python 工具链，含 SVG → DrawingML 编译器与质量检查器 |
| `docs-zh/` | 中文阅读版（仅阅读，不参与执行；由本工作区翻译） |
| `requirements.txt` | 可选依赖清单，注意 PyMuPDF 为 AGPL-3.0 |

## 运行环境

**Python ≥ 3.10**。实测 Python 3.9.6 会在 `config.py` 抛
`TypeError: unsupported operand type(s) for |: 'types.GenericAlias' and 'NoneType'`——
代码用了 `X | None` 的形式，且该文件没有 `from __future__ import annotations`。
上游没有声明版本要求，这条是实测结论。

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install python-pptx XlsxWriter skia-pathops uharfbuzz
```

其余按需安装。**PyMuPDF 是 AGPL-3.0**，只在转换 PDF 源时用到；不转换就别装，跟商业分发无关。

## 完整性门禁

本包保留原版 `scripts/attribution_guard.py`。任何 CLI 入口都会先校验：

- `SKILL.md` frontmatter 的 copyright / license / official_repository / sponsors
- `LICENSE` 的 SHA-256
- `SPONSORS.md`、`SPONSORS_CN.md` 存在
- 九个门禁文件里包含 guard 调用

任一不符直接 `exit 78`。**不要裁剪或改写这些文件**，否则工具不可用（这也是 MIT 署名义务的落点）。

自检：

```bash
python3 scripts/attribution_guard.py && echo "integrity ok"
```

## 使用

```bash
python3 scripts/project_manager.py init <项目名>
python3 scripts/project_manager.py validate <项目路径>
python3 scripts/svg_quality_checker.py <项目路径> --canonical-authoring --stage final --json
python3 scripts/svg_to_pptx.py <项目路径>
```

注意：`svg_to_pptx.py` 的正式导出要求 `validation/svg_quality_report.json` 与当前 `svg_output/` 指纹一致，否则拒绝导出——这是设计如此。

## 未包含

- `.venv/`（356MB，本地虚拟环境）
- `__pycache__/`、`*.pyc`、`.DS_Store`
- `.env`（本地密钥，只保留 `.env.example`）

## 第三方素材

- `templates/icons/chunk-filled`：CC BY 4.0，需署名 Noah Jacobus
- Tabler / Phosphor：MIT；Simple Icons：CC0，但**品牌商标权不随之转移**
- `templates/brands/` 含真实第三方 logo（Google、Anthropic、AWS 等），商标不在 MIT 范围内，对外分发前需评估
- `templates/sounds/`：CC0，来源见 `templates/sounds/THIRD_PARTY_NOTICES.md`
