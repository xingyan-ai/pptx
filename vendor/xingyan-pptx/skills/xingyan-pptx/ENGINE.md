# 执行内核

`runtime/engine/` 是本包内置的设计参考，提供设计契约与页面执行的方法、模板和图标。它随包提供，用户不需要单独安装，也不需要理解它的来源。**它不是客户端的执行手册。**

## 边界

| 项 | 规则 |
|---|---|
| 读 | 按 `references/engine-usage.md` 的允许清单读 `ENGINE_DIR/SKILL.md`、`references/`、`templates/`；`workflows/` 只作后端参考，客户端不按它执行 |
| 写 | 只读。升级时整棵替换，不逐文件改 |
| 执行 | 客户端用宿主注入的 Python 跑 `scripts/pptx-export.mjs`（需要能 import python-pptx / lxml / PIL） |
| 路径 | `ENGINE_DIR = runtime/engine/` |

## 客户端使用边界

- 引擎 `SKILL.md` 的 Mandatory Load Order、`workflows/routing.md` 和 Step 1–7 是引擎/后端的执行流程，客户端不执行。
- 不直接运行内核的 Python 命令；唯一入口是 `scripts/pptx-export.mjs`：它按 `--python` → `CLAWHIVE_PPTX_PYTHON` → `CLAWHIVE_PYTHON_EXECUTABLE` → ClawHive 运行时 → 本机 `python` 的顺序解析解释器，再按需调用 `svg_quality_checker.py` 与 `svg_to_pptx.py`。其余脚本（`project_manager.py`、`source_to_md.py`、`text_measure.py`、`finalize_svg.py`、`icon_sync.py`）仍不在客户端执行。
- 引擎文档里提到的 `simple-icons`、`chunk-filled`、`templates/brands/`、`templates/sounds/` 已从包内裁掉；不要再引用，也不要因为引擎文档写了就用。
- 引擎文档里写死的旧工作区路径（`skills/...`）视为过期；需要读文件时以 `ENGINE_DIR` 为准。
- 完整加载/跳过清单和失效资产表见 `references/engine-usage.md`。外壳规则与引擎参考冲突时，以 `SKILL.md` 和 `references/` 为准。

## 为什么必须是两级目录

内核用 `SKILL_DIR.parent.parent` 推导默认项目目录。`runtime/engine` 和它原本的布局一样是两级，所以行为不变。

如果改成 `runtime/engine/core` 这种三级路径，默认项目目录会解析到错误的位置——那等于改内核，不在本包的权限内。

## 完整性校验

```bash
# 仅打包 / CI 执行；客户端不跑。
# PowerShell 不支持 &&，分两行写；Windows 上通常只有 python，没有 python3。
python runtime/engine/scripts/attribution_guard.py
if ($LASTEXITCODE -eq 0) { "integrity ok" }
```

校验不通过时，工具链以 `exit 78` 关闭。以下内容不得修改、删除或重命名：

```text
runtime/engine/SKILL.md
runtime/engine/LICENSE
runtime/engine/SPONSORS.md
runtime/engine/SPONSORS_CN.md
runtime/engine/scripts/attribution_guard.py
```

## 升级

1. 用新版内核整棵替换 `runtime/engine/`，不要逐文件改
2. 保持目录名和深度不变
3. 跑一次完整性校验
4. 跑一次 `node scripts/outline-to-spec.mjs <project> --check`，确认 scaffold 契约仍兼容
5. 如果新版改了 `templates/scaffolds/` 的结构，同步检查 `scripts/outline-to-spec.mjs` 里的 §VII 与 `Spacing anchors` 补全逻辑

## 裁剪清单

为控制体积和商标风险，内置时排除了以下内容。排除项都不影响完整性校验。

| 排除项 | 原因 |
|---|---|
| `templates/icons/simple-icons/` | 商标权不随 CC0 授权 |
| `templates/icons/chunk-filled/` | 许可证与本包的图标规则冲突 |
| `templates/brands/` | 含真实品牌 logo，商标不在 MIT 范围内 |
| `templates/sounds/` | 体积占三分之一，客户端不做旁白 |
| `scripts/tests/`、`scripts/docs/`、`docs-zh/` | 上游测试与文档，运行不需要 |

注意：引擎自带的 `templates/icons/README.md`、`workflows/routing.md`、`references/animations.md` 等文档仍然会提到上述已裁资产（例如「12,027 icons / five libraries」）。那些是上游原文，不代表本包实际内容；以 `references/engine-usage.md` 的失效资产表为准。

## 署名

内核的版权与许可证信息在 `THIRD_PARTY_NOTICES.md`。那是合规文件，不是宣传材料；本包的其余文档、回复和交付物不引用内核来源。
