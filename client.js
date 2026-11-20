/**
 * 星彦 PPT · Client 半。
 *
 * 四段式：主题墙 → 模板预览 → 左右分栏（参数 + 大纲）→ 成品预览。
 * 视觉与动效对齐「自媒体工作台」：弹簧缓动、卡片错峰入场、参差瀑布流。
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-xingyan-pptx',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback } = React

    const NS = 'xingyan-pptx'
    const PANEL_ID = 'xingyan-pptx'
    const API = 'xingyan-pptx/'
    let IMG = ''

    const SCENES = ['通用汇报', '竞品调研', '销售汇报', '客户方案', '行业洞察', '经营复盘', '培训赋能', '产品发布', '客户案例']
    const AUDIENCES = ['管理层', '业务团队', '外部客户', '投资人']
    const ROLE_LABEL = { cover: '封面', toc: '目录', section: '章节', hero: '大图', content: '内容', ending: '结尾' }

    const CSS = `
.pk-root{min-height:100%;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#16181c);
  font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased;
  --ease:cubic-bezier(.2,.8,.2,1);--spring:cubic-bezier(.2,1.3,.4,1);--acc:var(--dsw-alias-state-business-primary,#2a78d6)}
.pk-root *{box-sizing:border-box}
@keyframes pk-rise{from{opacity:0;transform:translateY(10px)}}
@keyframes pk-pop{from{opacity:0;transform:scale(.95) translateY(8px)}}
@keyframes pk-shimmer{to{background-position:-220% 0}}
@keyframes pk-drift{to{transform:translate3d(24px,16px,0) scale(1.08)}}

.pk-wrap{max-width:1060px;margin:0 auto;padding:24px 26px 64px;position:relative}
.pk-amb{position:absolute;inset:-40px 0 auto;height:280px;pointer-events:none;overflow:hidden;opacity:.5}
.pk-amb i{position:absolute;border-radius:50%;filter:blur(56px);animation:pk-drift 24s var(--ease) infinite alternate}
.pk-amb i:nth-child(1){width:300px;height:300px;left:-70px;top:-50px;background:color-mix(in srgb,var(--acc) 17%,transparent)}
.pk-amb i:nth-child(2){width:240px;height:240px;right:30px;top:-30px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b87816) 13%,transparent);animation-delay:-8s}

.pk-bar{position:relative;display:flex;align-items:center;gap:12px;margin-bottom:18px}
.pk-bar-txt{flex:1;min-width:0}
.pk-eyebrow{font-size:11px;letter-spacing:.13em;text-transform:uppercase;font-weight:600;color:var(--dsw-alias-label-tertiary,#8b929c);margin-bottom:5px}
.pk-title{margin:0;font-size:22px;font-weight:650;letter-spacing:-.018em}
.pk-sub{margin:4px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary,#5f6672)}

.pk-btn{font:inherit;font-size:12.5px;font-weight:600;padding:8px 15px;border-radius:9px;cursor:pointer;
  border:1px solid transparent;transition:transform .18s var(--spring),filter .18s,background .18s,color .18s}
.pk-btn:active{transform:scale(.97)}
.pk-btn:disabled{opacity:.42;cursor:default;transform:none}
.pk-btn-primary{background:var(--acc);color:#fff}
.pk-btn-primary:hover:not(:disabled){filter:brightness(1.08)}
.pk-btn-ghost{background:transparent;border-color:var(--dsw-alias-border-l1,#dcdfe5);color:var(--dsw-alias-label-secondary,#5f6672)}
.pk-btn-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.pk-btn-sm{font-size:11.5px;padding:5px 10px;border-radius:7px}

.env-warn{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px;padding:10px 13px;border-radius:10px;
  border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b87816) 38%,transparent);
  background:var(--dsw-alias-state-warn-tertiary,rgba(200,130,20,.12));font-size:12px;color:var(--dsw-alias-state-warn-primary,#b87816)}
.env-btn{font:inherit;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;border:0;cursor:pointer;background:var(--accent);color:#fff}
.env-btn:disabled{opacity:.55;cursor:default}
.env-warn code{font-family:ui-monospace,Menlo,monospace;font-size:11px;background:var(--dsw-alias-bg-base,#fff);
  padding:3px 7px;border-radius:6px;color:var(--dsw-alias-label-primary,#16181c);word-break:break-all}

.wk{padding:26px 4px 8px}
.wk-back{margin-bottom:18px}
.wk-title{font-size:34px;letter-spacing:-.02em;margin:2px 0 6px}
.wk-sub{color:var(--dsw-alias-label-secondary,#5f6672);font-size:13px;margin:0 0 20px}
.wk-tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px}
.wk-search{flex:1;min-width:240px;display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:10px;
  border:1px solid var(--dsw-alias-border-l2,#e6e8ec);background:var(--dsw-alias-bg-base,#fff)}
.wk-search input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary,#16181c)}
.wk-search-icon{color:var(--dsw-alias-label-tertiary,#8b929c);font-size:15px}
.wk-chips{display:flex;gap:8px}
.wk-chip{font:inherit;font-size:12.5px;padding:9px 15px;border-radius:9px;cursor:pointer;
  border:1px solid var(--dsw-alias-border-l2,#e6e8ec);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#5f6672)}
.wk-chip.is-on{background:var(--dsw-alias-label-primary,#16181c);color:var(--dsw-alias-bg-base,#fff);border-color:transparent}
.wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.wk-card{border:1px solid var(--dsw-alias-border-l2,#e6e8ec);border-radius:14px;overflow:hidden;
  background:var(--dsw-alias-bg-base,#fff);display:flex;flex-direction:column}
.wk-shot{display:block;padding:0;border:0;cursor:pointer;background:var(--dsw-alias-bg-layer-2,#eceeed);aspect-ratio:16/9;width:100%;overflow:hidden}
.wk-shot img{width:100%;height:100%;object-fit:cover;display:block}
.wk-meta{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--dsw-alias-label-secondary,#5f6672);padding:12px 14px 0}
.wk-dot{width:8px;height:8px;border-radius:2px;background:var(--accent)}
.wk-name{font-size:15px;font-weight:600;line-height:1.4;margin:6px 14px 0;color:var(--dsw-alias-label-primary,#16181c)}
.wk-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;margin-top:auto}
.wk-date{font-size:12px;color:var(--dsw-alias-label-tertiary,#8b929c);font-variant-numeric:tabular-nums}
.wk-actions{display:flex;gap:6px}
.wk-btn{font:inherit;font-size:12.5px;padding:7px 13px;border-radius:8px;cursor:pointer;border:0;
  background:var(--dsw-alias-label-primary,#16181c);color:var(--dsw-alias-bg-base,#fff)}
.wk-btn-ghost{background:transparent;color:var(--dsw-alias-label-secondary,#5f6672);border:1px solid var(--dsw-alias-border-l2,#e6e8ec)}
.wk-btn.is-danger{border-color:var(--dsw-alias-state-error-primary,#d63c3c);color:var(--dsw-alias-state-error-primary,#d63c3c)}
.wk-empty{padding:60px 0;text-align:center;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:13px}
.wall-loading{display:flex;align-items:center;justify-content:center;height:46vh}
.wall-shimmer{font-size:14px;font-weight:500;background:linear-gradient(100deg,
  var(--dsw-alias-label-tertiary,#8b929c) 30%, var(--dsw-alias-label-primary,#16181c) 50%, var(--dsw-alias-label-tertiary,#8b929c) 70%);
  background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:pk-shimmer 1.6s linear infinite}
@keyframes tile-in{from{opacity:0;transform:scale(.96)}}
.marquee{position:relative;overflow:hidden;margin-top:6px;border-radius:14px;cursor:grab;
  background-image:radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-label-primary,#16181c) 11%, transparent) 1px, transparent 1.2px);
  background-size:26px 26px;
  mask-image:linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 26px), transparent 100%),
             linear-gradient(to right, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
  mask-composite:intersect;-webkit-mask-composite:source-in}
.marquee:active{cursor:grabbing}
.marquee-track{position:absolute;inset:0;will-change:transform}
.bento-row{display:flex}
.bento-tile{position:relative;padding:0;border:0;border-radius:11px;overflow:hidden;cursor:pointer;flex:none;
  background:var(--dsw-alias-bg-layer-2,#eceeed);animation:tile-in .5s var(--ease) both;
  transition:transform .3s var(--spring),box-shadow .25s var(--ease)}
.bento-tile:hover{transform:translateY(-3px) scale(1.015);box-shadow:0 18px 34px -18px rgba(16,20,26,.5);z-index:2}
.bento-tile img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s var(--ease)}
.bento-tile:hover img{transform:scale(1.05)}
.bento-fallback{display:grid;place-items:center;height:100%;font-size:12px;color:var(--dsw-alias-label-secondary,#5f6672)}
.bento-label{position:absolute;left:0;right:0;bottom:0;padding:18px 10px 8px;text-align:left;
  font-size:11px;font-weight:600;line-height:1.3;color:#fff;
  background:linear-gradient(to top, rgba(8,10,12,.72), rgba(8,10,12,0));
  opacity:0;transform:translateY(6px);transition:opacity .22s var(--ease),transform .22s var(--ease);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bento-tile:hover .bento-label{opacity:1;transform:translateY(0)}
.mock{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:13px;overflow:hidden}
.mock.is-mini{justify-content:center;gap:0;padding:7px}
.mock.is-mini .mock-t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mock.is-big{justify-content:space-between;padding:22px 24px}
.mock-big-body{display:flex;flex-direction:column;gap:8px}
.mock-big-sub{font-size:11.5px;opacity:.55;letter-spacing:.01em}
.mock-tag{position:absolute;left:13px;top:12px;font-size:8px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:3px}
.mock-t{font-weight:700;line-height:1.15;letter-spacing:-.02em;overflow:hidden}
.mock-rule{width:26px;height:2.5px;border-radius:2px}
.mock-f{font-size:8px;letter-spacing:.05em;opacity:.75}
.mock-line{height:4px;border-radius:2px;opacity:.22}
.mock-row{display:flex;align-items:center;gap:6px}
.mock-dot{width:9px;height:9px;border-radius:2px;flex:none;opacity:.85}
.mock-num{font-size:22px;font-weight:700;line-height:1;letter-spacing:-.03em}
.mock-bar{height:5px;border-radius:3px}

.modal{position:fixed;inset:0;z-index:220;background:rgba(12,15,20,.44);display:grid;place-items:center;padding:22px;
  animation:pk-rise .25s var(--ease) both}
.modal-card{background:var(--dsw-alias-bg-base,#fff);border-radius:16px;width:min(880px,100%);max-height:88vh;
  display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 70px -24px rgba(0,0,0,.55);animation:pk-pop .3s var(--spring) both}
.modal-head{display:flex;align-items:center;gap:10px;padding:15px 18px 12px}
.modal-title{font-size:14px;font-weight:600}
.modal-x{margin-left:auto;font:inherit;font-size:19px;line-height:1;border:0;background:transparent;cursor:pointer;
  color:var(--dsw-alias-label-tertiary,#8b929c);padding:2px 6px;border-radius:6px}
.modal-x:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}
.modal-big{margin:0 18px;border-radius:12px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2,#e6e8ec);background:#0f1114}
.modal-img{width:100%;display:block;aspect-ratio:16/9;object-fit:contain;background:#0f1114}
.modal-strip{display:flex;gap:9px;padding:14px 18px 4px;overflow-x:auto}
.modal-thumb-img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
.modal-thumb{flex:none;width:132px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;background:#0f1114;
  transition:border-color .18s var(--ease),transform .2s var(--spring)}
.modal-thumb:hover{transform:translateY(-2px)}
.modal-thumb[data-on="1"]{border-color:var(--acc)}
.modal-foot{display:flex;gap:9px;align-items:center;padding:14px 18px 16px}
.modal-export{width:min(820px,100%)}
.exp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:4px 18px 8px;overflow-y:auto;max-height:58vh}
@media (max-width:640px){.exp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.exp-card{border:1.5px solid var(--dsw-alias-border-l2,#e6e8ec);border-radius:10px;padding:0;overflow:hidden;cursor:pointer;
  background:var(--dsw-alias-bg-base,#fff);text-align:left;font:inherit;color:inherit;transition:border-color .18s var(--ease),transform .2s var(--spring)}
.exp-card:hover{transform:translateY(-2px)}
.exp-card[data-on="1"]{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}
.exp-shot{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,var(--dsw-alias-bg-layer-2,#eceeed),var(--dsw-alias-bg-layer-1,#f7f8f7));
  display:flex;align-items:center;justify-content:center}
.exp-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff}
.exp-no{font-size:18px;font-weight:700;color:var(--dsw-alias-label-tertiary,#8b929c);opacity:.5}
.exp-role{position:absolute;left:7px;top:7px;font-size:9px;font-weight:600;padding:1px 6px;border-radius:20px;
  background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-tertiary,#8b929c)}
.exp-check{position:absolute;right:7px;top:7px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;
  font-size:10px;background:var(--acc);color:#fff;opacity:0;transform:scale(.6);transition:opacity .15s,transform .2s var(--spring)}
.exp-card[data-on="1"] .exp-check{opacity:1;transform:scale(1)}
.exp-title{padding:7px 9px;font-size:11.5px;font-weight:500;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.exp-fmt{display:flex;gap:2px;padding:3px;border-radius:9px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}
.exp-fmt-btn{font:inherit;font-size:11.5px;font-weight:600;padding:5px 11px;border:0;border-radius:7px;cursor:pointer;
  background:transparent;color:var(--dsw-alias-label-secondary,#5f6672)}
.exp-fmt-btn[data-on="1"]{background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#16181c);box-shadow:0 1px 2px rgba(0,0,0,.08)}

.ed{display:grid;grid-template-columns:290px minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:820px){.ed{grid-template-columns:minmax(0,1fr)}}
.ed-left{position:sticky;top:14px;display:flex;flex-direction:column;gap:12px}
.card{border:1px solid var(--dsw-alias-border-l2,#e6e8ec);border-radius:13px;padding:13px 14px;background:var(--dsw-alias-bg-base,#fff)}
.ed-theme{display:flex;gap:10px;align-items:center}
.ed-theme-mock{width:74px;flex:none;border-radius:8px;overflow:hidden}
.ed-theme-name{font-size:12.5px;font-weight:600;line-height:1.35}
.ed-theme-desc{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8b929c);margin-top:2px}
.ed-change{margin-top:6px}
.fld{display:flex;flex-direction:column;gap:5px;margin-bottom:10px}
.fld>span{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b929c)}
.pk-input,.pk-select{font:inherit;font-size:12.5px;padding:7px 10px;border-radius:8px;width:100%;
  border:1px solid var(--dsw-alias-border-l1,#dcdfe5);background:var(--dsw-alias-bg-base,#fff);color:inherit}
.pk-input:focus,.pk-select:focus{outline:2px solid var(--acc);outline-offset:-1px}
.pk-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pk-area{width:100%;font:inherit;font-size:12.5px;line-height:1.65;padding:9px 11px;border-radius:9px;min-height:92px;resize:vertical;
  border:1px solid var(--dsw-alias-border-l1,#dcdfe5);background:var(--dsw-alias-bg-base,#fff);color:inherit}
.pk-area:focus{outline:2px solid var(--acc);outline-offset:-1px}
.drop{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:10px;cursor:pointer;
  border:1.5px dashed var(--dsw-alias-border-l1,#dcdfe5);transition:border-color .2s var(--ease)}
.drop:hover{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 4%,transparent)}
.drop-icon{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-size:13px;flex:none;
  background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05));color:var(--dsw-alias-label-tertiary,#8b929c)}
.drop-txt{font-size:11.5px;color:var(--dsw-alias-label-secondary,#5f6672)}
.files{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.file{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 8px;border-radius:7px;
  background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05));color:var(--dsw-alias-label-secondary,#5f6672)}
.file button{border:0;background:none;cursor:pointer;color:inherit;opacity:.6;font-size:12px;line-height:1;padding:0}

.ed-right{display:flex;flex-direction:column;gap:10px;min-height:0}
.ed-scroll{display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:calc(100vh - 300px);padding-right:6px;
  scrollbar-width:thin}
.ed-scroll::-webkit-scrollbar{width:8px}
.ed-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2,#e6e8ec);border-radius:4px}
.ed-head{display:flex;align-items:center;gap:10px}
.ed-head-title{font-size:13px;font-weight:600}
.ed-head-note{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b929c)}
.ed-head .pk-btn{margin-left:auto}
.ed-head .pk-btn+.pk-btn{margin-left:8px}
.ed-timer{font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#8b929c);margin-left:auto}
.ed-timer+.pk-btn{margin-left:10px}
.ol-card{border:1px solid var(--dsw-alias-border-l2,#e6e8ec);border-radius:12px;padding:12px 13px;background:var(--dsw-alias-bg-base,#fff);
  display:flex;flex-direction:column;gap:7px;animation:pk-rise .4s var(--ease) both;transition:box-shadow .2s,border-color .2s}
.ol-card:hover{border-color:var(--dsw-alias-border-l3,#c9ced6)}
.ol-head{display:flex;align-items:center;gap:8px}
.ol-grip{color:var(--dsw-alias-label-tertiary,#8b929c);font-size:11px;letter-spacing:-2px;user-select:none}
.ol-no{font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#8b929c);width:18px;flex:none}
.ol-title{flex:1;font:inherit;font-size:13px;font-weight:600;border:1px solid transparent;background:transparent;
  padding:2px 4px;border-radius:6px;color:inherit;min-width:0}
.ol-title:hover{background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.03))}
.ol-title:focus{outline:none;border-color:var(--acc);background:var(--dsw-alias-bg-base,#fff)}
.ol-role{flex:none;font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:20px;
  background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.055));color:var(--dsw-alias-label-tertiary,#8b929c)}
.ol-role[data-r="cover"]{background:color-mix(in srgb,var(--acc) 13%,transparent);color:var(--acc)}
.ol-role[data-r="section"]{background:var(--dsw-alias-state-warn-tertiary,rgba(200,130,20,.14));color:var(--dsw-alias-state-warn-primary,#b87816)}
.ol-role[data-r="ending"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f8f5b) 13%,transparent);color:var(--dsw-alias-state-success-primary,#2f8f5b)}
.ol-msg{font:inherit;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#5f6672);width:100%;
  border:1px solid transparent;background:transparent;padding:3px 4px;border-radius:6px;resize:vertical;font-family:inherit}
.ol-msg:hover{background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.03))}
.ol-msg:focus{outline:none;border-color:var(--acc);background:var(--dsw-alias-bg-base,#fff)}
.ol-points{margin:0;padding-left:15px;font-size:11.5px;line-height:1.65;color:var(--dsw-alias-label-tertiary,#8b929c)}
.ol-comment{display:flex;align-items:center;gap:6px;margin-top:2px}
.ol-comment input{flex:1;font:inherit;font-size:11.5px;padding:5px 9px;border-radius:7px;
  border:1px solid var(--dsw-alias-border-l1,#dcdfe5);background:var(--dsw-alias-bg-base,#fff);color:inherit}
.ol-comment input:focus{outline:2px solid var(--acc);outline-offset:-1px}
.ol-tools{display:flex;gap:3px;flex:none}
.ol-tool{font:inherit;font-size:11px;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;
  border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8b929c);cursor:pointer}
.ol-tool:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#16181c)}
.ol-tool:disabled{opacity:.3;cursor:default}
.ol-add{display:flex;align-items:center;justify-content:center;gap:6px;padding:11px;border-radius:11px;cursor:pointer;
  border:1.5px dashed var(--dsw-alias-border-l1,#dcdfe5);font:inherit;font-size:12px;color:var(--dsw-alias-label-tertiary,#8b929c);
  background:transparent;transition:border-color .2s var(--ease),color .2s}
.ol-add:hover{border-color:var(--acc);color:var(--acc)}
.issue-box{border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#d63c3c) 34%,transparent);
  background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d63c3c) 6%,transparent);
  border-radius:12px;padding:12px 14px;animation:pk-rise .3s var(--ease) both}
.issue-head{font-size:12.5px;font-weight:600;color:var(--dsw-alias-state-error-primary,#d63c3c);margin-bottom:7px}
.issue-list{margin:0;padding-left:16px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary,#5f6672)}
.issue-tip{margin-top:8px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b929c)}
.ol-empty{padding:52px 0;text-align:center;font-size:12.5px;color:var(--dsw-alias-label-tertiary,#8b929c)}

.res{display:grid;grid-template-columns:212px minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:820px){.res{grid-template-columns:minmax(0,1fr)}}
.res-strip{display:flex;flex-direction:column;gap:7px;max-height:70vh;overflow-y:auto;padding-right:4px}
.res-item{display:flex;gap:9px;align-items:center;padding:8px 9px;border-radius:9px;cursor:pointer;text-align:left;
  border:1px solid var(--dsw-alias-border-l2,#e6e8ec);background:var(--dsw-alias-bg-base,#fff);font:inherit;color:inherit;
  transition:border-color .18s var(--ease),transform .2s var(--spring)}
.res-item:hover{transform:translateX(2px)}
.res-item[data-on="1"]{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}
.res-no{font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#8b929c);flex:none}
.res-t{font-size:11.5px;font-weight:500;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.res-frame{border:1px solid var(--dsw-alias-border-l2,#e6e8ec);border-radius:13px;overflow:hidden;background:#0f1114;aspect-ratio:16/9}
.res-frame iframe{width:100%;height:100%;border:0;display:block}
.res-tip{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b929c);margin-top:8px}

.log{display:flex;flex-direction:column;gap:6px;margin-top:12px;font-size:11.5px}
.log-row{display:flex;gap:8px;padding:7px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.025));
  animation:pk-rise .3s var(--ease) both}
.log-row i{flex:none;font-style:normal}
.log-row[data-ok="1"] i{color:var(--dsw-alias-state-success-primary,#2f8f5b)}
.log-row[data-ok="0"] i{color:var(--dsw-alias-state-error-primary,#d63c3c)}
.log-row b{font-weight:600;flex:none}
.log-row span{color:var(--dsw-alias-label-tertiary,#8b929c);word-break:break-all;min-width:0}

.loading{display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--dsw-alias-label-tertiary,#8b929c);padding:24px 0}
.loading b{background:linear-gradient(100deg,var(--dsw-alias-label-tertiary,#8b929c) 30%,var(--dsw-alias-label-primary,#16181c) 50%,var(--dsw-alias-label-tertiary,#8b929c) 70%);
  background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pk-shimmer 1.6s linear infinite;font-weight:500}
.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);background:var(--dsw-alias-toast-bg,#23262b);
  color:var(--dsw-alias-toast-label,#fff);font-size:12.5px;padding:8px 14px;border-radius:9px;z-index:260;opacity:0;pointer-events:none;
  transition:opacity .18s var(--ease),transform .22s var(--ease)}
.toast[data-on="1"]{opacity:1;transform:translateX(-50%) translateY(0)}
`

    // Host 端口被占时会后移，这里探一次并记住；IMG 用同一 base
    let BASE = ''
    async function apiBase() {
      if (BASE) return BASE
      for (let i = 0; i < 10; i += 1) {
        const candidate = 'http://127.0.0.1:' + (35124 + i) + '/xingyan-pptx/'
        try {
          const res = await fetch(candidate + 'themes', { cache: 'no-store' })
          if (res.ok) { BASE = candidate; IMG = candidate; return BASE }
        } catch (error) {}
      }
      throw new Error('本地接口没起来（重启客户端试试）')
    }
    async function get(path) {
      const base = await apiBase()
      const res = await fetch(base + path, { cache: 'no-store' })
      return res.json()
    }
    async function post(path, body) {
      const base = await apiBase()
      const res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body) })
      return res.json()
    }

    function cnName(theme) {
      const parts = String(theme.name || '').split(' ')
      return parts.length > 1 ? parts.slice(1).join(' ') : theme.name
    }

    function MockCover(props) {
      const theme = props.theme
      const c = theme.colors
      const variant = props.variant || 'card'
      const title = props.title || cnName(theme) || '示例标题'
      const box = { background: c.bg, color: c.text, height: props.height }

      if (variant === 'mini') {
        return h('div', { className: 'mock is-mini', style: box },
          h('div', { className: 'mock-t', style: { fontSize: 9, lineHeight: 1.25 } }, title),
          h('div', { className: 'mock-rule', style: { background: c.accent, width: 14, height: 2, marginTop: 4 } }))
      }
      if (variant === 'thumb') {
        return h('div', { className: 'mock', style: Object.assign({}, box, { padding: 9 }) },
          h('div', { className: 'mock-t', style: { fontSize: 10 } }, title),
          h('div', { className: 'mock-rule', style: { background: c.accent, width: 12, height: 2, marginTop: 3 } }))
      }
      if (variant === 'big') {
        return h('div', { className: 'mock is-big', style: box },
          h('div', { className: 'mock-tag', style: { background: c.accent, color: '#fff' } }, 'PREVIEW'),
          h('div', { className: 'mock-big-body' },
            h('div', { className: 'mock-t', style: { fontSize: 38, lineHeight: 1.08 } }, title),
            h('div', { className: 'mock-big-sub', style: { color: c.text } }, '在这套主题下，标题、正文和强调色如何配合'),
            h('div', { className: 'mock-rule', style: { background: c.accent, width: 44, height: 3, marginTop: 14 } })),
          h('div', { className: 'mock-f' }, '2026 · 演示稿'))
      }
      return h('div', { className: 'mock', style: box },
        h('div', { className: 'mock-tag', style: { background: c.accent, color: '#fff' } }, 'DECK'),
        h('div', { className: 'mock-t', style: { fontSize: 17, marginBottom: 2 } }, title),
        h('div', { className: 'mock-rule', style: { background: c.accent } }),
        h('div', { className: 'mock-f' }, '2026 · 演示稿'))
    }

    function MockPage(props) {
      const c = props.theme.colors
      const kind = props.kind
      if (kind === 'toc') {
        return h('div', { className: 'mock', style: { background: c.bg, color: c.text, height: props.height, justifyContent: 'center' } },
          [0, 1, 2, 3].map(function (i) {
            return h('div', { key: i, className: 'mock-row', style: { opacity: 1 - i * 0.12 } },
              h('div', { className: 'mock-dot', style: { background: c.accent } }),
              h('div', { className: 'mock-line', style: { background: c.text, width: 62 - i * 9 + '%' } }))
          }))
      }
      if (kind === 'data') {
        return h('div', { className: 'mock', style: { background: c.bg, color: c.text, height: props.height, justifyContent: 'center', gap: 9 } },
          h('div', { className: 'mock-num', style: { color: c.accent } }, '17.0M'),
          [92, 64, 40].map(function (w, i) {
            return h('div', { key: i, className: 'mock-bar', style: { background: c.accent, width: w + '%', opacity: 0.75 - i * 0.18 } })
          }))
      }
      if (kind === 'ending') {
        return h('div', { className: 'mock', style: { background: c.text, color: c.bg, height: props.height, alignItems: 'center', justifyContent: 'center' } },
          h('div', { className: 'mock-t', style: { fontSize: 20 } }, '谢谢'),
          h('div', { className: 'mock-rule', style: { background: c.accent } }))
      }
      return h('div', { className: 'mock', style: { background: c.bg, color: c.text, height: props.height } },
        h('div', { className: 'mock-t', style: { fontSize: 15, marginBottom: 5 } }, '内容页标题'),
        [0, 1, 2].map(function (i) {
          return h('div', { key: i, className: 'mock-line', style: { background: c.text, width: 88 - i * 16 + '%' } })
        }),
        h('div', { className: 'mock-bar', style: { background: c.accent, width: '46%', marginTop: 4, opacity: .8 } }))
    }

    /* ---- 漂移画布：不动鼠标就往左上缓缓移动，悬停即停 ---- */

    function rowCounts(total) {
      const rows = []
      let left = total
      let wide = true
      while (left > 0) {
        let k = wide ? 3 : 2
        if (left - k === 1) k = left
        if (k > left) k = left
        rows.push(k)
        left -= k
        wide = !wide
      }
      return rows
    }

    function ThemeTile(props) {
      const theme = props.theme
      return h('button', {
        type: 'button',
        className: 'bento-tile',
        style: { width: props.w + 'px', height: props.h + 'px', animationDelay: props.delay + 'ms' },
        onClick: function () { if (!props.suppressed || !props.suppressed()) props.onPick(theme) },
      },
        theme.cover
          ? h('img', { src: IMG + theme.cover, alt: theme.name, draggable: 'false' })
          : h('span', { className: 'bento-fallback' }, theme.name),
        h('span', { className: 'bento-label' }, theme.name))
    }

    function fmtTime(ms) {
      const d = new Date(ms)
      const pad = function (n) { return (n < 10 ? '0' : '') + n }
      return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate())
    }

    /** 我的作品：整页列表，搜索 + 打开 / 删除。 */
    function WorksPage(props) {
      const items = props.items || []
      const [query, setQuery] = useState('')
      const [filter, setFilter] = useState('all')
      const [confirming, setConfirming] = useState('')

      const shown = items.filter(function (item) {
        if (filter === 'exported' && !item.pptx && !item.pdf) return false
        if (filter === 'draft' && (item.pptx || item.pdf)) return false
        if (!query.trim()) return true
        const key = (item.title + ' ' + (item.themeId || '')).toLowerCase()
        return key.indexOf(query.trim().toLowerCase()) >= 0
      })
      const chip = function (key, label, count) {
        return h('button', {
          type: 'button',
          className: 'wk-chip' + (filter === key ? ' is-on' : ''),
          onClick: function () { setFilter(key) },
        }, label + ' (' + count + ')')
      }

      return h('div', { className: 'wk' },
        h('button', { type: 'button', className: 'pk-btn pk-btn-ghost pk-btn-sm wk-back', onClick: props.onBack }, '← 返回主题墙'),
        h('div', { className: 'pk-eyebrow' }, 'MY WORKS'),
        h('h1', { className: 'pk-title wk-title' }, '我的作品'),
        h('p', { className: 'pk-sub wk-sub' }, '点卡片打开；也可以直接导出或删除。'),
        h('div', { className: 'wk-tools' },
          h('div', { className: 'wk-search' },
            h('span', { className: 'wk-search-icon', 'aria-hidden': 'true' }, '⌕'),
            h('input', {
              type: 'search', value: query, placeholder: '搜索标题、主题',
              onChange: function (event) { setQuery(event.target.value) },
            })),
          h('div', { className: 'wk-chips' },
            chip('all', '全部', items.length),
            chip('exported', '已导出', items.filter(function (i) { return i.pptx || i.pdf }).length),
            chip('draft', '未导出', items.filter(function (i) { return !i.pptx && !i.pdf }).length))),
        props.loading
          ? h('div', { className: 'wall-loading' }, h('div', { className: 'spinner' }))
          : shown.length
            ? h('div', { className: 'wk-grid' }, shown.map(function (item) {
                const deleting = confirming === item.project
                return h('article', { className: 'wk-card', key: item.project },
                  h('button', {
                    type: 'button', className: 'wk-shot',
                    onClick: function () { props.onOpen(item) },
                  }, h('img', { src: IMG + 'slide?project=' + encodeURIComponent(item.project) + '&n=1', alt: '', loading: 'lazy' })),
                  h('div', { className: 'wk-meta' },
                    h('span', { className: 'wk-dot' }),
                    (item.themeId ? '主题 ' + item.themeId + ' · ' : '') + item.pages + ' 页' + (item.pptx ? ' · 已导 PPTX' : '')),
                  h('h3', { className: 'wk-name' }, item.title),
                  h('div', { className: 'wk-foot' },
                    h('span', { className: 'wk-date' }, fmtTime(item.at)),
                    h('div', { className: 'wk-actions' },
                      h('button', { type: 'button', className: 'wk-btn', onClick: function () { props.onOpen(item) } }, '打开'),
                      h('button', {
                        type: 'button', className: 'wk-btn wk-btn-ghost' + (deleting ? ' is-danger' : ''),
                        onClick: function () {
                          if (deleting) { props.onDelete(item); setConfirming('') } else setConfirming(item.project)
                        },
                      }, deleting ? '确认删除' : '删除')))) 
              }))
            : h('div', { className: 'wk-empty' }, query ? '没有匹配的作品' : '出一次稿之后，这里会保留每一份的封面、页数和导出记录。'))
    }

    function ThemeWall(props) {
      const themes = props.themes
      const hostRef = useRef(null)
      const trackRef = useRef(null)
      const [width, setWidth] = useState(0)
      const off = useRef({ x: 0, y: 0 })
      const span = useRef({ w: 1, h: 1 })
      const dragging = useRef(false)
      const hovering = useRef(false)
      const dragged = useRef(false)

      useEffect(function () {
        const el = hostRef.current
        if (!el) return undefined
        const read = function () { setWidth(el.getBoundingClientRect().width) }
        read()
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(read)
        observer.observe(el)
        return function () { observer.disconnect() }
      }, [])

      // 漂移：单一偏移量，实时取模，永远不会露底也不会累积
      useEffect(function () {
        const rafFn = typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : function (fn) { return setTimeout(function () { fn(Date.now()) }, 16) }
        const cafFn = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout
        let id = 0
        let last = 0
        const wrap = function (value, size) { return -((((-value) % size) + size) % size) }
        const tick = function (now) {
          try {
            const track = trackRef.current
            const w = span.current.w || 1
            const h = span.current.h || 1
            const dt = last ? Math.min(64, now - last) : 16
            last = now
            if (track && !dragging.current && !hovering.current) {
              off.current.x -= 0.014 * dt
              off.current.y -= 0.008 * dt
            }
            if (track) {
              // 每帧都归一到一个周期内：副本像素完全相同，取模在视觉上无感
              off.current.x = wrap(off.current.x, w)
              off.current.y = wrap(off.current.y, h)
              track.style.transform = 'translate3d(' + off.current.x.toFixed(2) + 'px,' + off.current.y.toFixed(2) + 'px,0)'
            }
          } catch (error) {
          } finally {
            id = rafFn(tick)
          }
        }
        id = rafFn(tick)
        return function () { cafFn(id) }
      }, [])

      const beginDrag = function (event) {
        if (typeof event.button === 'number' && event.button !== 0) return
        const el = event.currentTarget
        const pointerId = event.pointerId
        // 先不捕获指针：一捕获，click 就落到容器上，卡片自己的 onClick 收不到
        dragging.current = true
        dragged.current = false
        // 起手先把偏移归一到一个周期内，给左右各留一个周期的拖动余量
        const w0 = span.current.w || 1
        const h0 = span.current.h || 1
        off.current.x = -((((-off.current.x) % w0) + w0) % w0)
        off.current.y = -((((-off.current.y) % h0) + h0) % h0)
        const start = { x: event.clientX, y: event.clientY, ox: off.current.x, oy: off.current.y }
        const onMove = function (moveEvent) {
          const dx = moveEvent.clientX - start.x
          const dy = moveEvent.clientY - start.y
          if (!dragged.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            dragged.current = true
            try { el.setPointerCapture(pointerId) } catch (error) {}
          }
          // 与漂移共用同一个偏移量，落点天然精确
          off.current.x = start.ox + dx
          off.current.y = start.oy + dy
        }
        const finish = function () {
          dragging.current = false
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', finish)
          window.removeEventListener('pointercancel', finish)
          try { el.releasePointerCapture(pointerId) } catch (error) {}
          // 松手后归一（副本相同，视觉上不跳，只是换了一份）
          const w1 = span.current.w || 1
          const h1 = span.current.h || 1
          off.current.x = -((((-off.current.x) % w1) + w1) % w1)
          off.current.y = -((((-off.current.y) % h1) + h1) % h1)
          setTimeout(function () { dragged.current = false }, 0)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', finish)
        window.addEventListener('pointercancel', finish)
      }

      if (!themes) {
        return h('div', { className: 'wall-loading' }, h('span', { className: 'wall-shimmer' }, '正在铺开主题…'))
      }
      if (!themes.length) return h('div', { className: 'ol-empty' }, '没有读到主题目录')

      const gap = 12
      const usable = (width || 960) - 4
      const counts = rowCounts(themes.length)
      const rows = []
      let cursor = 0
      let totalH = 0
      for (const count of counts) {
        const tileW = Math.floor((usable - gap * (count - 1)) / count)
        const tileH = Math.round((tileW * 9) / 16)
        rows.push({ tileW, tileH, items: themes.slice(cursor, cursor + count) })
        totalH += tileH + gap
        cursor += count
      }
      span.current = { w: usable + gap, h: totalH + gap }

      const copies = []
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          copies.push(h('div', {
            key: col + '-' + row,
            style: {
              position: 'absolute',
              left: col * span.current.w + 'px',
              top: row * span.current.h + 'px',
              width: usable + 'px',
              display: 'flex',
              flexDirection: 'column',
              gap: gap + 'px',
            },
          },
            rows.map(function (item, rowIndex) {
              return h('div', { key: rowIndex, className: 'bento-row', style: { gap: gap + 'px' } },
                item.items.map(function (theme, index) {
                  return h(ThemeTile, {
                    key: theme.id,
                    theme: theme,
                    w: item.tileW,
                    h: item.tileH,
                    delay: Math.min(rowIndex * 3 + index, 18) * 22,
                    onPick: props.onPick,
                    suppressed: function () { return dragged.current },
                  })
                }))
            })))
        }
      }

      return h('div', {
        className: 'marquee',
        ref: hostRef,
        style: { height: Math.max(320, Math.min(span.current.h, 640)) + 'px' },
        onPointerDown: beginDrag,
        onMouseEnter: function () { hovering.current = true },
        onMouseLeave: function () { hovering.current = false },
      }, h('div', { className: 'marquee-track', ref: trackRef }, copies))
    }

    function PreviewModal(props) {
      const theme = props.theme
      const [page, setPage] = useState(0)
      const shots = theme.pages && theme.pages.length ? theme.pages : []
      const big = shots.length
        ? h('img', { className: 'modal-img', src: IMG + (shots[page] || shots[0]), alt: theme.name })
        : h(MockCover, { theme: theme, variant: 'big', height: 300 })

      return h('div', { className: 'modal', onClick: props.onClose, role: 'dialog', 'aria-modal': 'true' },
        h('div', { className: 'modal-card', onClick: function (e) { e.stopPropagation() } },
          h('div', { className: 'modal-head' },
            h('span', { className: 'modal-title' }, '模板预览'),
            h('span', { className: 'pk-eyebrow', style: { margin: 0 } }, theme.name),
            h('button', { type: 'button', className: 'modal-x', onClick: props.onClose, 'aria-label': '关闭' }, '×')),
          h('div', { className: 'modal-big' }, big),
          h('div', { className: 'modal-strip' },
            (shots.length ? shots : ['', '', '', '']).map(function (shot, index) {
              const thumb = shot
                ? h('img', { className: 'modal-thumb-img', src: IMG + shot, alt: '', loading: 'lazy' })
                : h(MockPage, { theme: theme, kind: 'content', height: 74 })
              return h('div', {
                key: index, className: 'modal-thumb', 'data-on': page === index ? '1' : '0',
                onClick: function () { setPage(index) },
              }, thumb)
            })),
          h('div', { className: 'modal-foot' },
            h('button', { type: 'button', className: 'pk-btn pk-btn-ghost', onClick: props.onClose }, '取消'),
            h('button', { type: 'button', className: 'pk-btn pk-btn-primary', onClick: function () { props.onUse(theme) } }, '使用模板'))))
    }

    function OutlineCard(props) {
      const slide = props.slide
      const index = props.index
      return h('div', { className: 'ol-card', style: { animationDelay: Math.min(index, 12) * 24 + 'ms' } },
        h('div', { className: 'ol-head' },
          h('span', { className: 'ol-grip' }, '⠿'),
          h('span', { className: 'ol-no' }, String(index + 1).padStart(2, '0')),
          h('input', {
            className: 'ol-title', value: slide.title || '',
            onChange: function (e) { props.onChange({ title: e.target.value }) },
          }),
          h('span', { className: 'ol-role', 'data-r': slide.role }, ROLE_LABEL[slide.role] || slide.role),
          h('span', { className: 'ol-tools' },
            h('button', { type: 'button', className: 'ol-tool', disabled: index === 0, title: '上移', onClick: props.onUp }, '↑'),
            h('button', { type: 'button', className: 'ol-tool', disabled: index === props.total - 1, title: '下移', onClick: props.onDown }, '↓'),
            h('button', { type: 'button', className: 'ol-tool', title: '删除', onClick: props.onRemove }, '×'))),
        h('textarea', {
          className: 'ol-msg', value: slide.coreMessage || '', rows: 2,
          onChange: function (e) { props.onChange({ coreMessage: e.target.value }) },
        }),
        slide.points && slide.points.length
          ? h('ul', { className: 'ol-points' }, slide.points.map(function (point, i) { return h('li', { key: i }, point) }))
          : null,
        h('div', { className: 'ol-comment' },
          h('input', {
            placeholder: '我要修改这些信息…', value: slide.comment || '',
            onChange: function (e) { props.onChange({ comment: e.target.value }) },
          })))
    }

    function ResultView(props) {
      const [page, setPage] = useState(1)
      const frame = useRef(null)
      const slides = props.slides || []
      const src = IMG + 'deck?project=' + encodeURIComponent(props.project)

      useEffect(function () {
        const win = frame.current && frame.current.contentWindow
        if (!win) return undefined
        const timer = setTimeout(function () {
          try { win.postMessage({ __deckPage: page }, '*') } catch (error) {}
        }, 300)
        return function () { clearTimeout(timer) }
      }, [page, src])

      return h('div', null,
        h('div', { className: 'res' },
          h('div', { className: 'res-strip' },
            slides.map(function (slide, index) {
              return h('button', {
                key: slide.id || index, type: 'button', className: 'res-item',
                'data-on': page === index + 1 ? '1' : '0',
                onClick: function () { setPage(index + 1) },
              },
                h('span', { className: 'res-no' }, String(index + 1).padStart(2, '0')),
                h('span', { className: 'res-t' }, slide.title))
            })),
          h('div', null,
            h('div', { className: 'res-frame' }, h('iframe', { ref: frame, src: src, title: 'deck' })),
            h('div', { className: 'res-tip' }, '左侧点页码跳转；预览里也能用方向键翻页。'))),
        props.steps
          ? h('div', { className: 'log' },
              props.steps.map(function (item, index) {
                return h('div', { key: index, className: 'log-row', 'data-ok': item.ok ? '1' : '0' },
                  h('i', null, item.ok ? '✓' : '✕'),
                  h('b', null, item.label),
                  h('span', null, (item.ok ? item.out : item.err || '').slice(-200)))
              }))
          : null)
    }

    function ExportModal(props) {
      const slides = props.slides || []
      const [picked, setPicked] = useState(slides.map(function (_, i) { return i }))
      const [format, setFormat] = useState('pptx')
      const [busy, setBusy] = useState(false)
      const toggle = function (index) {
        setPicked(function (current) {
          return current.includes(index) ? current.filter(function (i) { return i !== index }) : current.concat([index]).sort(function (a, b) { return a - b })
        })
      }
      const allOn = picked.length === slides.length
      const contentCount = picked.filter(function (i) { return slides[i].role !== 'toc' }).length

      return h('div', { className: 'modal', onClick: props.onClose, role: 'dialog', 'aria-modal': 'true' },
        h('div', { className: 'modal-card modal-export', onClick: function (e) { e.stopPropagation() } },
          h('div', { className: 'modal-head' },
            h('span', { className: 'modal-title' }, '选择要导出的幻灯片'),
            h('span', { className: 'pk-eyebrow', style: { margin: 0 } }, '已选 ' + picked.length + ' 页'),
            h('button', { type: 'button', className: 'modal-x', onClick: props.onClose, 'aria-label': '关闭' }, '×')),
          h('div', { className: 'exp-grid' },
            slides.map(function (slide, index) {
              const on = picked.includes(index)
              return h('button', {
                key: slide.id || index, type: 'button', className: 'exp-card',
                'data-on': on ? '1' : '0',
                onClick: function () { toggle(index) },
              },
                h('div', { className: 'exp-shot' },
                  props.project
                    ? h('img', { className: 'exp-img', src: IMG + 'slide?project=' + encodeURIComponent(props.project) + '&n=' + (index + 1), alt: '', loading: 'lazy' })
                    : null,
                  h('span', { className: 'exp-no' }, String(index + 1).padStart(2, '0')),
                  h('span', { className: 'exp-role' }, ROLE_LABEL[slide.role] || slide.role),
                  h('span', { className: 'exp-check' }, on ? '✓' : '')),
                h('div', { className: 'exp-title' }, slide.title))
            })),
          h('div', { className: 'modal-foot' },
            h('button', {
              type: 'button', className: 'pk-btn pk-btn-ghost',
              onClick: function () { setPicked(allOn ? [] : slides.map(function (_, i) { return i })) },
            }, allOn ? '取消全选' : '全选'),
            h('span', { style: { flex: 1 } }),
            h('div', { className: 'exp-fmt' },
              [['pptx', 'PPTX'], ['pdf', 'PDF']].map(function (pair) {
                return h('button', {
                  key: pair[0], type: 'button', className: 'exp-fmt-btn',
                  'data-on': format === pair[0] ? '1' : '0',
                  onClick: function () { setFormat(pair[0]) },
                }, pair[1])
              })),
            h('button', { type: 'button', className: 'pk-btn pk-btn-ghost', onClick: props.onClose }, '取消'),
            h('button', {
              type: 'button', className: 'pk-btn pk-btn-primary',
              disabled: busy || contentCount < 3,
              onClick: async function () {
                setBusy(true)
                try { await props.onExport(picked, format) } finally { setBusy(false) }
              },
            }, busy ? '导出中…' : (contentCount < 3 ? '至少选 3 页正文' : '导出选中 ' + picked.length + ' 页')))))
    }

    function PanelIcon() {
      return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: 3, y: 4.5, width: 18, height: 12, rx: 2, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('path', { d: 'M8 20h8', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }))
    }

    // 面板卸载后 state 会没；把关键字段存在模块作用域，切页面回来还在。
    const STORE = {
      themes: null, theme: null, phase: 'wall', scene: SCENES[0], audience: AUDIENCES[0],
      pages: 10, requirement: '', files: [], outline: null, result: null, built: null,
    }

    function Panel() {
      const [themes, setThemes] = useState(STORE.themes)
      const [preview, setPreview] = useState(null)
      const [theme, setTheme] = useState(STORE.theme)
      const [phase, setPhase] = useState(STORE.phase)
      const [scene, setScene] = useState(STORE.scene)
      const [audience, setAudience] = useState(STORE.audience)
      const [pages, setPages] = useState(STORE.pages)
      const [requirement, setRequirement] = useState(STORE.requirement)
      const [files, setFiles] = useState(STORE.files)
      const [outline, setOutline] = useState(STORE.outline)
      const [busy, setBusy] = useState('')
      const [result, setResult] = useState(STORE.result)
      const [toast, setToast] = useState('')
      const [toastKey, setToastKey] = useState(0)
      const [env, setEnv] = useState(null)
      const [works, setWorks] = useState([])
      const [resultFrom, setResultFrom] = useState('editor')
      const [worksBusy, setWorksBusy] = useState(false)
      const [fixing, setFixing] = useState(false)
      const notify = useCallback(function (text) { setToast(text); setToastKey(function (k) { return k + 1 }) }, [])
      const [issues, setIssues] = useState([])
      const [built, setBuilt] = useState(STORE.built || null)
      const [elapsed, setElapsed] = useState(0)
      const [exportOpen, setExportOpen] = useState(false)
      const [exporting, setExporting] = useState(false)
      const fileInput = useRef(null)

      useEffect(function () {
        get('doctor').then(function (data) { if (data && data.ok) setEnv(data) }).catch(function () {})
        get('themes').then(function (data) {
          if (data && data.base) IMG = data.base
          if (data && data.ok && data.themes.length) setThemes(data.themes)
          else { setThemes([]); notify((data && data.reason) || '读不到主题目录') }
        }).catch(function (error) {
          setThemes([])
          const reason = String(error && error.message ? error.message : error)
          notify('主题接口不通：' + reason.slice(0, 60))
          // 回传给 Host 落盘，方便排查（失败也不影响界面）
          try {
            fetch((BASE || '') + 'clientlog', {
              method: 'POST',
              headers: { 'content-type': 'text/plain' },
              body: JSON.stringify({ where: 'themes', reason: reason, href: String(location.href).slice(0, 120), api: API }),
            }).catch(function () {})
          } catch (ignored) {}
        })
      }, [])

      useEffect(function () {
        STORE.themes = themes
        STORE.theme = theme
        STORE.phase = phase
        STORE.scene = scene
        STORE.audience = audience
        STORE.pages = pages
        STORE.requirement = requirement
        STORE.files = files
        STORE.outline = outline
        STORE.result = result
      }, [themes, theme, phase, scene, audience, pages, requirement, files, outline, result])

      // 出稿计时：从点下按钮开始，每秒 +1
      useEffect(function () {
        if (busy !== 'build' && busy !== 'outline') return undefined
        const startedAt = Date.now()
        setElapsed(0)
        const timer = setInterval(function () { setElapsed(Math.floor((Date.now() - startedAt) / 1000)) }, 1000)
        return function () { clearInterval(timer) }
      }, [busy])

      useEffect(function () {
        if (!toast) return undefined
        const timer = setTimeout(function () { setToast('') }, 2600)
        return function () { clearTimeout(timer) }
      }, [toastKey])

      const useTheme = function (item) {
        setTheme(item)
        setPreview(null)
        setPhase('editor')
      }

      const topicOf = function () {
        const line = String(requirement || '').split(/[\n。]/).map(function (t) { return t.trim() }).filter(Boolean)[0]
        return line || ''
      }

      const makeOutline = async function () {
        if (busy) return
        const topic = topicOf()
        if (!topic) { notify('第一行先写主题'); return }
        setBusy('outline')
        try {
          const data = await post('outline', {
            topic: topic, scene: scene, audience: audience, pages: Number(pages) || 10,
            themeId: theme ? theme.id : '', requirement: requirement,
            attachmentNames: files.map(function (file) { return file.name }),
          })
          if (data && data.outline) {
            if (!data.outline.slides) data.outline.slides = []
            setOutline(data.outline)
            STORE.outline = data.outline
          }
          if (!data || !data.ok) {
            // 没有大纲就是没有，不要谎称给了兜底
            notify('大纲生成失败：' + String((data && data.reason) || '未知原因').slice(0, 50))
          }
        } catch (error) {
          notify('生成失败：' + String(error.message || error).slice(0, 40))
        } finally {
          setBusy('')
        }
      }

      const updateSlide = function (index, patch) {
        setOutline(function (current) {
          const slides = current.slides.slice()
          slides[index] = Object.assign({}, slides[index], patch)
          return Object.assign({}, current, { slides: slides })
        })
      }
      const moveSlide = function (index, delta) {
        setOutline(function (current) {
          const slides = current.slides.slice()
          const target = index + delta
          if (target < 0 || target >= slides.length) return current
          const temp = slides[index]
          slides[index] = slides[target]
          slides[target] = temp
          return Object.assign({}, current, { slides: slides })
        })
      }
      const removeSlide = function (index) {
        setOutline(function (current) {
          const slides = current.slides.slice()
          slides.splice(index, 1)
          return Object.assign({}, current, { slides: slides })
        })
      }
      const addSlide = function () {
        setOutline(function (current) {
          const slides = current.slides.slice()
          const id = 'blank-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
          slides.push({ id: id, role: 'content', title: '新的一页', coreMessage: '', points: [], comment: '' })
          return Object.assign({}, current, { slides: slides })
        })
      }

      const build = async function () {
        if (!outline || busy) return
        setBusy('build')
        try {
          const payload = JSON.parse(JSON.stringify(outline))
          payload.slides = payload.slides.map(function (slide) {
            const clean = Object.assign({}, slide)
            delete clean.comment
            return clean
          })
          if (payload.contract) payload.contract.themeId = theme ? theme.id : payload.contract.themeId
          setIssues([])
          const data = await post('build', { outline: payload, themeId: theme ? theme.id : '' })
          setResult(data)
          if (data.ok && data.project) {
            setResultFrom('editor')
            setBuilt(payload)
            STORE.built = payload
            STORE.result = data
            STORE.phase = 'result'
            setPhase('result')
          }
          else {
            setIssues(data.issues || [])
            notify('出稿中断：' + (data.failedAt || '未知'))
          }
        } catch (error) {
          notify('出稿失败：' + String(error.message || error).slice(0, 40))
        } finally {
          setBusy('')
        }
      }

      const installPython = async function () {
        if (fixing) return
        setFixing(true)
        notify('正在安装依赖，约 30 秒…')
        try {
          const result = await post('bootstrap-python', {})
          if (result && result.ok) {
            const next = await get('doctor')
            if (next && next.ok) setEnv(next)
            notify('依赖装好了')
          } else {
            notify('安装失败：' + String((result && result.reason) || '未知').slice(0, 50))
          }
        } catch (error) {
          notify('安装失败：' + String(error.message || error).slice(0, 50))
        } finally {
          setFixing(false)
        }
      }

      const envBanner = env && env.python && !env.python.ok
        ? h('div', { className: 'env-warn' },
            h('b', null, '出稿需要 Python 依赖，当前没找到'),
            h('button', {
              type: 'button', className: 'env-btn', disabled: fixing, onClick: installPython,
            }, fixing ? '安装中…' : '一键安装'),
            h('span', null, '或者自己跑：'),
            h('code', null, 'python3 -m venv ~/.venv-pptx && ~/.venv-pptx/bin/pip install PyYAML python-pptx Pillow'))
        : null

      const loadWorks = function () {
        setWorksBusy(true)
        get('history').then(function (data) {
          setWorks((data && data.items) || [])
        }).catch(function (error) {
          notify('历史读取失败：' + String(error.message || error).slice(0, 40))
        }).finally(function () { setWorksBusy(false) })
      }

      const openWorks = function () { loadWorks(); setPhase('works') }

      const openHistoryItem = function (item) {
        const slides = item.slides || []
        STORE.built = { slides: slides }
        STORE.result = { ok: true, project: item.project }
        STORE.phase = 'result'
        setResultFrom('works')
        setBuilt({ slides: slides })
        setResult({ ok: true, project: item.project })
        setPhase('result')
      }

      const deleteHistoryItem = function (item) {
        post('history/delete', { project: item.project }).then(function (data) {
          if (data && data.ok) { setWorks(function (list) { return list.filter(function (x) { return x.project !== item.project }) }); notify('已删除') }
          else notify('删除失败：' + ((data && data.reason) || '未知'))
        })
      }

      const worksPhase = h(WorksPage, {
        items: works, loading: worksBusy,
        onBack: function () { setPhase('wall') },
        onOpen: openHistoryItem,
        onDelete: deleteHistoryItem,
      })

      const wallPhase = h(React.Fragment, null,
        h('div', { className: 'pk-bar' },
          h('div', { className: 'pk-bar-txt' },
            h('div', { className: 'pk-eyebrow' }, 'XINGYAN PPT'),
            h('h1', { className: 'pk-title' }, '星彦 PPT'),
            h('p', { className: 'pk-sub' }, '点一下看样张 · 共 ' + (themes ? themes.length : '…') + ' 套')),
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-ghost pk-btn-sm pk-works',
            onClick: openWorks,
          }, '我的作品')),
        h(ThemeWall, { themes: themes, onPick: setPreview }))

      const editorLeft = h('aside', { className: 'ed-left' },
        h('div', { className: 'card' },
          h('div', { className: 'ed-theme' },
            h('div', { className: 'ed-theme-mock' }, theme ? (theme.cover ? h('img', { src: IMG + theme.cover, alt: '', style: { width: '100%', display: 'block' } }) : h(MockCover, { theme: theme, variant: 'mini', height: 46 })) : null),
            h('div', null,
              h('div', { className: 'ed-theme-name' }, theme ? theme.name : ''),
              h('div', { className: 'ed-theme-desc' }, theme ? theme.description : ''))),
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-ghost pk-btn-sm ed-change', style: { width: '100%' },
            onClick: function () { setPhase('wall') },
          }, '换主题')),
        h('div', { className: 'card' },
          h('div', { className: 'pk-row2' },
            h('div', { className: 'fld' }, h('span', null, '场景'),
              h('select', { className: 'pk-select', value: scene, onChange: function (e) { setScene(e.target.value) } },
                SCENES.map(function (item) { return h('option', { key: item, value: item }, item) }))),
            h('div', { className: 'fld' }, h('span', null, '受众'),
              h('select', { className: 'pk-select', value: audience, onChange: function (e) { setAudience(e.target.value) } },
                AUDIENCES.map(function (item) { return h('option', { key: item, value: item }, item) })))),
          h('div', { className: 'fld' }, h('span', null, '页数'),
            h('input', { className: 'pk-input', type: 'number', min: 5, max: 24, value: pages, onChange: function (e) { setPages(e.target.value) } })),
          h('div', { className: 'fld' }, h('span', null, '要求'),
            h('textarea', {
              className: 'pk-area', value: requirement,
              placeholder: '想讲什么、必须包含哪几块、有什么不能说的。',
              onChange: function (e) { setRequirement(e.target.value) },
            })),
          h('div', { className: 'drop', onClick: function () { if (fileInput.current) fileInput.current.click() } },
            h('div', { className: 'drop-icon' }, '↑'),
            h('div', { className: 'drop-txt' }, '上传附件（文件名带进需求）'),
            h('input', {
              ref: fileInput, type: 'file', multiple: true, style: { display: 'none' },
              onChange: function (event) {
                const picked = Array.from(event.target.files || [])
                setFiles(function (current) {
                  const seen = new Set(current.map(function (f) { return f.name + ':' + f.size }))
                  return current.concat(picked.filter(function (f) { return !seen.has(f.name + ':' + f.size) }))
                })
                event.target.value = ''
              },
            })),
          files.length
            ? h('div', { className: 'files' },
                files.map(function (file, index) {
                  return h('span', { key: file.name, className: 'file' }, file.name,
                    h('button', { type: 'button', onClick: function () { setFiles(files.filter(function (_, i) { return i !== index })) } }, '×'))
                }))
            : null,
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-primary',
            style: { width: '100%', marginTop: 11 },
            disabled: Boolean(busy) || !topicOf(),
            onClick: makeOutline,
          }, busy === 'outline' ? '生成中…' : (outline ? '重新生成大纲' : '生成大纲'))))

      const issuePanel = issues.length
        ? h('div', { className: 'issue-box' },
            h('div', { className: 'issue-head' }, '大纲没过校验，先修这些：'),
            h('ul', { className: 'issue-list' }, issues.map(function (line, index) { return h('li', { key: index }, line) })),
            h('div', { className: 'issue-tip' }, '也可以直接改上面几页，改完再点一次「确认并生成」。'))
        : null

      const editorRight = h('div', { className: 'ed-right' },
        h('div', { className: 'ed-head' },
          h('span', { className: 'ed-head-title' }, '大纲'),
          h('span', { className: 'ed-head-note' }, outline ? outline.slides.length + ' 页' : ''),
          outline
            ? h(React.Fragment, null,
                busy === 'build' ? h('span', { className: 'ed-timer' }, '已用时 ' + Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0')) : null,
                h('button', { type: 'button', className: 'pk-btn pk-btn-primary', disabled: Boolean(busy), onClick: build },
                  busy === 'build' ? '出稿中…' : '确认并生成'))
            : null),
        issuePanel,
        busy === 'outline'
          ? h('div', { className: 'loading' }, h('b', null, '正在生成大纲…'))
          : outline
            ? h(React.Fragment, null,
                h('div', { className: 'ed-scroll' }, outline.slides.map(function (slide, index) {
                  return h(OutlineCard, {
                    key: slide.id || index, slide: slide, index: index, total: outline.slides.length,
                    onChange: function (patch) { updateSlide(index, patch) },
                    onUp: function () { moveSlide(index, -1) },
                    onDown: function () { moveSlide(index, 1) },
                    onRemove: function () { removeSlide(index) },
                  })
                })),
                h('button', { type: 'button', className: 'ol-add', onClick: addSlide }, '+ 新增空白大纲'))
            : h('div', { className: 'ol-empty' }, '左边写一句主题，点「生成大纲」。'))

      const editorPhase = h(React.Fragment, null,
        h('div', { className: 'pk-bar' },
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-ghost pk-btn-sm',
            onClick: function () { setPhase('wall') },
          }, '‹ 返回主题'),
          h('div', { className: 'pk-bar-txt' },
            h('div', { className: 'pk-eyebrow' }, 'XINGYAN PPT'),
            h('h1', { className: 'pk-title' }, '星彦 PPT'),
            h('p', { className: 'pk-sub' }, theme ? theme.name : ''))),
        h('div', { className: 'ed' }, editorLeft, editorRight))

      const resultPhase = h(React.Fragment, null,
        h('div', { className: 'pk-bar' },
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-ghost pk-btn-sm',
            onClick: function () { setPhase(resultFrom === 'works' ? 'works' : 'editor') },
          }, resultFrom === 'works' ? '‹ 返回我的作品' : '‹ 返回大纲'),
          h('div', { className: 'pk-bar-txt' },
            h('div', { className: 'pk-eyebrow' }, 'XINGYAN PPT'),
            h('h1', { className: 'pk-title' }, '星彦 PPT'),
            h('p', { className: 'pk-sub' }, '成品预览')),
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-ghost',
            onClick: function () { window.open(IMG + 'deck?project=' + encodeURIComponent(result.project), '_blank') },
          }, '浏览器'),
          h('button', {
            type: 'button', className: 'pk-btn pk-btn-primary',
            onClick: function () { setExportOpen(true) },
          }, '导出')),
        h(ResultView, {
          project: result ? result.project : '',
          slides: built ? built.slides : (outline ? outline.slides : []),
          steps: result ? result.steps : null,
        }))

      const body = phase === 'works' ? worksPhase : phase === 'wall' ? wallPhase : phase === 'result' ? resultPhase : editorPhase

      return h('div', { className: 'pk-root' },
        h('style', null, CSS),
        h('div', { className: 'pk-wrap' },
          h('div', { className: 'pk-amb', 'aria-hidden': 'true' }, h('i'), h('i')),
          body),
        preview ? h(PreviewModal, { theme: preview, onClose: function () { setPreview(null) }, onUse: useTheme }) : null,
        exportOpen && outline
          ? h(ExportModal, {
              slides: built ? built.slides : outline.slides,
              project: result ? result.project : '',
              onClose: function () { if (!exporting) setExportOpen(false) },
              onExport: async function (indices, format) {
                // window.open 必须在用户手势的同一 tick 里调用，await 之后会被拦
                const popup = window.open('about:blank', '_blank')
                setExporting(true)
                try {
                  const payload = JSON.parse(JSON.stringify(outline))
                  payload.slides = payload.slides.map(function (slide) {
                    const clean = Object.assign({}, slide)
                    delete clean.comment
                    return clean
                  })
                  const data = await post('export', { outline: payload, indices: indices, format: format, project: result ? result.project : '' })
                  if (data.ok) {
                    setExportOpen(false)
                    const url = IMG + 'download?project=' + encodeURIComponent(data.project) + '&file=' + encodeURIComponent(data.file)
                    if (popup) popup.location.href = url
                    else window.open(url, '_blank')
                    notify('已生成 ' + format.toUpperCase() + ' · ' + Math.round(data.size / 1024) + 'KB · ' + data.pages + ' 页')
                  } else {
                    if (popup) popup.close()
                    notify('导出失败：' + (data.reason || '未知'))
                  }
                } catch (error) {
                  if (popup) popup.close()
                  notify('导出失败：' + String(error.message || error).slice(0, 40))
                } finally {
                  setExporting(false)
                }
              },
            })
          : null,
        h('div', { className: 'toast', 'data-on': toast ? '1' : '0', role: 'status' }, toast))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const registerLocale = (locale, dict) => ctx.effect(() => ctx.locale.register(NS, locale, dict))
        registerLocale('zh', { panel: '星彦 PPT' })
        registerLocale('en', { panel: 'Xingyan PPT' })
        const t = ctx.locale.bind(NS)

        function Page() { return h(Panel) }

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, Page))
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 2, label: () => t('panel') }, PanelIcon))
      },
    }
  },
})
