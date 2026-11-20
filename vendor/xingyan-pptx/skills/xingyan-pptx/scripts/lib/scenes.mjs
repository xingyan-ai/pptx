/**
 * Product-level scene presets.
 *
 * A scene is a set of defaults for the engine's communication contract, not a
 * classifier and not a lock. It fills `communication_intent`,
 * `delivery_context`, `artifact_afterlife`, `readingMode` and a recommended
 * `mode`; the agent may override any of them after reading the actual source.
 *
 * Theme candidates are recommendations for the product layer. They are not
 * part of the engine's contract and never change mode or reading mode.
 */

export const SCENE_DEFAULTS = {
  '通用汇报': {
    intent: '同步结论、进展和下一步；需要时提出决策请求。',
    audience: '管理层 / 业务负责人',
    outcome: '听众知道结论、依据和下一步；需要时做出决定。',
    delivery: '现场主讲 + 会后传阅',
    afterlife: '审批 / 归档',
    readingMode: 'balanced',
    readingModeNote: '现场讲用 balanced；会后只读或留档改 text。',
    mode: 'briefing',
    modeNote: '纯同步用 briefing；要推动决策用 pyramid。',
    themes: ['financial-bluegreen-modern', 'global-capital-data-journalism', 'scientific-atlas'],
    pageRange: [8, 12],
  },
  '竞品调研': {
    intent: '说明竞争格局、关键差异、对手打法和我方机会。',
    audience: '产品、市场、销售负责人',
    outcome: '读者理解竞争格局、关键差异和可进入的机会。',
    delivery: '读者主导，会后细读',
    afterlife: '参考 / 归档',
    readingMode: 'text',
    readingModeNote: '需要现场讲解时改 balanced。',
    mode: 'pyramid',
    modeNote: '只做资料对比、不给判断时用 briefing。',
    themes: ['global-capital-data-journalism', 'scientific-atlas', 'brutalist-acid', 'memphis-motion'],
    pageRange: [12, 20],
  },
  '销售汇报': {
    intent: '复盘目标与实际、赢单/丢单原因、预测和下一步资源。',
    audience: '销售管理层',
    outcome: '管理层理解差距原因，并对下一步资源和动作做出安排。',
    delivery: '销售会现场主讲 + 会后审批材料',
    afterlife: '审批 / 归档',
    readingMode: 'text',
    readingModeNote: '只现场讲、不传阅时改 balanced。',
    mode: 'pyramid',
    modeNote: '只同步管线状态、不做资源决策时用 briefing。',
    themes: ['financial-bluegreen-modern', 'global-capital-data-journalism'],
    pageRange: [10, 15],
  },
  '客户方案': {
    intent: '说明问题、方案、证据、取舍和报价，推动客户批准或进入下一轮。',
    audience: '客户决策人 / 评审组',
    outcome: '客户批准方案，或明确进入下一轮评估。',
    delivery: '客户现场提案',
    afterlife: '评审 / 审批',
    readingMode: 'balanced',
    readingModeNote: '客户会后独立审阅时改 text；纯品牌揭幕时改 presentation。',
    mode: 'narrative',
    modeNote: '技术 POC 需要逐项对比时，可在叙事中加 pyramid 式对比页。',
    themes: ['electric-studio', 'glass-tech-system', 'coral-3d', 'brutalist-acid', 'memphis-motion'],
    pageRange: [10, 15],
  },
  '行业洞察': {
    intent: '说明行业趋势、驱动因素、对我方产品或销售的含义。',
    audience: '产品、市场、管理层',
    outcome: '读者理解行业变化，以及我方应该关注的机会和风险。',
    delivery: '读者主导或混合',
    afterlife: '参考 / 归档',
    readingMode: 'text',
    readingModeNote: '现场分享为主时改 balanced。',
    mode: 'pyramid',
    modeNote: '只做资料汇编、不给出判断时用 briefing。',
    themes: ['global-capital-data-journalism', 'scientific-atlas', 'financial-bluegreen-modern'],
    pageRange: [12, 20],
  },
  '经营复盘': {
    intent: '复盘目标与实际差异，解释原因和风险，推动资源调整。',
    audience: '管理层 / 业务负责人',
    outcome: '管理层理解差异原因和风险，并对资源调整做出决定。',
    delivery: '复盘会现场主讲 + 会后审批材料',
    afterlife: '审批 / 归档',
    readingMode: 'text',
    readingModeNote: '只现场讲、不传阅时改 balanced。',
    mode: 'pyramid',
    modeNote: '只汇报数字、不做归因时用 briefing。',
    themes: ['financial-bluegreen-modern', 'global-capital-data-journalism'],
    pageRange: [10, 15],
  },
  '培训赋能': {
    intent: '拆解产品/销售方法，按步骤讲清，并用练习检验理解。',
    audience: '学员 / 一线团队',
    outcome: '学员能独立完成培训中演示的任务。',
    delivery: '现场培训 / 教室',
    afterlife: '参考 / 复用',
    readingMode: 'text',
    readingModeNote: '大教室或录制时改 presentation；工作坊时改 balanced。',
    mode: 'instructional',
    modeNote: '只做资料分发、不现场教学时用 briefing。',
    themes: ['scientific-atlas', '8-bit-orbit', 'scatterbrain', 'rural-green'],
    pageRange: [10, 16],
  },
  '产品发布': {
    intent: '用一个主视觉或主数字建立冲击，推动关注、试用或购买。',
    audience: '客户 / 媒体 / 合作伙伴',
    outcome: '目标受众关注产品，并采取试用、咨询或购买行动。',
    delivery: '发布会 / 路演 / 录制',
    afterlife: '无 / 复用',
    readingMode: 'presentation',
    readingModeNote: '需要讲清技术细节时改 balanced；会后独立阅读时改 text。',
    mode: 'showcase',
    modeNote: '技术细节为主时用 pyramid；品牌故事为主时用 narrative。',
    themes: ['chrome-future', 'neon-3d', 'glass-tech-system', 'brutalist-acid'],
    pageRange: [6, 10],
  },
  '客户案例': {
    intent: '用客户故事和结果证明方案可复制。',
    audience: '潜在客户 / 销售团队',
    outcome: '读者相信同类客户也能得到相似结果，愿意进入下一步。',
    delivery: '销售现场讲或会后传阅',
    afterlife: '复用 / 参考',
    readingMode: 'balanced',
    readingModeNote: '只做案例集、会后阅读时改 text。',
    mode: 'narrative',
    modeNote: '需要横向对比多个案例时，可在叙事中加 pyramid 式对比页。',
    themes: ['coral-3d', 'portfolio-redgreen', 'financial-bluegreen-modern'],
    pageRange: [8, 12],
  },
};

/** Old labels and common phrasings that should resolve to a canonical scene. */
export const SCENE_ALIASES = {
  '工作汇报': '通用汇报',
  '内部汇报': '通用汇报',
  '汇报': '通用汇报',
  '方案提案': '客户方案',
  '提案': '客户方案',
  '研究分析': '行业洞察',
  '行业研究': '行业洞察',
  '内容洞察': '行业洞察',
  '市场分析': '行业洞察',
  '政策研究汇报': '行业洞察',
  '培训讲解': '培训赋能',
  '培训': '培训赋能',
  '讲解': '培训赋能',
  '发布介绍': '产品发布',
  '发布会': '产品发布',
  '产品介绍': '产品发布',
  '案例分享': '客户案例',
};

export const SCENE_NAMES = Object.keys(SCENE_DEFAULTS);

export function normalizeScene(scene) {
  const raw = String(scene ?? '').trim();
  if (!raw) return null;
  if (SCENE_DEFAULTS[raw]) return raw;
  if (SCENE_ALIASES[raw]) return SCENE_ALIASES[raw];
  // Product labels often carry a qualifier ("季度经营复盘", "2026 竞品调研").
  for (const name of SCENE_NAMES) {
    if (raw.includes(name)) return name;
  }
  for (const [alias, target] of Object.entries(SCENE_ALIASES)) {
    if (alias && raw.includes(alias)) return target;
  }
  return null;
}

export function sceneDefaults(scene) {
  const key = normalizeScene(scene);
  if (!key) return null;
  return { key, ...SCENE_DEFAULTS[key] };
}

export function sceneSummary(scene) {
  const info = sceneDefaults(scene);
  if (!info) return null;
  return {
    scene: info.key,
    readingMode: info.readingMode,
    mode: info.mode,
    pageRange: info.pageRange,
    themes: info.themes,
  };
}
