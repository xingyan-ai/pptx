# 星彦 PPT

DeepSeek Harness 插件：**选主题 → 写需求 → 出大纲 → 逐页生成版式稿 → 导出 PPTX / PDF**。

## 安装

客户端「插件 → 添加插件」里填：

```
dsh-plugin-xingyan-pptx         # 包名（npm 发布后）
github:xingyan-ai/pptx          # GitHub（本仓库）
/绝对路径/xingyan-pptx           # 本地目录
```

npm 版本尚未发布，当前请用 GitHub 或本地目录安装。装完重启客户端，侧栏出现「星彦 PPT」。

## 依赖

| 依赖 | 说明 |
|---|---|
| Node | ≥ 20 |
| dsh | 0.2.1-rc.5 以上、0.3.0 以下 |
| Python | 3.10+；出稿要 `PyYAML`，导出 PPTX 还要 `python-pptx` + `Pillow` |
| Chrome / Edge | 只有导出 PDF 需要 |

缺依赖时页面顶部会出现警告条，点「一键安装」即可（会建 venv 并装好）。也可以手动：

```sh
python3 -m venv ~/.venv-pptx
~/.venv-pptx/bin/pip install "PyYAML>=6" "python-pptx>=0.6.21" "Pillow>=9"
```

解释器按这个顺序找：`PPTX_PYTHON` → 现有 venv 的底座 → uv 管理的 CPython → Homebrew → 系统 `python3`。
选底座时会排除装不了二进制轮子的 hardened 运行时。

## 用什么模型

走 dsh 当前的默认模型（`ctx.get('llm')` + `agentDefaultModel`），不需要单独配密钥。
**大纲一次调用，每一页各一次**，所以页数越多越慢；界面上有计时。

## 它怎么工作

```
主题墙（21 套，封面来自内置素材）
  → 选主题 → 写需求 → 生成大纲（模型）
  → 逐页：版式区域 + 这一页的四层内容交给模型 → 得到整页 SVG
       （模型失败自动退回模板填槽，不会卡住）
  → finalize（图片内联）→ HTML / PPTX / PDF
```

- **版式**：`presentation_core`，20 类中性版式，不含任何品牌素材
- **主题**：21 套，只影响配色，不改版式
- **大纲合同**：每页 `points` / `evidence` / `soWhat` / `action` + `source`

## 环境自检

`GET /xingyan-pptx/doctor` 返回 skill / Python / Chrome 的检测结果，界面加载时会自动调一次。

## 目录

```
index.js               Host 半：路由、模型调用、出稿链路
client.js              浏览器半：四段式界面
vendor/xingyan-pptx    第三方内核快照（见 NOTICE.md）
~/.dsh/pptx-desk/decks 出稿产物（可随时删）
```

## 许可

插件自身代码 MIT。`vendor/xingyan-pptx/` 是第三方快照，署名与分发条件见 [NOTICE.md](NOTICE.md)。

# 本地开发提示：客户端本地安装是复制而非软链，改完要同步
# rsync -a --delete --exclude .git --exclude decks --exclude node_modules ./ ~/.dsh/profiles/desktop/node_modules/dsh-plugin-xingyan-pptx/
