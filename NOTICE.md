# 第三方组件声明

本插件的 `vendor/xingyan-pptx/` 是一份**未经修改的第三方快照**，用于在本地生成版式稿：

- 内核来自 **PPT Master**，作者 Hugo He，MIT 许可
  <https://github.com/hugohe3/ppt-master>
- 该快照自带自己的 `LICENSE`、`SPONSORS.md`、`SPONSORS_CN.md` 以及署名校验脚本
  （`scripts/attribution_guard.py`），这些文件受上游许可保护，**不得删除或改写**，
  否则 `apply_template` 会拒绝运行。

本插件只对**外层产品**（包名、界面、文档）使用「星彦 PPT」品牌；第三方的署名与分发条件保持原样。

插件自身代码：MIT。
