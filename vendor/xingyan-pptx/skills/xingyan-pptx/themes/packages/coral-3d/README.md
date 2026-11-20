# 珊瑚三维

- id: `coral-3d`
- density: `spacious`
- visual style: `soft-rounded`
- PPT fidelity: `approximate`
- audited: `False`

## 主题描述

珊瑚粉渐变 + 3D 几何悬浮装饰的轻商务作品集风格——冷钢灰文字与黑白图片压舱，柔粉色块承担情绪表达

## 视觉行为

气质：温和、现代、轻商务；视觉语汇：珊瑚渐变、冷灰压舱文字、少量悬浮几何；装饰：rounded gradient shape, shadowed geometry and steel-gray line；构图：3D cue is secondary; content relationship leads

## 禁忌

- 避免粉色覆盖整页
- 3D装饰需让出数据
- 不要使用廉价高光

## PPT 降级策略

复杂 CSS 效果改为静态填充、渐变或烘焙背景，文字和形状保持原生

## 使用方式

1. 把 `spec_lock.fragment.md` 的章节合并进项目 `spec_lock.md`。
2. 把 `design_spec.fragment.md` 的 §III–§VI 合并进项目 `design_spec.md`。
3. HTML 侧引入 `theme.css`；SVG 侧直接使用同一组 token。
