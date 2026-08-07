/*
 * 나만의 싱글몰트 - iPad 웹(PWA)
 *
 * 안드로이드 앱(Jetpack Compose)의 화면 구성을 1:1 로 옮긴 UI.
 *  - Palette / AppType / Dimens : css/styles.css
 *  - FlavorIcons(24종)          : 아래 ICONS
 *  - 추천 엔진                   : js/engine.js (Kotlin 원본과 결과 동일)
 */
import * as E from './engine.js';

/* ==========================================================================
   0. 스케일 — 안드로이드 dp 를 뷰포트에 맞춰 px 로 환산
   ========================================================================== */
const DESIGN_W = 1415;
const DESIGN_H = 796;

function updateScale() {
  const w = document.documentElement.clientWidth;
  const h = document.documentElement.clientHeight;
  let s = Math.min(w / DESIGN_W, h / DESIGN_H);
  if (w < h) s = w / 900; // 세로 모드는 폭 기준
  s = Math.max(0.5, Math.min(1.35, s));
  document.documentElement.style.setProperty('--s', s + 'px');
}
window.addEventListener('resize', updateScale);
window.addEventListener('orientationchange', () => setTimeout(updateScale, 120));
updateScale();

/* ==========================================================================
   1. 유틸
   ========================================================================== */
const app = document.getElementById('app');
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const S = {
  brands: [], pool: [], questions: [], meta: {},
  engine: null, answers: null, current: null, finishReason: '',
  result: null, vector: null,
  detailBrand: null, detailFrom: 'result', detailSources: false,
  idxQuery: '', idxSort: 'ko', idxRegions: new Set(), idxStatus: new Set(),
  guideIndex: 0,
  route: 'age',
};

/* ==========================================================================
   2. 향미 아이콘 — Android FlavorIcons.kt 와 동일한 24종 (24x24 선화)
      정의되지 않은 이름은 안드로이드와 똑같이 glass 로 대체된다.
   ========================================================================== */
const ICONS = {
  floral:
    '<circle cx="16.2" cy="12" r="2.7"/><circle cx="13.3" cy="15.99" r="2.7"/>' +
    '<circle cx="8.6" cy="14.47" r="2.7"/><circle cx="8.6" cy="9.53" r="2.7"/>' +
    '<circle cx="13.3" cy="8.01" r="2.7"/><circle cx="12" cy="12" r="1.5"/>',
  orchard:
    '<path d="M12 8.5C9 5.5 4.5 8 5.5 13.5C6.3 18 9.5 21 12 21C14.5 21 17.7 18 18.5 13.5C19.5 8 15 5.5 12 8.5Z"/>' +
    '<line x1="12" y1="8.5" x2="12" y2="4.5"/>' +
    '<path d="M12 6C14 3.5 16.5 3.2 17.5 3.5C17.2 5.6 15 6.8 12 6Z"/>',
  citrus:
    '<circle cx="12" cy="12" r="8"/>' +
    '<line x1="12" y1="12" x2="19.15" y2="13.92"/><line x1="12" y1="12" x2="13.92" y2="19.15"/>' +
    '<line x1="12" y1="12" x2="6.77" y2="17.23"/><line x1="12" y1="12" x2="4.85" y2="10.08"/>' +
    '<line x1="12" y1="12" x2="10.08" y2="4.85"/><line x1="12" y1="12" x2="17.23" y2="6.77"/>' +
    '<circle cx="12" cy="12" r="1.2"/>',
  peach:
    '<circle cx="11.6" cy="13.4" r="7.2"/>' +
    '<path d="M11.6 6.4C11 10 11.2 16 13.2 20.2"/>' +
    '<line x1="12.6" y1="6.2" x2="15.6" y2="3.4"/>' +
    '<path d="M14.6 4.4C17 3 19.4 3.4 20.2 4.2C19.2 6.2 16.6 6.6 14.6 4.4Z"/>',
  tropical:
    '<path d="M7.5 11C7.5 17.5 10 21 12 21C14 21 16.5 17.5 16.5 11C16.5 8.5 14.5 7.5 12 7.5C9.5 7.5 7.5 8.5 7.5 11Z"/>' +
    '<line x1="8.4" y1="11.6" x2="15.6" y2="14.4"/><line x1="8.4" y1="14.4" x2="15.6" y2="11.6"/>' +
    '<line x1="12" y1="7.5" x2="12" y2="3.4"/>' +
    '<line x1="12" y1="4.8" x2="8.4" y2="3.2"/><line x1="12" y1="4.8" x2="15.6" y2="3.2"/>',
  redfruit:
    '<circle cx="9" cy="14.5" r="4.3"/><circle cx="15.4" cy="15.6" r="3.4"/>' +
    '<line x1="9" y1="10.2" x2="12.4" y2="5.4"/><line x1="15.4" y1="12.2" x2="12.8" y2="5.6"/>' +
    '<line x1="10.2" y1="5" x2="15" y2="4.4"/>',
  driedfruit:
    '<path d="M6 12C6 8.6 8.8 6.6 12 6.6C15.2 6.6 18 8.6 18 12C18 16.2 15 19.4 12 19.4C9 19.4 6 16.2 6 12Z"/>' +
    '<line x1="8.6" y1="10.4" x2="10.4" y2="12"/><line x1="13.4" y1="9.8" x2="15.4" y2="11.4"/>' +
    '<line x1="10.2" y1="15.4" x2="12.4" y2="16.6"/><line x1="14" y1="14" x2="15.8" y2="15.2"/>',
  honey:
    '<path d="M16.85 7.6L16.85 13.2L12 16L7.15 13.2L7.15 7.6L12 4.8Z"/>' +
    '<path d="M9.6 15.4C9.6 18 12 18.6 12 21"/><circle cx="14.6" cy="18.4" r="1.4"/>',
  vanilla:
    '<path d="M6.4 19.6C9 13 13.6 7 17.6 4.4"/><path d="M8.2 19.8C10.8 13.4 15 7.6 18.8 5.2"/>' +
    '<line x1="6.4" y1="19.6" x2="8.2" y2="19.8"/><line x1="17.6" y1="4.4" x2="18.8" y2="5.2"/>' +
    '<circle cx="4.8" cy="20.4" r="1.4"/>',
  caramel:
    '<path d="M4.6 15C7 11.6 9.4 17.4 12 14C14.6 10.6 17 16.4 19.4 13"/>' +
    '<path d="M4.6 19.4C7 16 9.4 21.8 12 18.4C14.6 15 17 20.8 19.4 17.4"/>' +
    '<line x1="8.4" y1="8.6" x2="8.4" y2="5.4"/><line x1="12" y1="9.2" x2="12" y2="4.6"/>' +
    '<line x1="15.6" y1="8.6" x2="15.6" y2="5.4"/>',
  chocolate:
    '<rect x="5" y="6" width="14" height="12"/><line x1="12" y1="6" x2="12" y2="18"/>' +
    '<line x1="5" y1="10" x2="19" y2="10"/><line x1="5" y1="14" x2="19" y2="14"/>',
  nut:
    '<path d="M12 4.4C17 6.4 19 11 17.4 15.6C16 19.4 12.8 20.6 12 20.6C11.2 20.6 8 19.4 6.6 15.6C5 11 7 6.4 12 4.4Z"/>' +
    '<line x1="12" y1="5.4" x2="12" y2="20"/><path d="M8.4 8.6C10.4 11.6 10.6 15.6 9.4 18.4"/>',
  cereal:
    '<line x1="12" y1="21" x2="12" y2="6"/>' +
    '<path d="M12 7.6C9.4 7 7.6 9 7.4 10.8C9.8 10.8 11.6 9.4 12 7.6Z"/>' +
    '<path d="M12 7.6C14.6 7 16.4 9 16.6 10.8C14.2 10.8 12.4 9.4 12 7.6Z"/>' +
    '<path d="M12 10.7C9.4 10.1 7.6 12.1 7.4 13.9C9.8 13.9 11.6 12.5 12 10.7Z"/>' +
    '<path d="M12 10.7C14.6 10.1 16.4 12.1 16.6 13.9C14.2 13.9 12.4 12.5 12 10.7Z"/>' +
    '<path d="M12 13.8C9.4 13.2 7.6 15.2 7.4 17C9.8 17 11.6 15.6 12 13.8Z"/>' +
    '<path d="M12 13.8C14.6 13.2 16.4 15.2 16.6 17C14.2 17 12.4 15.6 12 13.8Z"/>' +
    '<path d="M12 16.9C9.4 16.3 7.6 18.3 7.4 20.1C9.8 20.1 11.6 18.7 12 16.9Z"/>' +
    '<path d="M12 16.9C14.6 16.3 16.4 18.3 16.6 20.1C14.2 20.1 12.4 18.7 12 16.9Z"/>',
  herb:
    '<path d="M12 21C12 14 13.4 8 18.6 4.2"/>' +
    '<path d="M13.2 12.6C15 7.6 18 5.6 19.4 5.2C19.4 9 17 12.4 13.2 12.6Z"/>' +
    '<path d="M11.4 16.6C9 13.6 6 12.8 4.6 12.8C5 16 7.8 18.2 11.4 16.6Z"/>',
  spice:
    '<path d="M12 4L14.55 9.45L20 12L14.55 14.55L12 20L9.45 14.55L4 12L9.45 9.45Z"/>' +
    '<circle cx="12" cy="12" r="1.8"/>',
  oak:
    '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="5.8"/>' +
    '<circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="1.2"/>',
  wave:
    '<path d="M3.4 8.4C6 6 8 10.8 10.6 8.4C13.2 6 15.2 10.8 17.8 8.4C19 7.3 19.8 7.3 20.6 7.8"/>' +
    '<path d="M3.4 12.2C6 9.8 8 14.6 10.6 12.2C13.2 9.8 15.2 14.6 17.8 12.2C19 11.1 19.8 11.1 20.6 11.6"/>' +
    '<path d="M3.4 16C6 13.6 8 18.4 10.6 16C13.2 13.6 15.2 18.4 17.8 16C19 14.9 19.8 14.9 20.6 15.4"/>',
  salt:
    '<path d="M8 21L9.6 10.4L14.4 10.4L16 21Z"/>' +
    '<path d="M9.6 10.4C9.6 6.6 14.4 6.6 14.4 10.4"/>' +
    '<line x1="10.4" y1="4.6" x2="10.4" y2="6.6"/><line x1="12" y1="3.6" x2="12" y2="6.2"/>' +
    '<line x1="13.6" y1="4.6" x2="13.6" y2="6.6"/>',
  smoke:
    '<path d="M7.2 20.4C4.2 16 10.2 12.6 7.2 8.4C5 6 8.8 4.6 7.6 3.2"/>' +
    '<path d="M12 20.4C9 16 15 12.6 12 8.4C9.8 6 13.6 4.6 12.4 3.2"/>' +
    '<path d="M16.8 20.4C13.8 16 19.8 12.6 16.8 8.4C14.6 6 18.4 4.6 17.2 3.2"/>',
  earth:
    '<path d="M3.4 15.4C7 13.4 10 16 13 14.6C16 13.2 18.6 14.6 20.6 15.4"/>' +
    '<line x1="3.4" y1="19" x2="20.6" y2="19"/>' +
    '<circle cx="8.4" cy="9.4" r="2.2"/><circle cx="14.6" cy="8" r="3"/>',
  charcoal:
    '<path d="M5.4 14.4L9.4 9.4L14.4 11.4L12.4 17L6.6 17.4Z"/>' +
    '<path d="M14 6.4L18.6 7.4L19 12L15 12.8Z"/>' +
    '<line x1="15.4" y1="15.4" x2="19.6" y2="16.6"/><line x1="15" y1="18.6" x2="19.2" y2="19.4"/>',
  bonfire:
    '<path d="M12 3.4C15.6 7.4 16.6 10.4 15.4 12.8C14.6 14.4 13 15 12 15C11 15 9.4 14.4 8.6 12.8C7.4 10.4 8.4 7.4 12 3.4Z"/>' +
    '<line x1="4.4" y1="20.6" x2="19.6" y2="17.4"/><line x1="4.4" y1="17.4" x2="19.6" y2="20.6"/>',
  cask:
    '<path d="M6.4 6.4C3.4 12 3.4 12 6.4 17.6L17.6 17.6C20.6 12 20.6 12 17.6 6.4Z"/>' +
    '<line x1="4.6" y1="9.4" x2="19.4" y2="9.4"/><line x1="4.6" y1="14.6" x2="19.4" y2="14.6"/>' +
    '<line x1="12" y1="6.4" x2="12" y2="17.6"/>',
  glass:
    '<path d="M8.6 4.2C7.2 9.4 8.6 13.4 10.6 14.6L10.6 17.6L7.6 19.4L16.4 19.4L13.4 17.6L13.4 14.6C15.4 13.4 16.8 9.4 15.4 4.2Z"/>' +
    '<line x1="8.6" y1="4.2" x2="15.4" y2="4.2"/>' +
    '<path d="M8.7 10C10.6 11 13.4 11 15.3 10"/>',
};

function iconSvg(name) {
  const body = ICONS[name] || ICONS.glass;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}

/* 향미 키 -> 아이콘 (Android FlavorIcons.forFeature) */
function iconForFeature(k) {
  switch (k) {
    case 'smokeIntensity': return 'smoke';
    case 'peatMedicinal': return 'wave';
    case 'peatEarthy': return 'earth';
    case 'smokeAshy': return 'charcoal';
    case 'smokeWoody': return 'bonfire';
    case 'smokeMeaty': return 'bonfire';
    case 'sweetness': return 'honey';
    case 'honey': return 'honey';
    case 'vanilla': return 'vanilla';
    case 'caramelToffee': return 'caramel';
    case 'chocolateCoffee': return 'chocolate';
    case 'freshOrchardFruit': return 'orchard';
    case 'citrus': return 'citrus';
    case 'stoneFruit': return 'peach';
    case 'tropicalFruit': return 'tropical';
    case 'redFruit': return 'redfruit';
    case 'driedFruit': return 'driedfruit';
    case 'floral': return 'floral';
    case 'herbalGrassy': return 'herb';
    case 'cerealMalty': return 'cereal';
    case 'nutty': return 'nut';
    case 'sweetSpice': case 'drySpice': return 'spice';
    case 'oakTannin': return 'oak';
    case 'coastalBriny': return 'salt';
    case 'maritimeSeaweed': return 'wave';
    default: return 'glass';
  }
}

/* ==========================================================================
   3. SVG 컴포넌트 (Android Common.kt 의 Canvas 드로잉 이식)
   ========================================================================== */

/** 글렌케런 잔. fill = 0..1 채움 비율 */
function glencairnSVG(fill, opts) {
  const o = opts || {};
  const inner = o.inner || '';
  const bowlTop = 26, bowlBottom = 62, bodyBottom = 76;
  const level = bowlBottom - (bowlBottom - bowlTop) * fill;
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="29 17 42 64" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
    <defs>
      <clipPath id="${id}">
        <path d="M31 20 L69 20 L66 44 C64 56 58 62 50 62 C42 62 36 56 34 44 Z"/>
      </clipPath>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C98532"/><stop offset="100%" stop-color="#9A5A1C"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#${id})">
      <rect x="0" y="${level}" width="100" height="${100 - level}" fill="url(#${id}f)"/>
      ${inner}
    </g>
    <path d="M31 20 L69 20 L66 44 C64 56 58 62 50 62 C42 62 36 56 34 44 Z"
      fill="none" stroke="rgba(242,235,221,0.42)" stroke-width="0.9"/>
    <path d="M50 62 L50 76 M38 78 L62 78 L58 74 L42 74 Z"
      fill="#A9653A" stroke="#A9653A" stroke-width="5" stroke-linejoin="round"/>
    <line x1="36" y1="24" x2="41" y2="52" stroke="rgba(242,235,221,0.30)" stroke-width="0.8"/>
  </svg>`;
}

/** 병 실루엣 */
function bottleSVG() {
  return `<svg viewBox="32 0 36 98" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
    <defs>
      <linearGradient id="bt" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3A2A1C"/><stop offset="55%" stop-color="#5A3F26"/>
        <stop offset="100%" stop-color="#2A1E14"/>
      </linearGradient>
    </defs>
    <path d="M42 4 L58 4 L58 20 C58 26 66 30 66 40 L66 92 C66 95 64 96 62 96
             L38 96 C36 96 34 95 34 92 L34 40 C34 30 42 26 42 20 Z" fill="url(#bt)"/>
    <rect x="41" y="2" width="18" height="6" rx="1.5" fill="#8A5A2A"/>
    <rect x="40" y="46" width="20" height="26" rx="1.5"
      fill="rgba(242,235,221,0.10)" stroke="rgba(185,154,93,0.35)" stroke-width="0.8"/>
  </svg>`;
}

/** 취향 일치도 게이지 (135도에서 시작해 270도) */
function gaugeSVG(percent, label) {
  const r = 44, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const sweep = circ * 0.75;
  const on = sweep * Math.max(0, Math.min(100, percent)) / 100;
  return `<svg viewBox="0 0 100 100" style="width:100%;height:100%">
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C98532"/><stop offset="100%" stop-color="#B99A5D"/>
    </linearGradient></defs>
    <g transform="rotate(135 50 50)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#262B30" stroke-width="5.5"
        stroke-linecap="round" stroke-dasharray="${sweep} ${circ}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#gg)" stroke-width="5.5"
        stroke-linecap="round" stroke-dasharray="${on} ${circ}"/>
    </g>
  </svg>`;
}

/** 6축 레이더 */
function radarSVG(brand) {
  const axes = E.CHART_AXES;
  const n = axes.length, cx = 50, cy = 50, R = 38;
  const pt = (i, f) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f];
  };
  let grid = '';
  for (let ring = 1; ring <= 3; ring++) {
    const f = ring / 3;
    const pts = axes.map((_, i) => pt(i, f).map((v) => v.toFixed(2)).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="rgba(242,235,221,0.10)" stroke-width="0.6"/>`;
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, 1);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="rgba(242,235,221,0.08)" stroke-width="0.6"/>`;
  }
  const vals = axes.map(([k]) => Math.max(0, Math.min(5, E.brandValue(brand, k))) / 5);
  const poly = vals.map((v, i) => pt(i, v).map((x) => x.toFixed(2)).join(',')).join(' ');
  return `<svg viewBox="0 0 100 100" style="width:100%;height:100%">${grid}
    <polygon points="${poly}" fill="rgba(201,133,50,0.18)" stroke="#C98532" stroke-width="1.1"/>
  </svg>`;
}

/* ==========================================================================
   4. 공통 조각
   ========================================================================== */
function logo(compact) {
  return `<div class="logo">
    <div class="wordmark ${compact ? 't-displayS' : 't-displayM'}">MY SINGLE MALT</div>
    ${compact ? '' : '<div class="tagline t-bodyS">나에게 맞는 싱글몰트 찾기</div>'}
  </div>`;
}

const NOTICE = '과도한 음주는 건강에 해로울 수 있습니다. 음주 후 운전하지 마세요.';
const notice = () => `<div class="notice t-caption">${NOTICE}</div>`;

const ghost = (act, label, w, off) =>
  `<button class="btn btn-ghost t-titleS${off ? ' off' : ''}" data-a="${act}"${off ? ' disabled' : ''}` +
  (w ? ` style="width:calc(${w} * var(--s))"` : '') + `>${esc(label)}</button>`;

const primary = (act, label, w, off) =>
  `<button class="btn btn-primary t-titleS${off ? ' off' : ''}" data-a="${act}"${off ? ' disabled' : ''}` +
  (w ? ` style="width:calc(${w} * var(--s))"` : '') + `>${esc(label)}</button>`;

const vs = (n) => `<div style="height:calc(${n} * var(--s))"></div>`;
const hs = (n) => `<div style="width:calc(${n} * var(--s));flex:none"></div>`;
const sectionLabel = (t) => `<div class="section-label t-role">${esc(t)}</div>`;

function intensityBar(key, val, isCask) {
  let segs = '';
  for (let i = 0; i < 5; i++) segs += `<span class="${i < val ? 'f' + (isCask ? ' cask' : '') : ''}"></span>`;
  return `<div class="ibar">
    <span class="k t-bodyM">${esc(E.featureLabel(key))}</span>
    <span class="segs">${segs}</span>
    <span class="v t-bodyS">${val}/5</span>
  </div>`;
}

function badge(text, tone) {
  return `<span class="badge t-caption tone-${tone || 'gold'}">${esc(text)}</span>`;
}

function dominantCask(b) {
  let best = null, bv = -1;
  E.CASK.forEach((k) => { const v = E.brandValue(b, k); if (v > bv) { bv = v; best = k; } });
  return bv > 0 ? E.featureLabel(best) : '정보 없음';
}

/* ==========================================================================
   5. 화면
   ========================================================================== */

/* -------------------------------------------------------------- 연령 확인 */
function viewAge() {
  return `<div class="scaffold"><div class="box">
    <div style="width:calc(120 * var(--s));height:calc(160 * var(--s))">${glencairnSVG(0.55)}</div>
    ${vs(28)}
    <div class="t-displayL c-ivory">MY SINGLE MALT</div>
    ${vs(6)}
    <div class="t-bodyL c-gold">나에게 맞는 싱글몰트 찾기</div>
    ${vs(30)}
    <div class="hairline rule"></div>
    ${vs(30)}
    <div class="t-titleM c-ivory">본 콘텐츠는 만 19세 이상 성인을 위한 주류 정보 콘텐츠입니다.</div>
    ${vs(12)}
    <div class="t-bodyM c-gray">생년월일이나 개인정보를 입력받지 않으며, 확인 결과를 외부로 전송하지 않습니다.</div>
    ${vs(38)}
    <div class="row" style="gap:calc(20 * var(--s))">
      ${ghost('age-no', '종료', 220)}
      ${primary('age-yes', '만 19세 이상입니다', 360)}
    </div>
    ${vs(30)}
    ${notice()}
  </div></div>`;
}

/* ------------------------------------------------------------------ 대기 */
const DECO = [
  ['floral', 13, 14, 46], ['wave', 90, 24, 40], ['citrus', 43, 60, 44],
  ['cask', 41, 70, 40], ['smoke', 58, 50, 38], ['oak', 26, 79, 44],
  ['honey', 76, 33, 36], ['spice', 73, 42, 34],
];

function viewIdle() {
  const deco = DECO.map(([n, x, y, sz]) =>
    `<div class="fl" style="left:${x}%;top:${y}%;width:calc(${sz} * var(--s));height:calc(${sz} * var(--s));opacity:.10">${iconSvg(n)}</div>`
  ).join('');
  return `<div class="scaffold">
    <div class="head">${logo(false)}</div>
    <div class="main idle-body">
      <div id="idle-deco">${deco}</div>
      <div class="idle-left">
        ${sectionLabel('SINGLE MALT DISCOVERY')}
        ${vs(20)}
        <h1 class="t-displayL c-ivory">당신의 취향을 닮은
싱글몰트를 찾아보세요.</h1>
        ${vs(22)}
        <div class="lede t-bodyL c-dim">향, 피트, 캐스크, 질감과 음용 취향을 분석해
가장 잘 맞는 브랜드를 추천합니다.</div>
        ${vs(38)}
        ${primary('start', '추천 시작하기', 420)}
        ${vs(18)}
        <div class="row" style="gap:calc(16 * var(--s))">
          ${ghost('index', '모든 브랜드 둘러보기', 280)}
          ${ghost('guide', '향미 가이드', 220)}
        </div>
      </div>
      <div class="idle-right">
        <div style="width:calc(300 * var(--s));height:calc(400 * var(--s))">${glencairnSVG(0.62)}</div>
      </div>
    </div>
    <div class="foot">${notice()}</div>
  </div>`;
}

/* ------------------------------------------------------------------ 퀴즈 */
function viewQuiz() {
  const q = S.current;
  if (!q) return '';
  const p = S.engine.progress(S.answers);
  const sel = S.answers.selections.get(q.id) || [];
  const canNext = E.canProceed(q, S.answers);

  let bodyHtml;
  if (q.selectionType === 'BRAND_SEARCH') bodyHtml = quizBrandSearch();
  else if (q.selectionType === 'BRAND_RATING') bodyHtml = quizBrandRating();
  else {
    const opts = q.options.filter((o) => o.active);
    const cols = opts.length <= 4 ? 2 : opts.length <= 6 ? 3 : 4;
    const cards = opts.map((o, i) => `
      <div class="glass clickable opt${sel.includes(o.id) ? ' sel' : ''}" data-a="opt" data-i="${i}">
        ${o.icon ? `<span class="ficon">${iconSvg(o.icon)}</span>` : ''}
        <span class="txt">
          <span class="lbl t-titleS" style="display:block">${esc(o.label)}</span>
          ${o.description ? `<span class="sub t-bodyS" style="display:block">${esc(o.description)}</span>` : ''}
        </span>
        <span class="mark"></span>
      </div>`).join('');
    bodyHtml = `<div class="opts" style="grid-template-columns:repeat(${cols},1fr)">${cards}</div>`;
  }

  const multiHint = q.selectionType === 'MULTI'
    ? `${vs(10)}<div>${badge(`최대 ${q.maxSelection}개 선택`, 'gold')}</div>` : '';

  return `<div class="scaffold">
    <div class="head">
      ${logo(true)}
      <div class="grow"></div>
      <div class="q-head-right">
        <div class="t-titleM c-amber">취향 분석 ${p.percent}%</div>
        <div class="t-caption c-gray">현재 ${p.confirmedFeatures}개의 취향을 확인했습니다.</div>
      </div>
      ${hs(24)}
      ${ghost('home', '처음으로', 200)}
    </div>
    <div class="progress"><i style="width:${p.percent}%"></i></div>
    ${vs(30)}
    <div class="main">
      ${sectionLabel(q.category || '')}
      ${vs(10)}
      <div class="t-displayM c-ivory">${esc(q.title)}</div>
      ${q.subtitle ? `${vs(8)}<div class="t-bodyL c-gray">${esc(q.subtitle)}</div>` : ''}
      ${multiHint}
      ${vs(26)}
      <div class="grow scroll-y" style="display:flex;flex-direction:column;justify-content:flex-start">${bodyHtml}</div>
    </div>
    <div class="foot ruled row">
      ${ghost('prev', '이전', 260, !hasPrevious())}
      <div class="grow" style="text-align:center">
        <span class="t-caption c-gray">${p.askedCount + 1}번째 질문</span>
      </div>
      ${primary('next', '다음', 380, !canNext)}
    </div>
  </div>`;
}

function quizBrandSearch() {
  const chips = S.answers.tastedBrandIds.map((id) => {
    const b = S.brands.find((x) => x.id === id);
    return b ? `<button class="fchip on t-bodyS" data-a="untaste" data-id="${esc(id)}">${esc(b.brandNameKo || b.brandName)} ✕</button>` : '';
  }).join('');
  const t = (S.searchTerm || '').trim().toLowerCase();
  let hits = '';
  if (t) {
    const found = S.brands.filter((b) =>
      b.brandNameKo.toLowerCase().includes(t) ||
      b.brandName.toLowerCase().includes(t) ||
      b.distilleryName.toLowerCase().includes(t)).slice(0, 12);
    hits = found.length
      ? found.map((b) => `<div class="glass clickable" style="padding:calc(16 * var(--s));cursor:pointer" data-a="taste" data-id="${esc(b.id)}">
          <div class="t-titleS c-ivory">${esc(b.brandNameKo || b.brandName)}</div>
          <div class="t-bodyS c-gray">${esc(b.brandName)} · ${esc(b.officialRegionKo)}</div>
        </div>`).join('')
      : `<div class="t-bodyM c-gray">검색 결과가 없습니다.</div>`;
  }
  return `<div style="max-width:calc(900 * var(--s))">
    <input class="search t-bodyL" id="q-search" placeholder="브랜드 · 증류소 검색 (초성 가능)" value="${esc(S.searchTerm || '')}">
    ${vs(16)}
    <div class="chips">${chips || `<span class="t-bodyS c-gray">선택한 브랜드가 없어도 다음으로 넘어갈 수 있습니다.</span>`}</div>
    ${vs(16)}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:calc(12 * var(--s))">${hits}</div>
  </div>`;
}

function quizBrandRating() {
  if (!S.answers.tastedBrandIds.length) {
    return `<div class="t-bodyL c-gray">평가할 브랜드가 없습니다. 다음으로 넘어가 주세요.</div>`;
  }
  return `<div style="display:flex;flex-direction:column;gap:calc(16 * var(--s));max-width:calc(1000 * var(--s))">` +
    S.answers.tastedBrandIds.map((id) => {
      const b = S.brands.find((x) => x.id === id);
      if (!b) return '';
      const cur = S.answers.brandRatings.get(id);
      const opts = Object.values(E.BRAND_RATINGS).map((r) =>
        `<button class="fchip t-bodyS${cur === r.optionId ? ' on' : ''}" data-a="rate" data-id="${esc(id)}" data-opt="${esc(r.optionId)}">${esc(r.label)}</button>`).join('');
      return `<div class="glass" style="padding:calc(20 * var(--s))">
        <div class="t-titleS c-ivory">${esc(b.brandNameKo || b.brandName)}</div>
        ${vs(12)}<div class="chips">${opts}</div>
      </div>`;
    }).join('') + `</div>`;
}

/* --------------------------------------------------------------- 분석 중 */
function viewAnalyzing() {
  const inner = ['glass', 'floral', 'spice', 'smoke', 'honey'].map((n, i) =>
    `<g transform="translate(${38 + (i % 3) * 9} ${40 + Math.floor(i / 3) * 9}) scale(0.42)" opacity="0.55">
       <g stroke="rgba(242,235,221,0.75)" stroke-width="1.6" fill="none"
          stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</g></g>`).join('');
  return `<div class="scaffold"><div class="box">
    <div class="glass-wrap">${glencairnSVG(0.72, { inner })}</div>
    ${vs(46)}
    <div class="t-titleL c-amber">가장 잘 맞는 싱글몰트를 찾았습니다</div>
    ${vs(8)}
    <div class="t-bodyM c-gray">선택하신 답변과 브랜드 향미 데이터를 직접 비교합니다.</div>
  </div></div>`;
}

/* ------------------------------------------------------------------ 결과 */
function viewResult() {
  const r = S.result;
  if (!r || r.insufficient || !r.recommendations.length) {
    return `<div class="scaffold">
      <div class="head">${logo(true)}<div class="grow"></div>${ghost('restart', '처음부터 다시 하기', 300)}</div>
      <div class="main" style="justify-content:center;align-items:center;text-align:center">
        <div class="t-titleL c-ivory">조건에 맞는 브랜드를 찾지 못했습니다</div>${vs(12)}
        <div class="t-bodyL c-dim">조건을 조금 완화해 다시 시도해 주세요.</div>
      </div>
      <div class="foot">${notice()}</div>
    </div>`;
  }
  const rec = r.recommendations[0];
  const b = rec.scored.brand;
  const mix = r.profileMix.map((m) => badge(`${m.profile.nameKo} ${m.percent}%`, 'gold')).join('');
  const reasons = rec.reasons.map((x) => `<li class="t-bodyL">${esc(x)}</li>`).join('');
  const tags = E.flavorTags(b, S.vector, 5).map((t) => `<span class="chip t-caption">${esc(t)}</span>`).join('');

  return `<div class="scaffold">
    <div class="head">${logo(true)}<div class="grow"></div>${ghost('restart', '처음부터 다시 하기', 300)}</div>
    <div class="main">
      ${sectionLabel('당신에게 가장 잘 맞는 싱글몰트')}
      ${vs(18)}
      <div class="res-body">
        <div class="res-left">
          <div style="width:calc(150 * var(--s));height:calc(230 * var(--s))">${bottleSVG()}</div>
          ${vs(26)}
          <div style="position:relative;width:calc(200 * var(--s));height:calc(200 * var(--s))">
            ${gaugeSVG(rec.scored.matchPercent)}
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div class="t-metric c-ivory">${rec.scored.matchPercent}%</div>
              <div class="t-caption c-gray">취향 일치도</div>
            </div>
          </div>
        </div>
        <div class="res-right scroll-y">
          <div class="t-displayL c-ivory">${esc(b.brandName)}</div>
          ${vs(6)}
          <div class="t-bodyL c-gold">${esc(b.brandNameKo)} · ${esc(b.brandName)} · ${esc(b.officialRegionKo)}</div>
          ${vs(16)}
          <div class="chips">${mix}</div>
          ${vs(8)}
          <div class="t-caption c-graydim">비율은 전체 통계가 아니라 선택한 답변으로 계산한 내부 취향 점수입니다.</div>
          ${vs(24)}
          <div class="t-titleM c-ivory">추천 이유</div>
          ${vs(12)}
          <ul class="reasons" style="display:flex;flex-direction:column;gap:calc(12 * var(--s))">${reasons}</ul>
          ${vs(22)}
          <div class="chips">${tags}</div>
          ${vs(12)}
          <div class="t-caption c-graydim">취향 일치도는 선택한 답변과 브랜드 향미 데이터의 내부 비교 점수입니다.</div>
        </div>
      </div>
    </div>
    <div class="foot ruled row">
      ${ghost('detail-best', '상세 보기', 280)}
      ${hs(16)}
      ${ghost('compare', '다른 추천 비교', 280)}
      <div class="grow" style="text-align:center">${notice()}</div>
      ${primary('compare', '전체 결과 보기', 340)}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 비교 */
function viewCompare() {
  const r = S.result;
  const cards = r.recommendations.map((rec, i) => {
    const b = rec.scored.brand;
    const role = E.ROLES.find((x) => x.id === rec.role);
    const isBest = rec.role === 'BEST';
    return `<div class="glass clickable cmp-card${isBest ? ' sel' : ''}" data-a="detail-rec" data-i="${i}">
      <div class="side">
        <div style="width:calc(84 * var(--s));height:calc(130 * var(--s))">${bottleSVG()}</div>
        <div class="t-metricS ${isBest ? 'c-amber' : 'c-dim'}">${rec.scored.matchPercent}%</div>
      </div>
      <div class="body">
        ${sectionLabel(role.label)}
        ${vs(8)}
        <div class="t-displayM c-ivory">${esc(b.brandName)}</div>
        <div class="t-bodyM c-gray">${esc(b.brandNameKo)} · ${esc(b.officialRegionKo)}</div>
        ${vs(14)}
        <div style="display:flex;flex-direction:column;gap:calc(6 * var(--s))">
          <div class="kv"><span class="k t-bodyM">피트</span><span class="v t-bodyM">${E.brandValue(b, 'smokeIntensity')}/5</span></div>
          <div class="kv"><span class="k t-bodyM">단맛</span><span class="v t-bodyM">${E.brandValue(b, 'sweetness')}/5</span></div>
          <div class="kv"><span class="k t-bodyM">과일</span><span class="v t-bodyM">${E.brandValue(b, 'freshOrchardFruit')}/5</span></div>
          <div class="kv"><span class="k t-bodyM">캐스크</span><span class="v t-bodyM">${esc(dominantCask(b))}</span></div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="scaffold">
    <div class="head">
      ${logo(true)}${hs(4)}<div class="t-titleM c-ivory">추천 결과 비교</div>
      <div class="grow"></div>
      ${ghost('result', '이전', 220)}${hs(16)}${ghost('restart', '처음부터 다시 하기', 300)}
    </div>
    <div class="main"><div class="cmp-grid scroll-y">${cards}</div></div>
    <div class="foot ruled row">
      <div class="t-caption c-graydim">${NOTICE}</div>
      <div class="grow"></div>
      <div class="t-caption c-graydim">국내 유통 정보는 변동될 수 있습니다.</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 상세 */
function viewDetail() {
  const b = S.detailBrand;
  const v = S.vector;
  const prof = E.classifyBrandProfile(b);
  const conf = b.confidence === 'High' ? 'success' : b.confidence === 'Medium' ? 'caution' : 'gray';

  if (S.detailSources) return viewSources(b);

  const flavour = E.FLAVOR.map((k) => intensityBar(k, E.brandValue(b, k), false)).join('');
  const casks = E.CASK.map((k) => intensityBar(k, E.brandValue(b, k), true)).join('');
  const reasons = v ? E.reasonsFor(b, v, 'BEST') : [];
  const adv = v ? E.servingAdvice(b, v) : '';

  return `<div class="scaffold">
    <div class="head">
      ${logo(true)}
      <div class="grow"></div>
      ${ghost('sources', '정보 출처 보기', 300)}${hs(16)}${ghost('detail-back', '이전', 200)}
    </div>
    <div class="main scroll-y">
      <div class="det-top">
        <div style="flex:none;width:calc(130 * var(--s));height:calc(210 * var(--s))">${bottleSVG()}</div>
        <div class="grow">
          <div class="t-displayL c-ivory">${esc(b.brandName)}</div>
          <div class="t-bodyL c-gold">${esc(b.brandNameKo)}</div>
          ${vs(14)}
          <div class="chips">
            ${badge(b.officialRegionKo, 'gold')}
            ${b.releaseStatusLabel ? badge(b.releaseStatusLabel, 'success') : ''}
            ${badge('신뢰도 ' + b.confidence, conf)}
          </div>
          ${vs(16)}
          <div class="t-bodyL c-dim">${esc(b.descriptionKo || '브랜드 설명 데이터는 준비 중입니다.')}</div>
          ${prof ? `${vs(12)}<div class="t-bodyS c-gray">대표 성향 · ${esc(prof.nameKo)} — ${esc(prof.descriptionKo)}</div>` : ''}
        </div>
      </div>
      ${vs(24)}<div class="hairline"></div>${vs(24)}
      <div class="det-cols">
        <div>
          ${sectionLabel('FLAVOUR')}${vs(14)}
          <div style="display:flex;flex-direction:column;gap:calc(10 * var(--s))">${flavour}</div>
        </div>
        <div>
          ${sectionLabel('CASK')}${vs(14)}
          <div style="display:flex;flex-direction:column;gap:calc(10 * var(--s))">${casks}</div>
          ${vs(28)}
          ${sectionLabel('DATA')}${vs(14)}
          <div style="display:flex;flex-direction:column;gap:calc(8 * var(--s))">
            <div class="kv"><span class="k t-bodyM">대표 제품</span><span class="v t-bodyM">${esc(b.representativeExpression || '-')}</span></div>
            <div class="kv"><span class="k t-bodyM">도수</span><span class="v t-bodyM">${b.representativeAbv != null ? b.representativeAbv + '%' : '-'}</span></div>
            <div class="kv"><span class="k t-bodyM">숙성 연수</span><span class="v t-bodyM">${esc(b.ageStatement || 'NAS')}</span></div>
            <div class="kv"><span class="k t-bodyM">가격대</span><span class="v t-bodyM">${esc((E.PRICE_DEFAULTS.find((p) => p.code === b.priceBand) || {}).label || '가격 정보 미확정')}</span></div>
            <div class="kv"><span class="k t-bodyM">국내 유통</span><span class="v t-bodyM">${esc(E.Availability.labelKo(b.koreaAvailability))}</span></div>
            <div class="kv"><span class="k t-bodyM">증류소</span><span class="v t-bodyM">${esc(b.distilleryName)}</span></div>
          </div>
        </div>
        <div>
          ${sectionLabel('PROFILE')}${vs(14)}
          <div style="width:100%;aspect-ratio:1/1">${radarSVG(b)}</div>
          ${reasons.length ? `${vs(20)}${sectionLabel('WHY')}${vs(12)}
            <ul class="reasons" style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:calc(10 * var(--s))">
              ${reasons.map((x) => `<li class="t-bodyS c-dim">${esc(x)}</li>`).join('')}
            </ul>` : ''}
          ${adv ? `${vs(16)}<div class="t-bodyS c-gray">${esc(adv)}</div>` : ''}
        </div>
      </div>
      ${vs(24)}
    </div>
    <div class="foot ruled">${notice()}</div>
  </div>`;
}

function viewSources(b) {
  const rows = [
    ['브랜드 목록', b.sourceUrl], ['출시 상태', b.statusSourceUrl],
    ['증류소 목록', b.distillerySourceUrl], ['향미 프로파일', b.profileSourceUrl],
  ].filter(([, u]) => u).map(([k, u]) =>
    `<div class="kv"><span class="k t-bodyM">${esc(k)}</span><span class="v t-bodyS" style="word-break:break-all">${esc(u)}</span></div>`).join('');
  return `<div class="scaffold">
    <div class="head">${logo(true)}${hs(4)}<div class="t-titleM c-ivory">정보 출처</div>
      <div class="grow"></div>${ghost('sources-back', '이전', 200)}</div>
    <div class="main scroll-y">
      <div class="t-displayM c-ivory">${esc(b.brandName)}</div>${vs(20)}
      <div style="display:flex;flex-direction:column;gap:calc(14 * var(--s))">${rows || `<div class="t-bodyM c-gray">등록된 출처가 없습니다.</div>`}</div>
      ${vs(24)}
      <div class="t-bodyS c-gray">기준일 ${esc(b.dataAsOf || S.meta.dataAsOf)} · 데이터 버전 ${esc(S.meta.dataVersion)}</div>
      ${vs(10)}
      <div class="t-caption c-graydim">향미 수치는 공개 자료를 바탕으로 정리한 상대 지표이며 공식 수치가 아닙니다.</div>
    </div>
    <div class="foot ruled">${notice()}</div>
  </div>`;
}

/* -------------------------------------------------------------- 브랜드 목록 */
const SORTS = [['ko', '가나다순'], ['en', '알파벳순'], ['match', '취향 일치도순'], ['recent', '최근 검증순']];

function indexList() {
  const t = S.idxQuery.trim().toLowerCase();
  const scores = S.result ? new Map(S.result.ranked.map((x) => [x.brand.id, x.matchPercent])) : new Map();
  let list = S.brands.filter((b) => b.adminVisible);
  if (S.idxRegions.size) list = list.filter((b) => S.idxRegions.has(b.officialRegionKo));
  if (S.idxStatus.size) list = list.filter((b) => S.idxStatus.has(b.releaseStatusLabel));
  if (t) {
    list = list.filter((b) =>
      b.brandNameKo.toLowerCase().includes(t) ||
      b.brandName.toLowerCase().includes(t) ||
      b.distilleryName.toLowerCase().includes(t));
  }
  const cmp = {
    ko: (a, b) => (a.brandNameKo || a.brandName).localeCompare(b.brandNameKo || b.brandName, 'ko'),
    en: (a, b) => a.brandName.localeCompare(b.brandName, 'en'),
    match: (a, b) => (scores.get(b.id) || -1) - (scores.get(a.id) || -1),
    recent: (a, b) => String(b.lastVerifiedAt || '').localeCompare(String(a.lastVerifiedAt || '')),
  }[S.idxSort];
  return { list: list.slice().sort(cmp), scores };
}

function viewIndex() {
  const { list, scores } = indexList();
  const regions = [...new Set(S.brands.map((b) => b.officialRegionKo))].filter(Boolean);
  const statuses = [...new Set(S.brands.map((b) => b.releaseStatusLabel))].filter(Boolean);

  const sortChips = SORTS.map(([k, l]) =>
    `<button class="fchip t-bodyS${S.idxSort === k ? ' on' : ''}" data-a="sort" data-k="${k}">${S.idxSort === k ? '✓ ' : ''}${esc(l)}</button>`).join('');
  const regionChips = regions.map((r) =>
    `<button class="fchip t-bodyS${S.idxRegions.has(r) ? ' on' : ''}" data-a="region" data-k="${esc(r)}">${esc(r)}</button>`).join('');
  const statusChips = statuses.map((r) =>
    `<button class="fchip t-bodyS${S.idxStatus.has(r) ? ' on' : ''}" data-a="status" data-k="${esc(r)}">${esc(r)}</button>`).join('');

  const cards = list.map((b) => {
    const pct = scores.get(b.id);
    const tags = b.hasFlavor ? E.flavorTags(b, S.vector, 3) : [];
    return `<div class="glass clickable bcard${b.hasFlavor ? '' : ' muted'}" data-a="detail-brand" data-id="${esc(b.id)}">
      <div style="flex:none;width:calc(44 * var(--s));height:calc(74 * var(--s))">${bottleSVG()}</div>
      <div class="body">
        <div class="t-titleS c-ivory">${esc(b.brandName)}</div>
        <div class="t-bodyS c-dim">${esc(b.brandNameKo)}</div>
        <div class="t-bodyS c-gold">${esc(b.distilleryName)} · ${esc(b.officialRegionKo)}</div>
        ${vs(6)}
        ${b.hasFlavor
          ? `<div class="t-bodyS c-dim">${tags.map((x) => '· ' + esc(x)).join('  ')}</div>
             <div class="t-bodyS c-gray">피트 ${E.brandValue(b, 'smokeIntensity')}/5</div>`
          : `<div class="t-bodyS c-gray">향미 데이터 조사 중</div>`}
        ${vs(8)}
        <div class="chipwrap">
          ${pct != null ? badge(`일치 ${pct}%`, 'amber') : ''}
          ${b.recommendable && b.hasFlavor ? badge('추천 가능', 'success') : badge('숙성 중', 'gray')}
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="scaffold">
    <div class="head">
      ${logo(true)}${hs(4)}
      <div>
        <div class="t-displayM c-ivory">모든 브랜드 둘러보기</div>
        <div class="t-bodyS c-gray">전체 ${S.brands.length}개 · 검색 결과 ${list.length}개</div>
      </div>
      <div class="grow"></div>
      ${ghost('home', '처음으로', 240)}
    </div>
    ${vs(14)}
    <div class="main idx-body">
      <div class="rail scroll-y">
        <input class="search t-bodyM" id="idx-search" placeholder="브랜드 · 증류소 검색 (초성 가능)" value="${esc(S.idxQuery)}">
        ${vs(22)}<div class="t-label c-gold">정렬</div>${vs(10)}<div class="chips">${sortChips}</div>
        ${vs(22)}<div class="t-label c-gold">공식 지역</div>${vs(10)}<div class="chips">${regionChips}</div>
        ${vs(22)}<div class="t-label c-gold">출시 상태</div>${vs(10)}<div class="chips">${statusChips}</div>
        ${vs(24)}
      </div>
      <div class="cards scroll-y"><div class="grid3">${cards || `<div class="t-bodyL c-gray">조건에 맞는 브랜드가 없습니다.</div>`}</div></div>
    </div>
    <div class="foot ruled row">
      <div class="t-caption c-graydim">${NOTICE}</div>
      <div class="grow"></div>
      <div class="t-caption c-graydim">미출시·숙성 중 브랜드는 회색 카드로 구분되며 기본 추천에서 제외됩니다.</div>
    </div>
  </div>`;
}

/* -------------------------------------------------------------- 향미 가이드 */
const GUIDE_TOPICS = [
  { icon: 'smoke', title: '피트란 무엇인가', summary: '보리를 말릴 때 사용하는 이탄이 만드는 향입니다.', body: [
    '피트(peat)는 습지에서 오랜 시간에 걸쳐 쌓인 식물 퇴적층입니다. 이 이탄을 태워 젖은 보리를 건조하면 연기 성분이 보리에 스며듭니다.',
    '이 성분은 증류를 거쳐 위스키에 남아 훈연향, 소독약 같은 향, 흙과 이끼 향으로 나타납니다.',
    '피트의 강도는 페놀 수치(ppm)로 설명되기도 하지만, 실제로 잔에서 느껴지는 세기는 증류 방식과 숙성 기간에 따라 달라집니다.',
    '피트를 처음 접한다면 강도가 낮은 브랜드부터 시작해 보는 것이 편안합니다.'] },
  { icon: 'bonfire', title: '스모크 종류', summary: '같은 연기라도 방향이 다릅니다.', body: [
    '모닥불 계열 — 마른 장작을 태운 듯한 따뜻한 훈연향입니다.',
    '재와 숯 계열 — 다 타고 남은 재처럼 드라이하고 미네랄 같은 인상을 줍니다.',
    '훈제 고기 계열 — 바비큐나 베이컨을 연상시키는 기름진 훈연향입니다.',
    '흙과 이끼 계열 — 젖은 땅, 이끼, 낙엽 같은 축축한 향입니다.',
    '메디시널 계열 — 요오드, 소독약, 반창고를 떠올리게 하는 강한 향으로 호불호가 가장 큽니다.'] },
  { icon: 'driedfruit', title: '셰리 캐스크', summary: '건과일과 향신료를 더하는 숙성 방식입니다.', body: [
    '셰리 와인을 담았던 오크통에서 숙성하면 건포도, 무화과, 대추야자 같은 진한 과일 향이 더해집니다.',
    '올로로소(Oloroso)는 견과와 향신료가 함께 느껴지는 드라이한 방향, PX는 훨씬 달고 걸쭉한 방향입니다.',
    '최근에는 셰리를 잠시 담아 길들인 셰리 시즌드 오크도 널리 쓰입니다.',
    '셰리 숙성은 색이 짙어지는 경향이 있지만, 색만으로 맛의 세기를 판단할 수는 없습니다.'] },
  { icon: 'vanilla', title: '버번 캐스크', summary: '바닐라와 코코넛, 캐러멜의 기본기를 만듭니다.', body: [
    '버번을 담았던 아메리칸 오크통은 스카치 숙성에 가장 널리 쓰입니다.',
    '내부를 그을린 아메리칸 오크에서 바닐린 성분이 녹아 나와 바닐라, 코코넛, 캐러멜 향이 생깁니다.',
    '비교적 밝고 산뜻한 과일 향과 잘 어울려 균형 잡힌 스타일을 만듭니다.'] },
  { icon: 'redfruit', title: '와인과 포트 캐스크', summary: '붉은 과일과 달콤한 산미를 더합니다.', body: [
    '포트 캐스크는 체리, 자두, 붉은 베리 같은 향과 부드러운 단맛을 남깁니다.',
    '레드 와인 캐스크는 떫은 타닌과 함께 와인 같은 산미를 남기기도 합니다.',
    '짧게 마무리 숙성(피니시)만 하는 경우가 많아 브랜드 안에서도 제품별 편차가 큽니다.'] },
  { icon: 'cask', title: '바디감', summary: '입안에서 느껴지는 무게입니다.', body: [
    '가벼운 바디는 물처럼 산뜻하게 지나가고, 무거운 바디는 기름지고 두껍게 남습니다.',
    '바디는 도수와 같지 않습니다. 도수가 낮아도 오일리한 질감으로 무겁게 느껴질 수 있습니다.',
    '왁시(waxy)한 질감은 밀랍이나 촛농을 만졌을 때처럼 매끈하게 코팅되는 감각을 말합니다.'] },
  { icon: 'oak', title: '피니시', summary: '삼킨 뒤 남는 여운입니다.', body: [
    '피니시는 길이(짧다/길다)와 방향(달콤/과일/향신료/드라이/스모크)으로 나눠 볼 수 있습니다.',
    '길다고 항상 좋은 것은 아닙니다. 식전에 가볍게 마실 때는 짧고 깔끔한 피니시가 더 어울립니다.'] },
  { icon: 'wave', title: '해안 풍미', summary: '짭조름함과 바다 공기를 느끼게 하는 요소입니다.', body: [
    '해안가 증류소의 위스키에서 소금기, 해초, 조개 껍데기 같은 인상을 느끼는 경우가 있습니다.',
    '다만 이것이 바닷바람 때문이라는 설명은 과학적으로 확정된 것이 아닙니다.',
    '실제로는 캐스크 종류, 증류 방식, 페놀 성분이 함께 만들어내는 복합적인 인상에 가깝습니다.'] },
  { icon: 'glass', title: '위스키에 물을 넣는 이유', summary: '향을 여는 실용적인 방법입니다.', body: [
    '물을 몇 방울 더하면 알코올의 자극이 줄고 가려져 있던 향 성분이 드러나는 경우가 많습니다.',
    '도수가 높은 캐스크 스트렝스일수록 변화가 큽니다.',
    '정답은 없으므로 먼저 스트레이트로 확인한 뒤 조금씩 더해 보는 방식을 권합니다.'] },
  { icon: 'earth', title: '지역과 향미의 관계', summary: '지역은 배경일 뿐 결론이 아닙니다.', body: [
    '스코틀랜드는 하이랜드, 스페이사이드, 로우랜드, 아일라, 캠벨타운으로 구분하며 아일랜즈를 실무적으로 따로 부르기도 합니다.',
    '지역은 위스키를 이해하는 하나의 배경이지만, 같은 지역 안에서도 증류 방식과 캐스크에 따라 향미가 크게 달라질 수 있습니다.',
    '이 앱의 추천도 지역이 아니라 브랜드별 향미 데이터를 기준으로 계산합니다.'] },
];

function viewGuide() {
  const i = Math.max(0, Math.min(GUIDE_TOPICS.length - 1, S.guideIndex));
  const t = GUIDE_TOPICS[i];
  const rail = GUIDE_TOPICS.map((x, k) => `
    <div class="glass clickable g-item${k === i ? ' sel' : ''}" data-a="topic" data-i="${k}">
      <span class="ficon">${iconSvg(x.icon)}</span>
      <span>
        <span class="t-titleS ${k === i ? 'c-ivory' : 'c-dim'}" style="display:block">${esc(x.title)}</span>
        <span class="t-caption c-gray" style="display:block">${esc(x.summary)}</span>
      </span>
    </div>`).join('');

  return `<div class="scaffold">
    <div class="head">
      ${logo(true)}${hs(4)}<div class="t-titleM c-ivory">싱글몰트 향미 알아보기</div>
      <div class="grow"></div>${ghost('home', '처음으로', 200)}
    </div>
    ${vs(16)}
    <div class="main g-body">
      <div class="g-rail scroll-y">${rail}</div>
      <div class="g-main scroll-y">
        ${sectionLabel('FLAVOUR GUIDE')}
        ${vs(12)}
        <div class="row" style="gap:calc(20 * var(--s))">
          <span class="ficon c-amber" style="width:calc(56 * var(--s));height:calc(56 * var(--s));flex:none">${iconSvg(t.icon)}</span>
          <span class="t-displayM c-ivory">${esc(t.title)}</span>
        </div>
        ${vs(24)}
        ${t.body.map((p) => `<div class="t-bodyL c-dim">${esc(p)}</div>${vs(16)}`).join('')}
        ${vs(12)}
        <div class="t-caption c-graydim">이 가이드는 향미를 이해하기 위한 일반 설명이며 건강상의 효능을 의미하지 않습니다.</div>
        ${vs(24)}
      </div>
    </div>
    <div class="foot ruled">${notice()}</div>
  </div>`;
}

/* ==========================================================================
   6. 라우팅
   ========================================================================== */
const VIEWS = {
  age: viewAge, idle: viewIdle, quiz: viewQuiz, analyzing: viewAnalyzing,
  result: viewResult, compare: viewCompare, detail: viewDetail,
  index: viewIndex, guide: viewGuide,
};

function render() {
  app.innerHTML = `<div class="screen on" id="s-${S.route}">${VIEWS[S.route]()}</div>`;
}
function go(route) { S.route = route; render(); }

/* ==========================================================================
   7. 흐름
   ========================================================================== */
function startQuiz() {
  S.engine = new E.AdaptiveQuestionEngine(S.questions, S.pool, new E.RecommendationEngine());
  S.answers = E.emptyAnswerState();
  S.result = null; S.vector = null; S.searchTerm = '';
  const n = S.engine.next(S.answers);
  S.current = n.question;
  S.finishReason = n.reason;
  go('quiz');
}

function hasPrevious() {
  const order = S.answers.askedOrder;
  const cur = S.current ? S.current.id : null;
  if (!cur) return order.length > 0;
  return order.includes(cur) && order.indexOf(cur) > 0;
}

function goNext() {
  const q = S.current;
  if (!q || !E.canProceed(q, S.answers)) return;
  const r = E.advance(S.engine, q, S.answers);
  S.answers = r.state;
  S.current = r.next.question;
  S.finishReason = r.next.reason;
  S.searchTerm = '';
  if (r.next.finished || !S.current) analyze();
  else render();
}

function goPrev() {
  const order = S.answers.askedOrder;
  const cur = S.current ? S.current.id : null;
  const prevId = (cur && order.includes(cur)) ? order[order.indexOf(cur) - 1] : order[order.length - 1];
  if (prevId == null) return;
  const prev = S.engine.question(prevId);
  if (!prev) return;
  S.answers = E.cloneAnswerState(S.answers);
  S.answers.askedOrder = order.slice(0, order.indexOf(prevId));
  S.current = prev;
  render();
}

function compute() {
  S.vector = S.engine.buildVector(S.answers);
  S.result = new E.RecommendationEngine().recommend(
    S.pool, S.vector, new Set(S.answers.tastedBrandIds), S.answers.brandRatings,
    S.finishReason === 'MAX_REACHED');
}

function analyze() {
  go('analyzing');
  setTimeout(() => { compute(); go('result'); }, 1400);
}

function openDetail(brand, from) {
  S.detailBrand = brand;
  S.detailFrom = from;
  S.detailSources = false;
  go('detail');
}

/* ==========================================================================
   8. 이벤트 (위임)
   ========================================================================== */
app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const a = el.dataset.a;

  switch (a) {
    case 'age-yes': return go('idle');
    case 'age-no': return go('age');
    case 'home': return go('idle');
    case 'start': return startQuiz();
    case 'index': return go('index');
    case 'guide': return go('guide');
    case 'prev': return goPrev();
    case 'next': return goNext();
    case 'result': return go('result');
    case 'compare': return go('compare');
    case 'restart': return startQuiz();
    case 'sources': S.detailSources = true; return render();
    case 'sources-back': S.detailSources = false; return render();
    case 'detail-back': return go(S.detailFrom);
    case 'topic': S.guideIndex = +el.dataset.i; return render();
    case 'sort': S.idxSort = el.dataset.k; return render();
    case 'detail-best':
      return openDetail(S.result.recommendations[0].scored.brand, 'result');
    case 'detail-rec':
      return openDetail(S.result.recommendations[+el.dataset.i].scored.brand, 'compare');
    case 'detail-brand': {
      const b = S.brands.find((x) => x.id === el.dataset.id);
      if (b) openDetail(b, 'index');
      return;
    }
    case 'region': {
      const k = el.dataset.k;
      S.idxRegions.has(k) ? S.idxRegions.delete(k) : S.idxRegions.add(k);
      return render();
    }
    case 'status': {
      const k = el.dataset.k;
      S.idxStatus.has(k) ? S.idxStatus.delete(k) : S.idxStatus.add(k);
      return render();
    }
    case 'opt': {
      const q = S.current;
      const opts = q.options.filter((o) => o.active);
      S.answers = E.applySelection(q, S.answers, opts[+el.dataset.i].id);
      return render();
    }
    case 'taste': {
      const id = el.dataset.id;
      if (S.answers.tastedBrandIds.includes(id) || S.answers.tastedBrandIds.length >= 10) return;
      S.answers = E.cloneAnswerState(S.answers);
      S.answers.tastedBrandIds.push(id);
      return render();
    }
    case 'untaste': {
      const id = el.dataset.id;
      S.answers = E.cloneAnswerState(S.answers);
      S.answers.tastedBrandIds = S.answers.tastedBrandIds.filter((x) => x !== id);
      S.answers.brandRatings.delete(id);
      return render();
    }
    case 'rate': {
      S.answers = E.cloneAnswerState(S.answers);
      S.answers.brandRatings.set(el.dataset.id, el.dataset.opt);
      return render();
    }
    default: return;
  }
});

app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'idx-search') {
    S.idxQuery = t.value;
    const cards = app.querySelector('.cards');
    const top = cards ? cards.scrollTop : 0;
    render();
    const inp = app.querySelector('#idx-search');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    const c2 = app.querySelector('.cards');
    if (c2) c2.scrollTop = top;
  } else if (t.id === 'q-search') {
    S.searchTerm = t.value;
    render();
    const inp = app.querySelector('#q-search');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
});

/* ==========================================================================
   9. 부팅
   ========================================================================== */
async function loadData() {
  if (window.__MSM_DATA__) return window.__MSM_DATA__;
  const [b, q] = await Promise.all([
    fetch('data/brands.json').then((r) => r.json()),
    fetch('data/questions.json').then((r) => r.json()),
  ]);
  return { brands: b, questions: q };
}

async function boot() {
  let payload;
  try {
    payload = await loadData();
  } catch (err) {
    app.innerHTML = '<div class="scaffold"><div class="main" style="justify-content:center;align-items:center">' +
      '<div class="t-titleM c-ivory">데이터를 불러오지 못했습니다.</div></div></div>';
    console.error(err);
    return;
  }
  S.brands = E.parseBrands(payload.brands);
  S.questions = E.parseQuestions(payload.questions).filter((q) => q.active);
  S.pool = S.brands.filter((b) => b.adminVisible && b.recommendable && b.hasFlavor && !b.isUpcoming);
  S.meta = {
    dataVersion: payload.brands.dataVersion || '',
    dataAsOf: payload.brands.dataAsOf || '',
  };
  render();
}

/* 자동 검증용 훅 */
window.MSM = {
  S, E, go, start: startQuiz, next: goNext,
  pickOption: (i) => {
    const opts = app.querySelectorAll('.opt');
    if (opts[i]) opts[i].click();
  },
  autoRun(policy = 0) {
    startQuiz();
    let guard = 0;
    while (S.current && guard < 60) {
      guard += 1;
      const q = S.current;
      const opts = q.options.filter((o) => o.active);
      if (opts.length) {
        const start = policy % opts.length;
        const need = q.selectionType === 'MULTI' ? Math.max(q.minSelection, 1) : 1;
        for (let i = 0; i < need; i++) {
          S.answers = E.applySelection(q, S.answers, opts[(start + i) % opts.length].id);
        }
      }
      const r = E.advance(S.engine, q, S.answers);
      S.answers = r.state;
      S.current = r.next.question;
      S.finishReason = r.next.reason;
      if (r.next.finished || !S.current) break;
    }
    compute();
    go('result');
    return {
      asked: S.answers.askedOrder.length,
      reason: S.finishReason,
      top: S.result.recommendations.map((x) => [x.role, x.scored.brand.id, x.scored.matchPercent]),
      rank: S.result.ranked.slice(0, 4).map((x) => [x.brand.id, x.matchPercent]),
    };
  },
};

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

boot();
