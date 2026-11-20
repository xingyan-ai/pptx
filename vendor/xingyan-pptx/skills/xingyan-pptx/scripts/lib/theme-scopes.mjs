/**
 * Theme scope taxonomy — shared by apply-theme.mjs and check-design-spec.mjs.
 *
 * The theme is split into two axes:
 *
 *   visual — colours, type, component drawing, decoration. Safe: it changes how
 *            a page looks, never what it says or how much it holds.
 *   layout — spacing anchors, composition tendency, cross-page continuity.
 *            Opt-in only: it pre-empts the content-driven layout and caps how
 *            much a page can hold.
 *
 * Keeping this in one module is deliberate. 0.6.0 duplicated the scope list in
 * two files; `components` was added to one and not the other, so applying a
 * component theme made the gate reject its own overlay.
 */

export const SCOPES = [
  'colors',
  'typography',
  'components',
  'decoration',
  'visual',
  'layout',
  'full',
  'design',
];

/** Which axis each scope belongs to. `mixed` scopes are legacy. */
export const AXIS = {
  colors: 'visual',
  typography: 'visual',
  components: 'visual',
  decoration: 'visual',
  visual: 'visual',
  layout: 'layout',
  full: 'mixed',
  design: 'mixed',
};

/**
 * Which write group each scope enables. `colors` is always written and is not
 * listed here.
 */
export const WRITES = {
  typography: ['typography', 'full', 'visual', 'design'],
  spacing: ['full', 'layout', 'design'],
  components: ['components', 'visual', 'design'],
  decoration: ['decoration', 'visual', 'design'],
  composition: ['layout', 'design'],
};

/** Scopes allowed to touch layout-axis fields. */
export const LAYOUT_SCOPES = ['layout', 'design', 'full'];

/** The exact §V fields that belong to the layout axis. */
export const LAYOUT_FIELD_LABELS = [
  'design_spec §V spacing anchors',
  'design_spec §V composition tendency',
  'design_spec §V cross-page continuity',
];

/** Labels a visual scope is allowed to write into §V. */
export const VISUAL_FIELD_LABELS = [
  'design_spec §V Component System',
  'design_spec §V Decoration System',
];

export const DEPRECATED_SCOPES = {
  full: 'full 会写间距锚点（版式轴）。视觉统一请用 --scope visual。',
  design: 'design 同时写视觉和版式。视觉统一请用 --scope visual；确需主题版式时显式用 --scope layout。',
};

export function writes(scope, group) {
  return (WRITES[group] || []).includes(scope);
}

export function isLayoutScope(scope) {
  return LAYOUT_SCOPES.includes(scope);
}

/** §V layout fields this scope is expected to touch, empty for visual scopes. */
export function layoutFieldsFor(scope, token) {
  const fields = [];
  if (writes(scope, 'spacing') && token && token.spacing) fields.push(LAYOUT_FIELD_LABELS[0]);
  if (writes(scope, 'composition')) fields.push(LAYOUT_FIELD_LABELS[1], LAYOUT_FIELD_LABELS[2]);
  return fields;
}
