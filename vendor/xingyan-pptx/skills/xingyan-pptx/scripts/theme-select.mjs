#!/usr/bin/env node
import { readJsonFile } from './lib/json.mjs';
/**
 * Theme selection for ClawHive Deck Studio.
 *
 * Usage:
 *   node scripts/theme-select.mjs recommend --brief brief.json --out candidates.json
 *   node scripts/theme-select.mjs recommend --brief-json '{"goal":"..."}' --limit 5
 *   node scripts/theme-select.mjs choose --theme swiss-signal --out theme_selection.json
 *
 * The output is the Stage-1 contract the rest of the skill reads:
 * theme id, token path, package path, fidelity, and recommendation reasons.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOKENS_DIR = path.join(ROOT, 'themes', 'tokens');
const PACKAGES_DIR = path.join(ROOT, 'themes', 'packages');
const SCENARIOS = path.join(ROOT, 'themes', 'scenarios.json');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function loadScenes() {
  if (!fs.existsSync(SCENARIOS)) return {};
  try {
    return readJsonFile(SCENARIOS).scenes || {};
  } catch (error) {
    console.warn(`[WARN] themes/scenarios.json unreadable: ${error.message}`);
    return {};
  }
}

function loadTokens() {
  return fs.readdirSync(TOKENS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const file = path.join(TOKENS_DIR, name);
      return { ...readJsonFile(file), _file: file };
    });
}

function loadBrief(args) {
  if (args.brief) return readJsonFile(args.brief);
  if (args['brief-json']) return JSON.parse(args['brief-json']);
  return {};
}

function textOf(theme) {
  return [
    theme.name,
    theme.description,
    ...(theme.mood || []),
    ...(theme.visualVocabulary || []),
    theme.visualStyle,
    theme.density,
  ].join(' ').toLowerCase();
}

// Coarse buckets used only to demote obviously unrelated themes when the brief
// has a clear intent. Keep this vocabulary in sync with themes/scenarios.json.
const INTENT_WORDS = {
  'business-ops': ['经营', '复盘', '月报', '季报', '预算', '决策', '汇报', 'okr', 'kpi'],
  'market-research': ['行业', '市场', '调研', '白皮书', '研报', '投研', '分析', '策略', '洞察'],
  academic: ['答辩', '科研', '课题', '基金', '立项', '论文', '实验', '研究', '评审', '结题'],
  marketing: ['营销', '推广', '活动', '品牌', '招商', '传播', 'campaign', '比稿', '获客'],
  portfolio: ['作品集', '个人介绍', '案例', '简历', '面试', '展示'],
  campus: ['校园', '社团', '毕业', '招新', '同学', '社媒', '潮流', '青春'],
  culture: ['文化', '展览', '东方', '文学', '生活', '美学', '叙事', '手作'],
  tech: ['技术', '架构', '系统', '开发', '运维', '接口', '终端', '工程'],
  'product-launch': ['发布会', '产品发布', '产品介绍', '上线', '启动', '宣讲', '大会'],
  industrial: ['制造', '供应链', '产能', '交付', '工厂', '产线', '工业'],
  'public-sector': ['政企', '政府', '区域', '乡村', '公共', '民生', '政务'],
  'creative-lab': ['创意', '概念', '实验', '设计', '提案', '构成', '视觉'],
};

function briefIntent(text) {
  let best = null;
  let bestCount = 0;
  for (const [intent, words] of Object.entries(INTENT_WORDS)) {
    const count = words.filter((word) => text.includes(word)).length;
    if (count > bestCount) {
      best = intent;
      bestCount = count;
    }
  }
  return bestCount >= 1 ? best : null;
}

function briefText(brief) {
  return [
    ...(Array.isArray(brief.keywords) ? brief.keywords : []),
    brief.goal,
    brief.tone,
    brief.audience,
    brief.scene,
    brief.title,
  ].filter(Boolean).join(' ').toLowerCase();
}

function sceneHits(scene, brief, text, reasons, weight = 3) {
  if (!scene) return 0;
  let score = 0;
  const push = (label) => {
    score += weight;
    reasons.push(label);
  };
  for (const signal of scene.signals || []) {
    const needle = String(signal).toLowerCase().trim();
    if (needle && text.includes(needle)) push(`命中场景词「${signal}」`);
  }
  for (const role of scene.scenes || []) {
    if (role && text.includes(String(role).toLowerCase())) push(`适用场景「${role}」`);
  }
  for (const audience of scene.audiences || []) {
    if (brief.audience && String(brief.audience).includes(audience)) push(`受众匹配「${audience}」`);
  }
  for (const avoid of scene.avoid || []) {
    if (avoid && text.includes(String(avoid).toLowerCase())) {
      score -= 4;
      reasons.push(`不适合「${avoid}」`);
    }
  }
  return score;
}

function scoreTheme(theme, brief, scene) {
  const haystack = textOf(theme);
  const text = briefText(brief);
  const reasons = [];
  let score = 0;

  const terms = [
    ...(Array.isArray(brief.keywords) ? brief.keywords : []),
    brief.goal,
    brief.tone,
    brief.audience,
    brief.scene,
  ].filter(Boolean);

  for (const term of terms) {
    const needle = String(term).toLowerCase().trim();
    if (!needle) continue;
    if (haystack.includes(needle)) {
      score += 3;
      reasons.push(`命中「${term}」`);
    }
  }

  score += sceneHits(scene, brief, text, reasons);

  const intent = briefIntent(text);
  if (intent && scene && scene.intent) {
    if (scene.intent === intent) {
      score += 4;
      reasons.push(`用途一致 ${intent}`);
    } else {
      score -= 2;
    }
  }

  if (brief.density && theme.density === brief.density) {
    score += 3;
    reasons.push(`密度匹配 ${brief.density}`);
  }
  if (brief.visualStyle && theme.visualStyle === brief.visualStyle) {
    score += 5;
    reasons.push(`风格匹配 ${brief.visualStyle}`);
  }
  if (brief.tone && (theme.mood || []).some((mood) => String(brief.tone).includes(mood) || mood.includes(brief.tone))) {
    score += 2;
    reasons.push(`语气匹配 ${brief.tone}`);
  }
  if (brief.preferNative !== false && theme.pptFidelity === 'native') {
    score += 1;
    reasons.push('PPT 原生保真');
  }
  if ((theme.contrast?.body_contrast ?? 0) >= 7) {
    score += 1;
    reasons.push('正文对比度充足');
  }

  return { score, reasons: [...new Set(reasons)].slice(0, 4) };
}

/**
 * Pick the top `limit` candidates, but never let one visual family take more
 * than `perFamily` slots: five business-report themes that differ only in hue
 * are not five options.
 */
function diversify(ranked, limit, perFamily = 2) {
  const taken = [];
  const counts = {};
  for (const item of ranked) {
    const family = item.visualStyle || 'custom';
    if ((counts[family] || 0) >= perFamily) continue;
    counts[family] = (counts[family] || 0) + 1;
    taken.push(item);
    if (taken.length >= limit) break;
  }
  if (taken.length < limit) {
    const chosen = new Set(taken.map((item) => item.id));
    for (const item of ranked) {
      if (taken.length >= limit) break;
      if (chosen.has(item.id)) continue;
      taken.push(item);
    }
  }
  return taken;
}

function recommend(themes, brief, limit, sceneMap = {}) {
  const text = briefText(brief);
  const ranked = themes
    .map((theme) => {
      const scene = sceneMap[theme.id] || null;
      const { score, reasons } = scoreTheme(theme, brief, scene);
      return {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        density: theme.density,
        visualStyle: theme.visualStyle,
        pptFidelity: theme.pptFidelity,
        scenes: (scene && scene.scenes) || [],
        score,
        reasons: reasons.length ? reasons : ['场景未命中，按家族分布补充候选'],
      };
    })
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));

  // No signal at all: spread across families instead of returning the
  // alphabetical head of the catalog.
  const hasSignal = ranked.some((item) => item.score > 1);
  if (!hasSignal) {
    const byFamily = new Map();
    for (const item of ranked) {
      const family = item.visualStyle || 'custom';
      if (!byFamily.has(family)) byFamily.set(family, []);
      byFamily.get(family).push(item);
    }
    const spread = [];
    const queues = [...byFamily.values()];
    while (spread.length < limit && queues.some((queue) => queue.length)) {
      for (const queue of queues) {
        if (queue.length && spread.length < limit) spread.push(queue.shift());
      }
    }
    return spread;
  }

  void text;
  return diversify(ranked, limit);
}

function selection(theme, candidates, source) {
  return {
    schemaVersion: 1,
    selectedTheme: theme.id,
    source,
    selectedAt: new Date().toISOString(),
    theme: {
      name: theme.name,
      description: theme.description,
      density: theme.density,
      visualStyle: theme.visualStyle,
      pptFidelity: theme.pptFidelity,
      pptFallback: theme.pptFallback,
    },
    tokensPath: path.relative(ROOT, path.join(TOKENS_DIR, `${theme.id}.json`)),
    packagePath: path.relative(ROOT, path.join(PACKAGES_DIR, theme.id)),
    candidates,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const themes = loadTokens();

  if (command === 'recommend') {
    const brief = loadBrief(args);
    const limit = Number(args.limit || 5);
    const candidates = recommend(themes, brief, limit, loadScenes());
    const output = { schemaVersion: 1, brief, candidates };
    const json = JSON.stringify(output, null, 2) + '\n';
    if (args.out) fs.writeFileSync(args.out, json, 'utf8');
    process.stdout.write(json);
    return;
  }

  if (command === 'choose') {
    const id = args.theme;
    const theme = themes.find((item) => item.id === id);
    if (!theme) {
      console.error(`Unknown theme: ${id}`);
      process.exit(2);
    }
    const brief = loadBrief(args);
    const candidates = recommend(themes, brief, Number(args.limit || 5), loadScenes());
    // Provenance is opt-in: only the gallery records a real user pick.
    const payload = selection(theme, candidates, args.source === 'user' ? 'user' : 'auto');
    const json = JSON.stringify(payload, null, 2) + '\n';
    if (args.out) fs.writeFileSync(args.out, json, 'utf8');
    process.stdout.write(json);
    return;
  }

  console.error('Usage: theme-select.mjs recommend|choose [options]');
  process.exit(1);
}

main();
