/**
 * 星彦 PPT · Host 半。
 *
 * 三条路由，挂在 dsh 自己的 webServer 上（相对路径，同源，不需要另开端口）：
 *   GET  /xingyan-pptx/themes    主题目录（21 套，含调色板）
 *   POST /xingyan-pptx/outline   需求 → 大纲（模型生成，失败回退到规则模板）
 *   POST /xingyan-pptx/build     大纲 → 按中性版式逐页出稿
 *
 * 出稿内核是外部 skill：scripts/ 下一串 Node 脚本。这里只负责按顺序调用、
 * 把 stderr 原样带回界面，方便定位。
 */
import { execFile } from 'node:child_process'
import { readFile, mkdir, writeFile, readdir, rename, rm } from 'node:fs/promises'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'

const run = promisify(execFile)
const NS = 'dsh-xingyan-pptx'
const sessionFor = () => `dsh-xingyan-pptx-${randomUUID()}`

const HERE = dirname(fileURLToPath(import.meta.url))

const DEFAULTS = {
  // 随包内置：vendor/xingyan-pptx/{skills,agent}
  skillDir: process.env.PPTX_SKILL_DIR || join(HERE, 'vendor', 'xingyan-pptx', 'skills', 'xingyan-pptx'),
  workDir: process.env.PPTX_WORK_DIR || join(homedir(), '.dsh', 'xingyan-pptx', 'decks'),
}

function json(res, status, value) {
  // 先序列化再写头：stringify 抛错时不能留下一个已经发了头、没有 body 的响应
  let body
  try {
    body = JSON.stringify(value === undefined ? { ok: false, reason: 'empty-result' } : value)
  } catch (error) {
    console.error('[xingyan-pptx] 响应序列化失败', error)
    body = JSON.stringify({ ok: false, reason: '响应序列化失败：' + String(error.message || error) })
  }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

const MAX_BODY = 8 * 1024 * 1024

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) {
      const error = new Error('请求体过大')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** 读主题目录：catalog.json 给清单，每张 card 给调色板。 */
async function loadThemes(skillDir) {
  const catalog = JSON.parse(await readFile(join(skillDir, 'themes', 'catalog.json'), 'utf8'))
  const names = await readdir(join(skillDir, 'themes', 'cards'))
  const cards = new Map()
  for (const file of names) {
    if (!file.endsWith('.json')) continue
    const card = JSON.parse(await readFile(join(skillDir, 'themes', 'cards', file), 'utf8'))
    cards.set(card.id, card)
  }

  // 真实素材在包的 agent/assets/templates/<id>/ 下：preview.webp 封面 + previews/ 页面截图
  const pkgRoot = resolve(skillDir, '..', '..')
  const assetBase = join(pkgRoot, 'agent', 'assets', 'templates')

  const themes = []
  for (const entry of catalog.cards) {
    const card = cards.get(entry.id) || {}
    const palette = card.palette || {}
    let cover = ''
    let pages = []
    try {
      const dir = join(assetBase, entry.id)
      const files = await readdir(dir)
      if (files.includes('preview.webp')) {
        cover = 'asset?p=' + encodeURIComponent('agent/assets/templates/' + entry.id + '/preview.webp')
      }
      const previewDir = join(dir, 'previews')
      const shots = (await readdir(previewDir)).filter(function (name) {
        return /^\d{2}-.*\.(jpg|png)$/.test(name)
      }).sort()
      pages = shots.map(function (name) {
        return 'asset?p=' + encodeURIComponent('agent/assets/templates/' + entry.id + '/previews/' + name)
      })
    } catch (error) {}
    themes.push({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      density: entry.density || card.density || 'standard',
      colors: {
        bg: palette.background || '#ffffff',
        text: palette.text || '#111111',
        accent: palette.accent || '#2a78d6',
        accent2: palette.accentSecondary || '#c9d6ee',
        rule: palette.rule || '#dddddd',
      },
      cover: cover,
      pages: pages,
      mood: card.mood || '',
    })
  }
  return themes
}

const MIME = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }

/** 把包里的素材发出去，路径限制在 skills/ 与 agent/ 两个目录内。 */
async function serveAsset(skillDir, relative, res) {
  const pkgRoot = resolve(skillDir, '..', '..')
  const clean = String(relative || '').replace(/^\.\//, '')
  if (!clean || clean.includes('..')) { res.writeHead(400); res.end(); return }
  const allowed = clean.startsWith('agent/assets/') || clean.startsWith('skills/')
  if (!allowed) { res.writeHead(403); res.end(); return }
  const file = join(pkgRoot, clean)
  try {
    const bytes = await readFile(file)
    const ext = clean.slice(clean.lastIndexOf('.'))
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' })
    res.end(bytes)
  } catch (error) {
    res.writeHead(404); res.end()
  }
}

/* ---------------- 大纲 ---------------- */

const OUTLINE_SYSTEM = `你是一名演示稿策划。根据用户给定的主题、场景、受众和页数，产出一份能通过 strict 校验的中文大纲。

只输出 JSON，不要解释，不要代码块。结构：
{
  "schemaVersion": 1,
  "revision": 1,
  "status": "confirmed",
  "source": "agent",
  "contract": {
    "projectName": "标题",
    "workMode": "create",
    "primaryLanguage": "zh-CN",
    "scene": "通用汇报",
    "audience": "管理层",
    "communicationIntent": "这次要说明什么",
    "audienceOutcome": "听完应该同意/知道什么",
    "coreMessage": "一句话核心结论",
    "deliveryContext": "现场讲",
    "artifactAfterlife": "会后留档",
    "pageBudget": "standard",
    "readingMode": "balanced",
    "densityDefault": "standard",
    "speakerNotes": false,
    "canvas": "16:9",
    "themeId": "由调用方填"
  },
  "slides": [
    { "id": "status-quo", "role": "content", "template": "cards-3", "title": "页标题",
      "coreMessage": "这一页的一句话结论",
      "points": ["要点一，写成完整判断", "要点二", "要点三"],
      "evidence": ["支撑这条判断的具体证据或数字"],
      "soWhat": "所以呢——这条证据意味着什么",
      "action": "所以下一步该做什么",
      "source": "数据来源与日期",
      "cards": [{ "title": "卡片标题", "body": "卡片正文，30–50 字" }] }
  ]
}

硬规则（违反会被校验器 BLOCK，必须遵守）：
1. slide 的 id 必须是 kebab-case：小写字母、数字、连字符。禁止 S01 / slide1。
2. role 只能取：cover / toc / section / hero / content / ending。最后一页必须是 ending。
3. 第一页必须是 cover，第二页必须是 toc，目录的 points 写 3–6 条本期章节名。
4. scene 只能取：通用汇报 / 竞品调研 / 销售汇报 / 客户方案 / 行业洞察 / 经营复盘 / 培训赋能 / 产品发布 / 客户案例。
5. pageBudget 只能取 compact / standard / detailed，不要写数字。
6. 每个 content 页写 2–5 条 points，每条 20–60 字；内容充实即可，不必凑字数。
7. hero / section 页建议也写 1–4 条 points。
8. cover 与 ending 页 points 可为空。
9. 尽量写具体（数字、对象、动作），避免“提高认识”“加强管理”这类空话。
10. **每页都要填 template，并按版式补齐对应结构（cards / metrics / table / compare / layers）。只写 points 的页面会大片留白。**
11. content 页必须写满四层：points（论点）、evidence（证据/数字）、soWhat（含义）、action（动作）。四层加起来 ≥180 字，少于 80 字会被校验器拦下。有数字必须写 source。
12. 一套 deck 至少用 3 种不同版式，连续两页不要用同一种。
`

/** 中性版式清单（presentation_core），喂给模型让它按版式产内容。 */
async function readTemplateMenu(skillDir) {
  try {
    const file = join(skillDir, 'runtime', 'engine', 'templates', 'layouts', 'layouts_index.json')
    const data = JSON.parse(await readFile(file, 'utf8'))
    const core = data.presentation_core || {}
    const types = core.page_types || []
    if (!types.length) return ''
    return [
      '可用版式（每页必须从下面选一个填进 slide.template）：',
      types.map(function (id) { return '- ' + id }).join('\n'),
      '',
      '版式与内容的对应：',
      '- three_card：填 slide.cards，2–3 条 {title, body}',
      '- kpi_dashboard：填 slide.metrics，3–4 条 {value, label, note}',
      '- table_summary：填 slide.table，{columns, rows}',
      '- comparison / two_content：填 slide.compare，{left, right}',
      '- process_timeline：填 slide.points（按步骤顺序）',
      '- data_story / chart_insight：填 slide.metrics 或 points + evidence',
      '- title_content / editorial_split：填 points + evidence + soWhat',
    ].join('\n')
  } catch (error) {
    return ''
  }
}

async function generateOutline(ctx, input, skillDir) {
  const llm = ctx.get && ctx.get('llm')
  const selection = ctx.get && ctx.get('agentDefaultModel')
  const route = selection && selection.currentSelection ? selection.currentSelection() : null
  if (!llm || !route || !route.provider || !route.model) {
    return { ok: false, reason: 'no-model', outline: ruleOutline(input) }
  }
  const brief = [
    '主题：' + (input.topic || '未填'),
    '场景：' + (input.scene || '通用汇报'),
    '受众：' + (input.audience || '管理层'),
    '页数：' + (input.pages || 12),
    '主题 id：' + (input.themeId || ''),
    input.attachmentNames && input.attachmentNames.length ? '已有素材：' + input.attachmentNames.join('、') : '',
    '需求描述：' + (input.requirement || ''),
  ].filter(Boolean).join('\n')

  const templateMenu = await readTemplateMenu(skillDir)
  const system = [OUTLINE_SYSTEM, templateMenu, input.requirement ? '用户补充需求：' + input.requirement : '']
    .filter(Boolean).join('\n\n')
  try {
    const call = await llm.prepareCall({ provider: route.provider, model: route.model, maxTokens: 12000 })
    let text = ''
    for await (const chunk of call.stream({
      ...call.config,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: brief }], source: { kind: 'user' } }],
      sessionId: input.sessionId || sessionFor(),
    })) {
      if (chunk.type === 'text-delta') text += chunk.text
      else if (chunk.type === 'finish' && chunk.reason && ['error', 'aborted'].includes(chunk.reason.kind)) {
        throw new Error((chunk.reason.failure && chunk.reason.failure.message) || '模型调用失败')
      }
    }
    const outline = extractJson(text)
    return { ok: true, outline, model: route.model }
  } catch (error) {
    return { ok: false, reason: String(error.message || error), outline: ruleOutline(input) }
  }
}

function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.search(/[{[]/)
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'))
  if (start < 0 || end < start) throw new Error('模型没有返回 JSON')
  return JSON.parse(body.slice(start, end + 1))
}

/** 模型不可用时的兜底：一份结构正确、内容平庸的大纲。 */
function ruleOutline(input) {
  const pages = Math.max(5, Math.min(24, Number(input.pages) || 10))
  const slides = [
    { id: 'cover', role: 'cover', title: input.topic || '未命名演示', coreMessage: input.topic || '', points: [] },
    { id: 'toc', role: 'toc', title: '目录', coreMessage: '本次汇报的结构', points: ['背景与目标', '方案与路径', '资源与节奏', '风险与下一步'] },
  ]
  for (let index = 3; index < pages; index += 1) {
    slides.push({
      id: 'part-' + index,
      role: index === Math.floor(pages / 2) ? 'section' : 'content',
      title: '待补充：第 ' + (index - 1) + ' 部分',
      coreMessage: '这一页的核心结论待补',
      points: [
        '这一页的论点待补，先写清楚要证明什么，再补证据',
        '证据待补：给出具体数字、对象和时间范围，并写下来源',
        '含义待补：这条证据对决策意味着什么，一句话说清',
      ],
      soWhat: '所以这一页想让人记住的结论是：先补齐材料再评审',
      action: '下一步：补齐数据后重新生成这一页',
    })
  }
  slides.push({ id: 'ending', role: 'ending', title: '下一步', coreMessage: '需要决策的事项', points: ['事项一', '事项二'] })
  return {
    contract: {
      projectName: input.topic || '未命名演示',
      scene: input.scene || '通用汇报',
      audience: input.audience || '管理层',
      coreMessage: input.topic || '',
      primaryLanguage: 'zh-CN',
      pageBudget: pages <= 8 ? 'compact' : pages <= 15 ? 'standard' : 'detailed',
      themeId: input.themeId || '',
      canvas: '16:9',
    },
    slides: slides.slice(0, pages),
  }
}

/* ---------------- 出稿 ---------------- */

async function step(skillDir, args, label) {
  try {
    const { stdout, stderr } = await run(process.execPath, args, { cwd: skillDir, timeout: 180000, maxBuffer: 8 * 1024 * 1024 })
    return { ok: true, label, out: (stdout || '').trim().slice(-1200), err: (stderr || '').trim().slice(-800) }
  } catch (error) {
    return { ok: false, label, out: (error.stdout || '').trim().slice(-1200), err: (error.stderr || error.message || '').trim().slice(-1200) }
  }
}

/**
 * 按 build-deck 的顺序自己串链，好把「底图重绘」插在 prepare 之后。
 * @param options.format - html | pptx
 */
/** 探测一个解释器能不能 import 指定的包。 */
async function probePy(bin, imports) {
  try {
    await run(bin, ['-c', 'import ' + imports.join(', ') + ';print(1)'], { timeout: 15000 })
    return true
  } catch (error) {
    return false
  }
}

let pythonCache = null

/**
 * 找出一个「build 能用」的解释器：PyYAML 是 apply_template 的硬依赖。
 * @returns {Promise<{ ok, path, missing, checked }>}
 */
async function detectPython(skillDir) {
  if (pythonCache) return pythonCache
  const home = homedir()
  const candidates = [
    process.env.PPTX_PYTHON,
    join(home, '.venv-pptx', 'bin', 'python'),
    join(home, '.venv-pptx', 'Scripts', 'python.exe'),
  ].filter(Boolean)

  // 再问 skill 自己的解析器（它会扫 dsh 托管运行时）
  try {
    const runtime = await import(pathToFileURL(join(skillDir, 'scripts', 'lib', 'python-runtime.mjs')).href)
    const found = runtime.resolvePython()
    if (found) candidates.push(found)
  } catch (error) {}
  candidates.push('python3', 'python')

  for (const bin of candidates) {
    if (bin.includes('/') && !existsSync(bin)) continue
    if (await probePy(bin, ['yaml'])) {
      const hasExport = await probePy(bin, ['yaml', 'pptx', 'PIL'])
      pythonCache = { ok: true, path: bin, exportOk: hasExport, missing: hasExport ? [] : ['python-pptx', 'Pillow'] }
      return pythonCache
    }
  }
  pythonCache = { ok: false, path: null, exportOk: false, missing: ['PyYAML'] }
  return pythonCache
}

/**
 * 按可靠性排序的 venv 底座候选。
 * 某些宿主自带的 Python 运行时是 hardened 签名，装 lxml/Pillow 这类二进制轮子会 dlopen 失败，
 * 所以排在最后；优先用 uv 管理的独立 CPython。
 */
function basePythonCandidates() {
  const home = homedir()
  const list = []
  if (process.env.PPTX_BASE_PYTHON) list.push(process.env.PPTX_BASE_PYTHON)

  // 现有 venv 的底座通常是最好的（它已经被验证能装二进制包）
  try {
    const cfg = readFileSync(join(home, '.venv-pptx', 'pyvenv.cfg'), 'utf8')
    const match = /^home\s*=\s*(.+)$/m.exec(cfg)
    if (match) list.push(join(match[1].trim(), 'python3'))
  } catch (error) {}

  const uvRoot = join(home, '.local', 'share', 'uv', 'python')
  try {
    for (const name of readdirSync(uvRoot)) {
      list.push(join(uvRoot, name, 'bin', 'python3'))
    }
  } catch (error) {}

  list.push(
    '/opt/homebrew/bin/python3.12',
    '/opt/homebrew/bin/python3.11',
    '/usr/local/bin/python3.12',
    '/usr/local/bin/python3.11',
    '/usr/bin/python3',
    'python3',
  )
  return list.filter(Boolean)
}

let bootstrapping = null

/**
 * 建 venv 并装依赖；一个底座装不上二进制轮子就换下一个。
 * @returns {{ ok, log, reason }}
 */
async function bootstrapPython() {
  if (bootstrapping) return bootstrapping
  const venvDir = process.env.PPTX_VENV_DIR || join(homedir(), '.venv-pptx')
  bootstrapping = (async function () {
    const log = []
    const pyPath = join(venvDir, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
    const pipPath = join(venvDir, process.platform === 'win32' ? 'Scripts/pip.exe' : 'bin/pip')

    for (const base of basePythonCandidates()) {
      if (base.includes('/') && !existsSync(base)) continue
      const version = await run(base, ['-c', 'import sys;print("%d.%d" % sys.version_info[:2]);'
        + 'raise SystemExit(0 if sys.version_info>=(3,10) else 1)'], { timeout: 12000 }).catch(function () { return null })
      if (!version) continue
      log.push('尝试底座：' + base + '（Python ' + String(version.stdout || '').trim() + '）')

      const made = await runIn(homedir(), base, ['-m', 'venv', '--clear', venvDir], 'venv')
      if (!made.ok) { log.push('  ✕ 创建 venv 失败'); continue }
      const installed = await runIn(homedir(), pipPath, [
        'install', '--disable-pip-version-check', '--quiet',
        'PyYAML>=6', 'python-pptx>=0.6.21', 'Pillow>=9',
      ], 'pip-install')
      if (!installed.ok) { log.push('  ✕ pip install 失败'); continue }
      if (await probePy(pyPath, ['yaml', 'pptx', 'PIL'])) {
        pythonCache = null
        log.push('  ✓ 依赖就绪')
        return { ok: true, log: log, reason: '', base: base }
      }
      log.push('  ✕ 装上了但导入失败（多半是底座签名限制），换下一个')
    }
    return { ok: false, log: log, reason: '所有底座都失败：没有可用的 Python 3.10+ 能装二进制依赖' }
  })()
  try {
    return await bootstrapping
  } finally {
    bootstrapping = null
  }
}

/** 找一个能把 HTML 打成 PDF 的浏览器。 *//** 找一个能把 HTML 打成 PDF 的浏览器。 */
function findChrome() {
  const list = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]
  for (const bin of list) if (existsSync(bin)) return bin
  return null
}

/** 环境体检：出稿前该有的东西都在不在。 */
async function doctor(skillDir, workDir) {
  const py = await detectPython(skillDir)
  const chrome = findChrome()
  return {
    ok: true,
    skill: { ok: existsSync(join(skillDir, 'themes', 'catalog.json')), dir: skillDir },
    python: py,
    pdf: { ok: Boolean(chrome), path: chrome },
    workDir: workDir,
  }
}

/** 指定工作目录跑一条命令（Python 脚本要自己的 cwd）。 */
async function runIn(cwd, command, args, label) {
  try {
    const { stdout, stderr } = await run(command, args, { cwd: cwd, timeout: 180000, maxBuffer: 8 * 1024 * 1024 })
    return { ok: true, label: label, out: (stdout || '').trim().slice(-800), err: (stderr || '').trim().slice(-400) }
  } catch (error) {
    return { ok: false, label: label, out: (error.stdout || '').trim().slice(-800), err: (error.stderr || error.message || '').trim().slice(-800) }
  }
}

async function buildDeck(ctx, skillDir, workDir, body) {
  const project = join(workDir, 'deck-' + Date.now() + '-' + randomUUID().slice(0, 8))
  await mkdir(project, { recursive: true })
  const outline = body.outline || {}
  const title = (outline.contract && outline.contract.projectName) || 'Deck'
  const py = await detectPython(skillDir)
  const python = py.path || 'python3'
  const engine = join(skillDir, 'runtime', 'engine', 'scripts')
  const steps = []

  const init = await step(skillDir, [join(skillDir, 'scripts/init-project.mjs'), project, '--name', title], 'init-project')
  steps.push(init)
  if (!init.ok) return { ok: false, failedAt: 'init-project', steps: steps }
  await writeFile(join(project, 'outline.json'), JSON.stringify(outline, null, 2) + '\n')

  // 装中性版式（presentation_core，20 类，无品牌）
  const install = await runIn(engine, python, [
    join(engine, 'apply_template.py'), project,
    '--root', join(skillDir, 'runtime', 'engine', 'templates', 'layouts', 'presentation_core'),
  ], 'apply-template')
  steps.push(install)
  if (!install.ok) return { ok: false, failedAt: 'apply-template', steps: steps }

  // 主题
  let colors = { bg: '#ffffff', text: '#16181c', accent: '#2a78d6' }
  const themeId = outline.contract && outline.contract.themeId
  if (themeId) {
    try {
      const card = JSON.parse(await readFile(join(skillDir, 'themes', 'cards', themeId + '.json'), 'utf8'))
      const palette = card.palette || {}
      colors = {
        bg: palette.background || colors.bg,
        text: palette.text || colors.text,
        accent: palette.accent || colors.accent,
      }
    } catch (error) {}
  }

  // 逐页生成：模型按版式画 SVG，失败的页退回模板填槽
  try {
    const built = await authorPages(ctx, project, outline, colors, null, { sessionId: sessionFor() })
    steps.push({
      ok: built.pages > 0,
      label: 'draw-pages',
      out: built.pages + ' 页 · 模型画 ' + built.authored + ' 页 · 兜底 ' + built.fallback + ' 页' + (built.errors.length ? '（' + built.errors[0] + '）' : ''),
      err: '',
    })
    if (!built.pages) return { ok: false, failedAt: 'draw-pages', steps: steps }
  } catch (error) {
    steps.push({ ok: false, label: 'draw-pages', out: '', err: String(error.message || error) })
    return { ok: false, failedAt: 'draw-pages', steps: steps }
  }

  const fin = await runIn(join(skillDir, 'runtime', 'engine', 'scripts'), python, [
    join(skillDir, 'runtime', 'engine', 'scripts', 'finalize_svg.py'), project,
  ], 'finalize-svg')
  steps.push(fin)
  if (!fin.ok) return { ok: false, failedAt: 'finalize-svg', project: project, steps: steps }

  const html = await step(skillDir, [join(skillDir, 'scripts', 'svg-deck-to-html.mjs'), project], 'html-export')
  steps.push(html)
  if (!html.ok) return { ok: false, failedAt: 'html-export', project: project, steps: steps }

  const files = await readdir(join(project, 'exports')).catch(function () { return [] })
  const pick = files.filter(function (name) { return /\.html$/.test(name) }).sort().pop()
  return { ok: Boolean(pick), project: project, html: pick ? join(project, 'exports', pick) : null, steps: steps, failedAt: pick ? null : 'html-export' }
}

/** 导出：筛页 → 走中性链路出稿 → 按格式转产物。 */
async function exportDeck(ctx, skillDir, workDir, body) {
  const format = body.format === 'pptx' ? 'pptx' : body.format === 'pdf' ? 'pdf' : 'html'
  const steps = []
  const scope = insideWorkDir(workDir, body.project)
  const project = scope ? scope.full : null
  if (!project || !existsSync(project)) {
    return { ok: false, reason: '找不到已生成的项目，请先点「确认并生成」' }
  }

  // 选页导出：不重建项目，只把未选中的页临时挪走，导完再放回。
  const indices = Array.isArray(body.indices) ? body.indices : []
  const all = (body.outline && body.outline.slides) || []
  const partial = indices.length > 0 && indices.length < all.length
  const stashDir = join(project, '.stash-' + Date.now())
  const stashed = []

  if (partial) {
    const wanted = new Set(indices)
    for (const dirName of ['svg_output', 'svg_final']) {
      const dir = join(project, dirName)
      const files = await readdir(dir).catch(function () { return [] })
      for (const name of files) {
        const match = /^P(\d+)\.svg$/.exec(name)
        if (!match) continue
        if (wanted.has(Number(match[1]) - 1)) continue
        await mkdir(join(stashDir, dirName), { recursive: true })
        await rename(join(dir, name), join(stashDir, dirName, name))
        stashed.push({ dirName, name })
      }
    }
    if (!stashed.length && all.length) { /* 全选等同整份 */ }
    steps.push({ ok: true, label: 'pick-pages', out: '保留 ' + (all.length - stashed.length) + ' 页', err: '' })
  }

  const exportsDir = join(project, 'exports')
  // 没传大纲时按项目里实际页数算，别报 0
  if (!all.length) {
    const pages = await readdir(join(project, 'svg_output')).catch(function () { return [] })
    all.length = pages.filter(function (name) { return /^P\d+\.svg$/.test(name) }).length
  }

  const restore = async function () {
    for (const item of stashed) {
      await mkdir(join(project, item.dirName), { recursive: true })
      await rename(join(stashDir, item.dirName, item.name), join(project, item.dirName, item.name)).catch(function () {})
    }
    if (stashed.length) await rm(stashDir, { recursive: true, force: true }).catch(function () {})
  }

  try {
    if (format === 'html' || format === 'pdf') {
      // 页集合变了就重新生成 HTML，否则 PDF 会是旧的全量稿
      const made = await step(skillDir, [join(skillDir, 'scripts', 'svg-deck-to-html.mjs'), project], 'html-export')
      steps.push(made)
      if (!made.ok) return { ok: false, reason: 'HTML 生成失败', steps: steps }
    }

    if (format === 'pptx') {
      const py2 = await detectPython(skillDir)
      const python = py2.path || 'python3'
      const name = 'deck-' + Date.now() + '.pptx'
      const out = join(exportsDir, name)
      const made = await step(skillDir, [
        join(skillDir, 'scripts', 'pptx-export.mjs'), project, '--python', python, '--out', out,
      ], 'pptx-export')
      steps.push(made)
      if (!made.ok) return { ok: false, reason: 'PPTX 导出失败：' + String(made.err || '').split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 160), steps: steps }
      return { ok: true, project: project, file: name, format: 'pptx', pages: partial ? indices.length : all.length, size: (await readFile(out)).length, steps: steps }
    }

    const files = await readdir(exportsDir).catch(function () { return [] })
    const pick = files.filter(function (x) { return /\.html$/.test(x) }).sort().pop()
    if (!pick) return { ok: false, reason: '没有 HTML 产物', steps: steps }
    if (format === 'html') {
      return { ok: true, project: project, file: pick, format: 'html', pages: partial ? indices.length : all.length, size: (await readFile(join(exportsDir, pick))).length, steps: steps }
    }

    const pdfName = 'deck-' + Date.now() + '.pdf'
    const made = await htmlToPdf(join(exportsDir, pick), join(exportsDir, pdfName))
    steps.push({ ok: made.ok, label: 'pdf-export', out: made.ok ? '已生成 PDF' : '', err: made.ok ? '' : made.reason })
    if (!made.ok) return { ok: false, reason: 'PDF 生成失败：' + made.reason, steps: steps }
    return { ok: true, project: project, file: pdfName, format: 'pdf', pages: partial ? indices.length : all.length, size: (await readFile(join(exportsDir, pdfName))).length, steps: steps }
  } finally {
    await restore()
  }
}

/** 用本机 Chrome 无头模式把导出的 HTML 打成 PDF。 */
async function htmlToPdf(htmlPath, pdfPath) {
  const chrome = findChrome()
  if (!chrome) return { ok: false, reason: '没有找到 Chrome / Edge，无法生成 PDF' }
  try {
    await run(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
      '--print-to-pdf=' + pdfPath, pathToFileURL(htmlPath).href,
    ], { timeout: 120000, maxBuffer: 4 * 1024 * 1024 })
    await readFile(pdfPath)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: String(error.message || error).slice(0, 200) }
  }
}

/** 把外部传来的项目路径收敛成 workDir 下的相对路径；不合法返回 null。 */
function insideWorkDir(workDir, project) {
  const raw = String(project || '').trim()
  if (!raw) return null
  const normalized = raw.startsWith(workDir) ? raw.slice(workDir.length) : raw
  const relative = normalized.replace(/^\/+/, '')
  if (!relative || relative.includes('..')) return null
  const full = join(workDir, relative)
  return full.startsWith(workDir) ? { relative, full } : null
}

/** 单页预览：把 svg_final 里的某页当图片发出去，导出弹窗用。 */
async function serveSlide(workDir, project, n, res) {
  const target = insideWorkDir(workDir, project)
  const num = String(Number(n) || 0)
  if (!target || !/^\d+$/.test(num) || Number(num) < 1) {
    res.writeHead(400); res.end(); return
  }
  const relative = target.relative
  const name = 'P' + num.padStart(2, '0') + '.svg'
  for (const dir of ['svg_final', 'svg_output']) {
    try {
      const bytes = await readFile(join(workDir, relative, dir, name))
      res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' })
      res.end(bytes)
      return
    } catch (error) {}
  }
  res.writeHead(404); res.end()
}

/** 下载：只允许 workDir 下的产物。 */
async function serveDownload(workDir, project, file, res) {
  const target = insideWorkDir(workDir, project)
  if (!target || String(file).includes('..')) {
    res.writeHead(400); res.end(); return
  }
  const relative = target.relative
  const filePath = join(workDir, relative, 'exports', file)
  try {
    const bytes = await readFile(filePath)
    const ext = String(file).slice(String(file).lastIndexOf('.'))
    const type = ext === '.pptx'
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : ext === '.pdf' ? 'application/pdf' : 'text/html; charset=utf-8'
    res.writeHead(200, {
      'content-type': type,
      'content-disposition': 'attachment; filename="' + encodeURIComponent(file) + '"',
      'cache-control': 'no-store',
    })
    res.end(bytes)
  } catch (error) {
    res.writeHead(404); res.end()
  }
}

/* ---------------- 中性版式渲染（无品牌） ---------------- */

const LAYOUT_BY_ROLE = {
  cover: '01_title_slide',
  toc: '02_title_content',
  section: '03_section_header',
  hero: '10_hero_statement',
  content: '02_title_content',
  ending: '10_hero_statement',
}

const LAYOUT_ALIAS = {
  'title_slide': '01_title_slide',
  'title_content': '02_title_content',
  'section_header': '03_section_header',
  'two_content': '04_two_content',
  'comparison': '05_comparison',
  'title_only': '06_title_only',
  'hero_statement': '10_hero_statement',
  'editorial_split': '11_editorial_split',
  'cards-3': '12_three_card',
  'three_card': '12_three_card',
  'metrics-4': '13_kpi_dashboard',
  'kpi_dashboard': '13_kpi_dashboard',
  'process_timeline': '14_process_timeline',
  'data_story': '15_data_story',
  'table_summary': '20_table_summary',
  'blank': '07_blank',
  'content_caption': '08_content_caption',
  'picture_caption': '09_picture_caption',
  'title_picture': '16_title_picture',
  'two_picture_caption': '17_two_picture_caption',
  'screenshot_focus': '18_screenshot_focus',
  'chart_insight': '19_chart_insight',
}

function mixHex(a, b, t) {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const out = [0, 1, 2].map(function (i) { return Math.round(pa[i] + (pb[i] - pa[i]) * t) })
  return '#' + out.map(function (n) { return n.toString(16).padStart(2, '0') }).join('')
}

function paletteFor(theme) {
  const bg = theme.bg
  const text = theme.text
  return {
    '#FFFFFF': bg,
    '#F8FAFC': mixHex(bg, text, 0.04),
    '#F4F6F8': mixHex(bg, text, 0.06),
    '#EEF2F6': mixHex(bg, text, 0.08),
    '#E2E8F0': mixHex(bg, text, 0.16),
    '#D6DCE3': mixHex(bg, text, 0.2),
    '#CBD5E1': mixHex(bg, text, 0.26),
    '#1E293B': text,
    '#334155': mixHex(text, bg, 0.18),
    '#475569': mixHex(text, bg, 0.32),
    '#64748B': mixHex(text, bg, 0.45),
    '#94A3B8': mixHex(text, bg, 0.62),
  }
}

/** SVG 文本转义：模型或用户写的 & < > 会破坏 XML，必须先转义。 */
function xmlEscape(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function clip(text, max) {
  const value = String(text == null ? '' : text).trim()
  return value.length > max ? value.slice(0, max - 1) + '…' : value
}

/** 把一节的内容摊成模板 token。 */
function tokensFor(slide, theme) {
  const points = (slide.points || []).slice(0, 4)
  const cards = slide.cards || []
  const metrics = slide.metrics || []
  const compare = slide.compare || {}
  const tokens = {
    TITLE: clip(slide.title, 30),
    SUBTITLE: clip(slide.coreMessage, 40),
    PAGE_TITLE: clip(slide.title, 34),
    KEY_MESSAGE: clip(slide.coreMessage || slide.soWhat, 60),
    CONTENT_AREA: [
      points.map(function (point) { return '· ' + point }).join('\n'),
      slide.evidence ? '证据：' + (Array.isArray(slide.evidence) ? slide.evidence.join('；') : slide.evidence) : '',
      slide.soWhat ? '含义：' + slide.soWhat : '',
      slide.action ? '动作：' + slide.action : '',
    ].filter(Boolean).join('\n'),
    SOURCE: clip(slide.source || '', 40),
    CAPTION: clip(slide.coreMessage, 40),
    CHAPTER_TITLE: clip(slide.title, 24),
    CHAPTER_DESC: clip(slide.coreMessage || slide.soWhat, 50),
    BODY_TEXT: clip(points.join('\n'), 200),
    ANNOTATION: clip(slide.coreMessage, 60),
  }
  for (let i = 0; i < 3; i += 1) {
    const card = cards[i]
    tokens['CARD_' + (i + 1)] = clip(card ? (card.title || '') + '\n' + (card.body || '') : '', 60)
  }
  for (let i = 0; i < 4; i += 1) {
    const metric = metrics[i]
    tokens['KPI_' + (i + 1)] = clip(metric ? (metric.value || '') + ' ' + (metric.label || '') : '', 24)
    tokens['STEP_' + (i + 1)] = clip(points[i] || '', 40)
  }
  tokens.LEFT_TITLE = clip(compare.left ? compare.left.title : '', 20)
  tokens.LEFT_CONTENT = clip(compare.left ? (compare.left.points || []).join(' · ') : '', 70)
  tokens.LEFT_CAPTION = clip(compare.left ? compare.left.caption || '' : '', 30)
  tokens.RIGHT_TITLE = clip(compare.right ? compare.right.title : '', 20)
  tokens.RIGHT_CONTENT = clip(compare.right ? (compare.right.points || []).join(' · ') : '', 70)
  tokens.RIGHT_CAPTION = clip(compare.right ? compare.right.caption || '' : '', 30)
  return tokens
}

/** 把过长的 <text> 拆成多个 tspan，按字号估算每行字数。 */
function wrapText(svg) {
  const escape = function (text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  return svg.replace(/<text([^>]*)>([^<]{24,})<\/text>/g, function (all, attrs, content) {
    const size = Number((/font-size="([\d.]+)"/.exec(attrs) || [])[1] || 16)
    const x = (/ x="([\d.]+)"/.exec(attrs) || [])[1] || '64'
    const y = Number((/ y="([\d.]+)"/.exec(attrs) || [])[1] || 100)
    const perLine = Math.max(10, Math.floor(1080 / (size * 1.02)))
    const lines = []
    content.split('\n').forEach(function (segment) {
      if (segment.length <= perLine) { lines.push(segment); return }
      for (let i = 0; i < segment.length; i += perLine) lines.push(segment.slice(i, i + perLine))
    })
    if (lines.length <= 1) return all
    const lineHeight = Math.round(size * 1.6)
    const spans = lines.map(function (line, index) {
      return '<tspan x="' + x + '" y="' + (y + index * lineHeight) + '">' + escape(line) + '</tspan>'
    }).join('')
    return '<text' + attrs + '>' + spans + '</text>'
  })
}

/* ---------------- 逐页生成（模型画页） ---------------- */

const PAGE_SYSTEM = `你是演示稿页面作者。根据给定的版式约束和内容，输出**一个完整的 SVG 文档**。

硬性要求：
1. 只输出 SVG，从 <svg 开始到 </svg> 结束，不要 markdown 代码块，不要解释。
2. 根节点必须是 <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">。
3. 你的内容必须落在版式给出的区域内，不要越界，不要压边。
4. 文字必须手动折行：每行用 <tspan x="…" y="…">，一行不超过区域宽度对应的字数（中文按 1 字宽 ≈ 字号）。
5. 只用给定的调色板，不要引入别的颜色。
6. 中文字体统一用 font-family="PingFang SC, Microsoft YaHei, sans-serif"。
7. 版面要有层次：标题、正文、强调数字用不同字号；不要把所有字堆成一段。
8. 不要写 <foreignObject>、<script>、<image>，纯矢量。
9. 页面上不要出现「第 X / Y 页」「页码」「版式」「本页」这类制作说明，只写观众该看到的内容。`

/** 从版式 SVG 里抽出可用的内容区域，给模型当约束。 */
function layoutBrief(svg) {
  const rows = []
  const re = /data-pptx-placeholder="([^"]+)"[^>]*data-pptx-bounds="([^"]+)"/g
  let match = re.exec(svg)
  while (match) {
    rows.push('- ' + match[1] + '：区域 x,y,w,h = ' + match[2])
    match = re.exec(svg)
  }
  return rows.join('\n')
}

/** 一页的模型输入。 */
function pagePrompt(slide, brief, colors, index, total) {
  const points = slide.points || []
  const evidence = Array.isArray(slide.evidence) ? slide.evidence.join('；') : (slide.evidence || '')
  const lines = [
    '版式区域：',
    brief,
    '',
    '调色板：背景 ' + colors.bg + '，正文 ' + colors.text + '，强调 ' + colors.accent,
    '',
    '内容：',
    '标题：' + (slide.title || ''),
    '一句话结论：' + (slide.coreMessage || ''),
    points.length ? '要点：\n' + points.map(function (p) { return '  · ' + p }).join('\n') : '',
    evidence ? '证据：' + evidence : '',
    slide.soWhat ? '含义：' + slide.soWhat : '',
    slide.action ? '动作：' + slide.action : '',
    slide.cards && slide.cards.length
      ? '卡片：\n' + slide.cards.map(function (c) { return '  · ' + (c.title || '') + ' — ' + (c.body || '') }).join('\n')
      : '',
    slide.metrics && slide.metrics.length
      ? '指标：\n' + slide.metrics.map(function (m) { return '  · ' + (m.value || '') + ' ' + (m.label || '') }).join('\n')
      : '',
    '',
    '现在输出这一页的 SVG。',
  ]
  return lines.filter(function (line) { return line !== '' }).join('\n')
}

/** 轻量 XML 良构检查：标签必须正确闭合，否则 finalize 会整份失败。 */
function wellFormed(svg) {
  const cleaned = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
  const tagRe = /<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  const stack = []
  let match = tagRe.exec(cleaned)
  while (match) {
    const closing = match[1] === '/'
    const name = match[2].toLowerCase()
    const selfClosing = match[4] === '/'
    if (closing) {
      if (stack.pop() !== name) return false
    } else if (!selfClosing) {
      stack.push(name)
    }
    match = tagRe.exec(cleaned)
  }
  return stack.length === 0
}

/** 校验模型给的 SVG 能不能用。 */
function validSvg(text) {
  if (!text) return null
  const body = String(text).replace(/^```(?:svg)?/m, '').replace(/```$/m, '').trim()
  const start = body.indexOf('<svg')
  const end = body.lastIndexOf('</svg>')
  if (start < 0 || end < start) return null
  const svg = body.slice(start, end + 6)
  if (svg.indexOf('width="1280"') < 0 || svg.indexOf('height="720"') < 0) return null
  if (svg.indexOf('<script') >= 0 || svg.indexOf('<foreignObject') >= 0) return null
  if (!wellFormed(svg)) return null
  return svg
}

async function callPageModel(ctx, system, user, sessionId) {
  const llm = ctx.get && ctx.get('llm')
  const selection = ctx.get && ctx.get('agentDefaultModel')
  const route = selection && selection.currentSelection ? selection.currentSelection() : null
  if (!llm || !route || !route.provider) throw new Error('没有可用模型')
  const call = await llm.prepareCall({ provider: route.provider, model: route.model, maxTokens: 6000 })
  let text = ''
  for await (const chunk of call.stream({
    ...call.config,
    system: system,
    messages: [{ role: 'user', content: [{ type: 'text', text: user }], source: { kind: 'user' } }],
    sessionId: sessionId || sessionFor(),
  })) {
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'finish' && chunk.reason && ['error', 'aborted'].includes(chunk.reason.kind)) {
      throw new Error('模型调用失败')
    }
  }
  return text
}

/**
 * 逐页生成：模型按版式写 SVG，失败就退回模板填槽。
 * @returns { pages, authored, fallback }
 */
async function authorPages(ctx, project, outline, colors, onProgress, options) {
  const tplDir = join(project, 'templates')
  const outDir = join(project, 'svg_output')
  await mkdir(outDir, { recursive: true })
  const available = await readdir(tplDir)
  const slides = outline.slides || []
  let authored = 0
  let fallback = 0
  const errors = []

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const byShape = slide.cards && slide.cards.length ? '12_three_card'
      : slide.metrics && slide.metrics.length ? '13_kpi_dashboard'
      : slide.compare ? '05_comparison'
      : null
    const wanted = LAYOUT_ALIAS[slide.template] || byShape || LAYOUT_BY_ROLE[slide.role] || '02_title_content'
    const file = available.includes(wanted + '.svg')
      ? wanted + '.svg'
      : available.filter(function (name) { return /^\d\d_.*\.svg$/.test(name) })[0]
    if (!file) continue

    const layoutSvg = await readFile(join(tplDir, file), 'utf8')
    let svg = null
    try {
      onProgress && onProgress(index, slides.length, 'drawing')
      const text = await callPageModel(ctx, PAGE_SYSTEM, pagePrompt(slide, layoutBrief(layoutSvg), colors, index, slides.length), options.sessionId)
      svg = validSvg(text)
      if (svg) authored += 1
      else errors.push('P' + (index + 1) + ' 返回的不是合法 SVG')
    } catch (error) {
      errors.push('P' + (index + 1) + ' ' + String(error.message || error).slice(0, 80))
    }
    if (!svg) {
      svg = fillOne(layoutSvg, slide, colors)
      fallback += 1
    }
    await writeFile(join(outDir, 'P' + String(index + 1).padStart(2, '0') + '.svg'), svg)
  }
  return { pages: slides.length, authored: authored, fallback: fallback, errors: errors.slice(0, 5) }
}

/** 模板填槽（模型不可用时的兜底）。 */
function fillOne(layoutSvg, slide, colors) {
  const palette = paletteFor(colors)
  const tokens = tokensFor(slide, colors)
  let svg = layoutSvg.replace(/\{\{([A-Z_0-9]+)\}\}/g, function (all, key) {
    return tokens[key] !== undefined ? xmlEscape(tokens[key]) : ''
  })
  for (const from of Object.keys(palette)) {
    svg = svg.split(from).join(palette[from])
    svg = svg.split(from.toLowerCase()).join(palette[from])
  }
  svg = wrapText(svg)
  return svg.replace('</svg>', '<rect x="64" y="132" width="72" height="6" rx="3" fill="' + colors.accent + '"/>\n</svg>')
}

/* ---------------- 品牌底图重绘 ---------------- */

function hexToRgb(hex) {
  const text = String(hex || '').replace('#', '')
  if (text.length !== 6) return [40, 44, 52]
  return [parseInt(text.slice(0, 2), 16), parseInt(text.slice(2, 4), 16), parseInt(text.slice(4, 6), 16)]
}

/** 把生成的 HTML 通过本机端口发出去，界面里用 iframe 预览。 */
async function serveDeck(workDir, project, res) {
  const target = insideWorkDir(workDir, project)
  if (!target) {
    res.writeHead(400); res.end('bad project'); return
  }
  const relative = target.relative
  const dir = join(workDir, relative, 'exports')
  const files = await readdir(dir).catch(function () { return [] })
  const pick = files.filter((name) => name.endsWith('.html')).sort().pop()
  if (!pick) { res.writeHead(404); res.end('no deck'); return }
  let html = await readFile(join(dir, pick), 'utf8').catch(function () { return null })
  if (html === null) { res.writeHead(404); res.end('no deck'); return }
  // 注入一个翻页桥：外层的缩略图条通过 postMessage 控制当前页。
  const bridge = '<script>(function(){addEventListener("message",function(e){var d=e.data||{};'
    + 'if(typeof d.__deckPage!=="number")return;'
    + 'var slides=document.querySelectorAll(".slide").length;'
    + 'var counter=document.getElementById("counter");'
    + 'var cur=counter?parseInt((counter.textContent||"1").split("/")[0].trim(),10)||1:1;'
    + 'var target=Math.min(slides,Math.max(1,d.__deckPage));'
    + 'var delta=target-cur;if(!delta)return;'
    + 'var btn=document.getElementById(delta>0?"next":"prev");if(!btn)return;'
    + 'for(var i=0;i<Math.abs(delta);i++)btn.click();});})();<\/script>'
  html = html.includes('</body>') ? html.replace('</body>', bridge + '</body>') : html + bridge
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  res.end(html)
}

/* ---------------- 插件 ---------------- */

export default {
  name: NS,
  inject: [],
  apply(ctx, config) {
    const settings = config || {}
    const skillDir = settings.skillDir || DEFAULTS.skillDir
    const workDir = settings.workDir || DEFAULTS.workDir

    // 桌面端渲染进程是 file://，IPC 桥只认 /api 精确路由，webServer 的 prefix 到不了这里。
    // 所以自建一个只绑 127.0.0.1 的小服务；端口被占时自动后移，客户端会探测。
    const server = createServer(async (req, res) => {
      const origin = req.headers.origin
      const isRemoteWeb = typeof origin === 'string' && /^https?:\/\//i.test(origin)
      const isLocalWeb = typeof origin === 'string' && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)
      if (isRemoteWeb && !isLocalWeb) { res.writeHead(403); res.end(); return }
      res.setHeader('access-control-allow-origin', origin || '*')
      res.setHeader('vary', 'Origin')
      res.setHeader('access-control-allow-headers', 'content-type')
      req.on('error', function () {})
      res.on('error', function () {})
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

      try {
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        const path = url.pathname.replace(/^\/xingyan-pptx/, '')
        const base = 'http://127.0.0.1:' + currentPort + '/xingyan-pptx/'
        try {
          await mkdir(workDir, { recursive: true })
          await writeFile(join(workDir, '.requests.log'), new Date().toISOString() + ' ' + req.method + ' ' + path + '\n', { flag: 'a' })
        } catch (error) {}

        if (path === '/doctor' && req.method === 'GET') {
          return json(res, 200, await doctor(skillDir, workDir))
        }
        if (path === '/bootstrap-python' && req.method === 'POST') {
          return json(res, 200, await bootstrapPython())
        }
        if (path === '/clientlog' && req.method === 'POST') {
          try {
            const body = await readBody(req)
            await mkdir(workDir, { recursive: true })
            await writeFile(join(workDir, '.client.log'),
              new Date().toISOString() + ' ' + JSON.stringify(body) + '\n', { flag: 'a' })
          } catch (error) {}
          return json(res, 200, { ok: true })
        }
        if (path === '/themes' && req.method === 'GET') {
          try {
            const themes = await loadThemes(skillDir)
            return json(res, 200, { ok: true, themes, skillDir, base })
          } catch (error) {
            return json(res, 200, { ok: false, themes: [], base, reason: '读不到主题目录：' + String(error.message || error) })
          }
        }
        if (path === '/outline' && req.method === 'POST') {
          return json(res, 200, await generateOutline(ctx, await readBody(req), skillDir))
        }
        if (path === '/build' && req.method === 'POST') {
          await mkdir(workDir, { recursive: true })
          const body = await readBody(req)
          await writeFile(join(workDir, '.requests.log'), '  build start, slides=' + ((body.outline && body.outline.slides || []).length) + '\n', { flag: 'a' })
          const result = await buildDeck(ctx, skillDir, workDir, body)
          await writeFile(join(workDir, '.requests.log'), '  build done ok=' + result.ok + '\n', { flag: 'a' })
          return json(res, 200, result)
        }
        if (path === '/export' && req.method === 'POST') {
          return json(res, 200, await exportDeck(ctx, skillDir, workDir, await readBody(req)))
        }
        if (path === '/deck' && req.method === 'GET') {
          return await serveDeck(workDir, url.searchParams.get('project'), res)
        }
        if (path === '/slide' && req.method === 'GET') {
          return await serveSlide(workDir, url.searchParams.get('project'), url.searchParams.get('n'), res)
        }
        if (path === '/download' && req.method === 'GET') {
          return await serveDownload(workDir, url.searchParams.get('project'), url.searchParams.get('file'), res)
        }
        if (path === '/asset' && req.method === 'GET') {
          return await serveAsset(skillDir, url.searchParams.get('p'), res)
        }
        return json(res, 404, { ok: false, reason: 'not-found' })
      } catch (error) {
        try {
          await writeFile(join(workDir, '.requests.log'), '  CAUGHT: ' + String(error && error.stack || error).slice(0, 400) + '\n', { flag: 'a' })
        } catch (ignored) {}
        if (res.headersSent || res.writableEnded || req.destroyed) { try { res.end() } catch (ignored) {} return }
        return json(res, 200, { ok: false, reason: String(error.message || error) })
      }
    })

    let currentPort = 0
    const preferred = Number(process.env.PPTX_DESK_PORT || 35124)
    const startPort = Number.isInteger(preferred) && preferred > 1024 && preferred < 65535 ? preferred : 35124
    let attempt = 0

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempt < 9) {
        attempt += 1
        setTimeout(function () {
          try { server.listen(startPort + attempt, '127.0.0.1') } catch (listenError) {
            console.error('[xingyan-pptx] 重试端口失败：' + listenError.message)
          }
        }, 120)
        return
      }
      console.error('[xingyan-pptx] 本地接口起不来（' + error.code + '）：' + error.message)
    })
    server.on('listening', () => {
      currentPort = startPort + attempt
      console.log('[xingyan-pptx] 本地接口 http://127.0.0.1:' + currentPort + '/xingyan-pptx/themes')
    })

    ctx.effect(() => () => {
      try {
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections()
        server.close()
      } catch (error) {}
    })
    try {
      server.listen(startPort, '127.0.0.1')
    } catch (error) {
      console.error('[xingyan-pptx] 端口起不来', error)
    }
  },
}
