/*
 * 나만의 싱글몰트 - 관리자 화면 (웹)
 *
 * 안드로이드 ui/screens/AdminScreen.kt 를 웹으로 옮긴 것.
 *  - 저장 위치는 이 기기의 브라우저(localStorage) 이며 다른 사용자에게는 반영되지 않는다.
 *  - 원본 데이터 파일은 그대로 두고 "덮어쓸 값"만 저장한다(오버라이드 방식).
 *  - 수정한 내용은 JSON / CSV 로 내려받아 다른 기기에 옮길 수 있다.
 */
import * as ENG from './engine.js?v=8';

/* ==========================================================================
   0. 저장소
   ========================================================================== */
const KEY = 'msm.admin.v1';

const DEFAULTS = {
  pin: null,                       // { salt, hash, iter }
  showBrandIndexMenu: true,
  showFlavorGuideMenu: true,
  reduceMotion: false,
  includeLimitedAndRare: true,
  allowLowConfidenceAsBest: false,
  maxPerDistillery: 1,
  adventureMinScore: 65,
  weights: { ...ENG.DEFAULT_WEIGHTS },
  priceLabels: ENG.PRICE_DEFAULTS.slice(0, 4).map((p) => p.label),
  brands: {},                      // id -> { adminVisible, recommendable, flavor{} }
  questions: {},                   // id -> { active }
  editLog: [],                     // { at, brandId, feature, from, to, editor, reason, sourceUrl }
  backups: [],                     // { name, at, payload }
};

let D = { ...DEFAULTS };
let toast = '';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw);
    return {
      ...DEFAULTS, ...o,
      weights: { ...ENG.DEFAULT_WEIGHTS, ...(o.weights || {}) },
      priceLabels: (o.priceLabels && o.priceLabels.length === 4)
        ? o.priceLabels : DEFAULTS.priceLabels,
      brands: o.brands || {}, questions: o.questions || {},
      editLog: o.editLog || [], backups: o.backups || [],
    };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(D));
  } catch (e) {
    toast = '저장 공간이 부족합니다. 백업을 정리해 주세요.';
  }
}

export function load() { D = read(); return D; }

export function settings() {
  return {
    weights: { ...D.weights },
    options: {
      includeLimitedAndRare: D.includeLimitedAndRare,
      allowLowConfidenceAsBest: D.allowLowConfidenceAsBest,
      maxPerDistillery: D.maxPerDistillery,
      adventureMinScore: D.adventureMinScore,
    },
    showBrandIndexMenu: D.showBrandIndexMenu,
    showFlavorGuideMenu: D.showFlavorGuideMenu,
    reduceMotion: D.reduceMotion,
    priceLabels: D.priceLabels.slice(),
    pinSet: !!(D.pin && D.pin.hash),
  };
}

/** 저장된 오버라이드를 파싱된 브랜드/질문 배열에 반영한다.
 *  먼저 원본 값으로 되돌린 뒤 적용하므로 수정을 취소하면 원래대로 돌아온다. */
export function applyOverrides(brands, questions) {
  brands.forEach((b) => {
    if (!b.__orig) {
      b.__orig = {
        adminVisible: b.adminVisible, recommendable: b.recommendable,
        hasFlavor: b.hasFlavor, f: b.f.slice(),
      };
    } else {
      b.adminVisible = b.__orig.adminVisible;
      b.recommendable = b.__orig.recommendable;
      b.hasFlavor = b.__orig.hasFlavor;
      for (let i = 0; i < b.f.length; i++) b.f[i] = b.__orig.f[i];
    }
    const o = D.brands[b.id];
    if (!o) return;
    if (typeof o.adminVisible === 'boolean') b.adminVisible = o.adminVisible;
    if (typeof o.recommendable === 'boolean') b.recommendable = o.recommendable;
    if (o.flavor) {
      Object.entries(o.flavor).forEach(([k, v]) => {
        const i = ENG.indexOf(k);
        if (i >= 0) b.f[i] = v;
      });
      b.hasFlavor = b.f.slice(0, ENG.FLAVOR.length).some((x) => x > 0) || b.hasFlavor;
    }
  });
  questions.forEach((q) => {
    if (q.__origActive === undefined) q.__origActive = q.active;
    else q.active = q.__origActive;
    const o = D.questions[q.id];
    if (o && typeof o.active === 'boolean') q.active = o.active;
  });
}

/* ==========================================================================
   1. PIN (평문 저장하지 않음)
   ========================================================================== */
const ITER = 20000;

function hex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** WebCrypto 를 쓸 수 없는 환경(file://)을 위한 대체 해시. */
function fallbackHash(pin, salt) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = salt + '|' + pin;
  for (let r = 0; r < 400; r++) {
    for (let i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i) + r;
      h1 = (h1 * 16777619) >>> 0;
      h2 = (h2 ^ h1) >>> 0;
      h2 = ((h2 << 5) | (h2 >>> 27)) >>> 0;
    }
  }
  return 'fb' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

async function derive(pin, salt) {
  const c = window.crypto;
  if (!c || !c.subtle) return fallbackHash(pin, salt);
  const enc = new TextEncoder();
  const key = await c.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await c.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITER, hash: 'SHA-256' }, key, 256);
  return hex(bits);
}

function randomSalt() {
  const c = window.crypto;
  if (c && c.getRandomValues) return hex(c.getRandomValues(new Uint8Array(16)));
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

async function setPin(pin) {
  const salt = randomSalt();
  D.pin = { salt, hash: await derive(pin, salt), iter: ITER };
  save();
}

async function verifyPin(pin) {
  if (!D.pin || !D.pin.hash) return false;
  return (await derive(pin, D.pin.salt)) === D.pin.hash;
}

/* ==========================================================================
   2. 화면 상태
   ========================================================================== */
const MENUS = [
  ['dashboard', '데이터 현황', '브랜드 수·향미 확보율·검증 필요'],
  ['brands', '브랜드 관리', '노출/추천 여부, 검색'],
  ['flavor', '향미 데이터 편집', '34축 값 수정과 변경 이력'],
  ['questions', '질문 관리', '질문 활성/비활성'],
  ['weights', '추천 가중치', '합계 100 검증'],
  ['options', '추천 옵션', '한정판 포함, 다양성 규칙'],
  ['price', '가격대 표시', '가격 구간 이름'],
  ['display', '화면·운영 설정', '메뉴 노출, 모션'],
  ['pin', '관리자 PIN', 'PIN 변경'],
  ['import', '데이터 가져오기', '향미 CSV / 백업 JSON'],
  ['export', '데이터 내보내기', 'CSV·JSON 파일 저장'],
  ['backup', '백업·복원', '이 기기에 저장된 스냅숏'],
  ['logs', '로그·진단', '수정 이력과 앱 정보'],
];

const V = {
  menu: 'dashboard',
  locked: true,
  pinInput: '', pinConfirm: '', pinError: '',
  pinCur: '', pinNew: '', pinNew2: '',
  bQuery: '', bIssuesOnly: false,
  fQuery: '', fBrandId: '', fEditor: '', fReason: '', fSource: '', fMsg: '',
  wDraft: null,
  priceDraft: null,
  importKind: 'flavor',
  preview: null, importMsg: '',
  confirmRestore: '',
};

let CTX = null;   // app.js 가 넘겨주는 { S, refresh, reload, exit }

/* 로고 비밀 탭 (안드로이드: 2.6초 안에 7회) */
let tapCount = 0, tapFirst = 0;
export function tapLogo() {
  const now = Date.now();
  if (now - tapFirst > 2600) { tapFirst = now; tapCount = 0; }
  tapCount += 1;
  if (tapCount >= 7) { tapCount = 0; tapFirst = 0; return true; }
  return false;
}

export function reset() {
  V.locked = true;
  V.pinInput = ''; V.pinConfirm = ''; V.pinError = '';
  V.menu = 'dashboard';
  toast = '';
}

/* ==========================================================================
   3. 렌더 조각
   ========================================================================== */
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const vs = (n) => `<div style="height:calc(${n} * var(--s))"></div>`;
const hair = '<div class="hairline"></div>';
const label = (t) => `<div class="section-label t-role">${esc(t)}</div>`;

const ghost = (a, t, w, off, extra) =>
  `<button class="btn btn-ghost t-bodyM${off ? ' off' : ''}" data-a="${a}"${extra || ''}` +
  `${w ? ` style="width:calc(${w} * var(--s))"` : ''}${off ? ' disabled' : ''}>${esc(t)}</button>`;

const primary = (a, t, w, off, extra) =>
  `<button class="btn btn-primary t-bodyM${off ? ' off' : ''}" data-a="${a}"${extra || ''}` +
  `${w ? ` style="width:calc(${w} * var(--s))"` : ''}${off ? ' disabled' : ''}>${esc(t)}</button>`;

const kv = (k, v) =>
  `<div class="kv t-bodyS"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

function page(title, subtitle, body) {
  return `<div class="ad-page scroll-y">
    <div class="t-titleL c-ivory">${esc(title)}</div>
    ${vs(6)}
    <div class="t-bodyS c-gray" style="white-space:pre-line">${esc(subtitle)}</div>
    ${vs(20)}
    ${body}
    ${vs(32)}
  </div>`;
}

function stat(l, v) {
  return `<div class="glass ad-stat"><div class="t-caption c-gray">${esc(l)}</div>
    ${vs(6)}<div class="t-displayS c-amber">${esc(v)}</div></div>`;
}

function toggle(act, text, on, off, data) {
  return `<div class="ad-toggle" data-a="${off ? '' : act}"${data || ''}>
    <div class="t-bodyS ${off ? 'c-graydim' : 'c-dim'} grow">${esc(text)}</div>
    <div class="sw${on ? ' on' : ''}${off ? ' dis' : ''}"><i></i></div>
  </div>`;
}

function stepper(act, key, text, value) {
  const k = key ? ` data-k="${key}"` : '';
  return `<div class="ad-step">
    <div class="t-bodyS c-dim grow">${esc(text)}</div>
    <button class="stepb t-titleS" data-a="${act}"${k} data-d="-1">&minus;</button>
    <div class="stepv t-titleS c-amber">${esc(value)}</div>
    <button class="stepb t-titleS" data-a="${act}"${k} data-d="1">+</button>
  </div>`;
}

function field(id, value, placeholder, opts) {
  const o = opts || {};
  return `<input class="ad-field t-bodyM" id="${id}" value="${esc(value)}" ` +
    `placeholder="${esc(placeholder)}" ${o.password ? 'type="password" ' : ''}` +
    `${o.numeric ? 'inputmode="numeric" ' : ''}autocomplete="off" spellcheck="false">`;
}

/* ==========================================================================
   4. PIN 게이트
   ========================================================================== */
function viewGate() {
  const first = !(D.pin && D.pin.hash);
  return `<div class="ad-gate">
    <div class="glass ad-gate-card">
      ${label('ADMINISTRATOR')}
      ${vs(12)}
      <div class="t-titleL c-ivory">${first ? '관리자 PIN 설정' : '관리자 인증'}</div>
      ${vs(8)}
      <div class="t-bodyM c-gray" style="text-align:center">${first
        ? '최초 진입입니다. 숫자 4~8자리 PIN 을 설정해 주세요.'
        : 'PIN 을 입력해 주세요.'}</div>
      ${vs(28)}
      ${field('ad-pin', V.pinInput, 'PIN', { password: true, numeric: true })}
      ${first ? vs(12) + field('ad-pin2', V.pinConfirm, 'PIN 확인', { password: true, numeric: true }) : ''}
      ${V.pinError ? vs(12) + `<div class="t-bodyS" style="color:var(--danger);text-align:center">${esc(V.pinError)}</div>` : ''}
      ${vs(28)}
      <div class="row" style="gap:calc(12 * var(--s));width:100%">
        ${ghost('ad-cancel', '취소', 0, false, ' style="flex:1"')}
        ${primary('ad-unlock', first ? '설정하고 진입' : '확인', 0, false, ' style="flex:1"')}
      </div>
    </div>
  </div>`;
}

/* ==========================================================================
   5. 각 패널
   ========================================================================== */
function panelDashboard() {
  const all = CTX.S.brands;
  const withFlavor = all.filter((b) => b.hasFlavor).length;
  const pool = CTX.S.pool.length;
  const needs = all.filter((b) => b.needsReview).length;
  const hidden = all.filter((b) => !b.adminVisible).length;
  const dist = new Set(all.map((b) => b.distillerySlug)).size;

  const byRegion = {};
  all.forEach((b) => {
    const k = b.officialRegionKo || '미분류';
    byRegion[k] = (byRegion[k] || 0) + 1;
  });
  const regions = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);

  return page('데이터 현황', '이 기기에 반영되어 있는 데이터 상태입니다.',
    `<div class="ad-stats">
      ${stat('전체 브랜드', all.length)}${stat('추천 가능', pool)}
      ${stat('향미 확보', withFlavor)}${stat('검증 필요', needs)}
     </div>
     ${vs(24)}
     ${kv('데이터 버전', CTX.S.meta.dataVersion || '-')}
     ${kv('고유 증류소', dist + '곳')}
     ${kv('숨김 처리', hidden + '개')}
     ${kv('향미 미조사', (all.length - withFlavor) + '개')}
     ${kv('관리자 수정', Object.keys(D.brands).length + '개 브랜드')}
     ${vs(16)}${hair}${vs(16)}
     ${label('지역별 분포')}${vs(10)}
     ${regions.map(([r, n]) => kv(r, n + '개')).join('')}
     ${vs(16)}${hair}${vs(16)}
     ${label('신뢰도')}${vs(10)}
     ${['High', 'Medium', 'Low'].map((c) =>
      kv(c, all.filter((b) => b.confidence === c).length + '개')).join('')}`);
}

function panelBrands() {
  const q = V.bQuery.trim().toLowerCase();
  const list = CTX.S.brands.filter((b) => {
    const m = !q || b.brandName.toLowerCase().includes(q) ||
      b.brandNameKo.includes(V.bQuery.trim()) || b.distilleryName.toLowerCase().includes(q);
    return m && (!V.bIssuesOnly || b.needsReview || !b.hasFlavor);
  });

  const rows = list.slice(0, 400).map((b) => `<div class="glass ad-row">
    <div class="grow">
      <div class="t-bodyL c-ivory">${esc(b.brandName)}</div>
      <div class="t-caption c-gray">${esc(b.distilleryName)} · ${esc(b.officialRegionKo)} · ${esc(b.releaseStatusLabel)}</div>
    </div>
    ${!b.hasFlavor ? '<span class="badge tone-danger t-caption">향미 없음</span>' : ''}
    ${b.needsReview ? '<span class="badge tone-caution t-caption">검증 필요</span>' : ''}
    ${toggle('ad-bvis', '노출', b.adminVisible, false, ` data-id="${b.id}"`)}
    ${toggle('ad-brec', '추천', b.recommendable, false, ` data-id="${b.id}"`)}
  </div>`).join('');

  return page('브랜드 관리', '노출 여부와 추천 후보 포함 여부를 조정합니다.',
    `<div class="row" style="gap:calc(16 * var(--s))">
      <input class="search t-bodyM grow" id="ad-bq" value="${esc(V.bQuery)}" placeholder="브랜드 · 증류소 검색">
      <div style="width:calc(220 * var(--s))">${toggle('ad-bissue', '검증 필요만', V.bIssuesOnly)}</div>
     </div>
     ${vs(8)}
     <div class="t-caption c-graydim">${list.length}개 표시 중${list.length > 400 ? ' (앞 400개만 표시)' : ''}</div>
     ${vs(12)}
     <div class="ad-list">${rows}</div>`);
}

function panelFlavor() {
  const q = V.fQuery.trim().toLowerCase();
  const cands = CTX.S.brands
    .filter((b) => !q || b.brandName.toLowerCase().includes(q) || b.brandNameKo.includes(V.fQuery.trim()))
    .slice(0, 60);
  const brand = CTX.S.brands.find((b) => b.id === V.fBrandId);

  const left = `<div class="ad-fl-left">
    <input class="search t-bodyM" id="ad-fq" value="${esc(V.fQuery)}" placeholder="브랜드 검색">
    ${vs(10)}
    <div class="ad-list" style="max-height:calc(560 * var(--s))">
      ${cands.map((b) => `<div class="glass clickable ${b.id === V.fBrandId ? 'sel' : ''} ad-fl-item" data-a="ad-fpick" data-id="${b.id}">
        <div class="t-bodyM c-ivory">${esc(b.brandName)}</div>
        <div class="t-caption ${b.hasFlavor ? 'c-gray' : ''}"${b.hasFlavor ? '' : ' style="color:var(--danger)"'}>
          ${b.hasFlavor ? '향미 있음 · ' + esc(b.confidence) : '향미 없음'}</div>
      </div>`).join('')}
    </div>
  </div>`;

  let right;
  if (!brand) {
    right = '<div class="t-bodyM c-gray">왼쪽에서 브랜드를 선택하세요.</div>';
  } else {
    const rowsFor = (keys) => keys.map((k) => {
      const v = ENG.brandValue(brand, k);
      const cells = [0, 1, 2, 3, 4, 5].map((n) =>
        `<div class="lv${n === v ? ' on' : ''}" data-a="ad-fset" data-k="${k}" data-v="${n}">${n}</div>`).join('');
      return `<div class="ad-fl-row"><div class="t-bodyS c-dim nm">${esc(ENG.featureLabel(k))}</div>${cells}</div>`;
    }).join('');

    right = `<div class="grow">
      <div class="t-titleM c-ivory">${esc(brand.brandName)}</div>
      ${vs(4)}
      <div class="t-caption c-graydim">출처: ${esc(brand.profileSourceUrl || brand.sourceUrl || '-')}</div>
      ${vs(14)}
      <div class="row" style="gap:calc(10 * var(--s))">
        ${field('ad-feditor', V.fEditor, '편집자')}
        ${field('ad-freason', V.fReason, '수정 사유')}
      </div>
      ${vs(10)}
      ${field('ad-fsource', V.fSource, '근거 출처 URL (필수)')}
      ${vs(6)}
      <div class="t-caption c-graydim">출처가 없는 향미 값은 저장할 수 없습니다.</div>
      ${V.fMsg ? vs(8) + `<div class="t-bodyS" style="color:var(--success)">${esc(V.fMsg)}</div>` : ''}
      ${vs(14)}${hair}${vs(10)}
      <div class="scroll-y" style="max-height:calc(420 * var(--s))">
        ${label('향미 34축')}${vs(8)}${rowsFor(ENG.FLAVOR)}
        ${vs(14)}${label('캐스크 10축')}${vs(8)}${rowsFor(ENG.CASK)}
      </div>
    </div>`;
  }

  return page('향미 데이터 편집', '수정 시 편집자·사유·출처 URL 을 반드시 남깁니다.',
    `<div class="row" style="align-items:flex-start;gap:calc(24 * var(--s))">${left}${right}</div>`);
}

function panelQuestions() {
  const qs = CTX.S.allQuestions;
  const rows = qs.map((q) => `<div class="glass ad-row">
    <div class="t-label c-gold" style="width:calc(70 * var(--s));flex:none">${esc(q.id)}</div>
    <div class="grow">
      <div class="t-bodyM c-ivory">${esc(q.title)}</div>
      <div class="t-caption c-gray">${esc(q.category)} · 선택지 ${q.options.length}개 · ${esc(q.selectionType)}</div>
    </div>
    ${q.isMandatory ? '<span class="badge tone-amber t-caption">필수</span>' : ''}
    ${toggle('ad-qact', '활성', q.active, q.isMandatory, ` data-id="${q.id}"`)}
  </div>`).join('');

  return page('질문 관리', '필수 질문은 비활성화할 수 없습니다.',
    `<div class="ad-stats">
      ${stat('전체 질문', qs.length)}
      ${stat('활성', qs.filter((q) => q.active).length)}
      ${stat('필수', qs.filter((q) => q.isMandatory).length)}
     </div>
     ${vs(20)}<div class="ad-list">${rows}</div>`);
}

const W_ROWS = [
  ['coreFlavor', '핵심 향미'], ['peatTexture', '피트·질감'], ['cask', '캐스크'],
  ['serving', '음용 방식'], ['budgetAvailability', '예산·구매 접근성'], ['dataQuality', '데이터 신뢰도'],
];

function panelWeights() {
  if (!V.wDraft) V.wDraft = { ...D.weights };
  const total = W_ROWS.reduce((s, [k]) => s + V.wDraft[k], 0);
  return page('추천 가중치', '여섯 항목의 합계가 정확히 100 이어야 저장됩니다.',
    W_ROWS.map(([k, t]) => stepper('ad-w', k, t, V.wDraft[k])).join('') +
    `${vs(16)}${hair}${vs(12)}
     <div class="t-titleS" style="color:var(--${total === 100 ? 'success' : 'danger'})">합계 ${total} / 100</div>
     ${vs(20)}
     <div class="row" style="gap:calc(12 * var(--s))">
       ${ghost('ad-wdefault', '기본값으로', 220)}
       ${primary('ad-wsave', '저장', 220, total !== 100)}
     </div>`);
}

function panelOptions() {
  return page('추천 옵션', '결과 구성 규칙을 조정합니다.',
    `${toggle('ad-orare', '한정·희귀 병입 포함', D.includeLimitedAndRare)}
     <div class="t-caption c-graydim">끄면 구하기 어려운 한정 병입을 결과에서 제외합니다.</div>
     ${vs(16)}
     ${toggle('ad-olow', '신뢰도 Low 도 1순위 허용', D.allowLowConfidenceAsBest)}
     <div class="t-caption c-graydim">기본값은 꺼짐입니다. 근거가 약한 데이터를 1순위로 내세우지 않기 위한 안전장치입니다.</div>
     ${vs(20)}${hair}${vs(16)}
     ${stepper('ad-omax', '', '같은 증류소 최대 노출', D.maxPerDistillery)}
     ${stepper('ad-oadv', '', '모험 추천 최소 점수', D.adventureMinScore)}`);
}

function panelPrice() {
  if (!V.priceDraft) V.priceDraft = D.priceLabels.slice();
  return page('가격대 표시', '결과 화면에 보여줄 가격 구간 이름입니다. 실제 판매 가격은 매장 기준을 따릅니다.',
    V.priceDraft.map((v, i) => `<div class="row" style="gap:calc(12 * var(--s));padding:calc(4 * var(--s)) 0">
      <div class="t-bodyS c-gray" style="width:calc(90 * var(--s));flex:none">구간 ${i + 1}</div>
      ${field('ad-price-' + i, v, '구간 이름')}
    </div>`).join('') +
    `${vs(20)}
     <div class="row" style="gap:calc(12 * var(--s))">
       ${ghost('ad-pdefault', '기본값으로', 200)}
       ${primary('ad-psave', '저장', 200)}
     </div>`);
}

function panelDisplay() {
  return page('화면·운영 설정', '태블릿 사용 환경에 맞게 화면 동작을 조정합니다.',
    `${toggle('ad-dindex', "대기 화면에 '전체 브랜드' 표시", D.showBrandIndexMenu)}
     ${toggle('ad-dguide', "대기 화면에 '향미 알아보기' 표시", D.showFlavorGuideMenu)}
     ${toggle('ad-dmotion', '애니메이션 줄이기', D.reduceMotion)}
     ${vs(20)}${hair}${vs(16)}
     <div class="t-caption c-graydim">웹 버전에는 유휴 자동 초기화와 키오스크 모드가 없습니다.
     브라우저를 새로 고치면 처음 화면으로 돌아갑니다.</div>`);
}

function panelPin() {
  return page('관리자 PIN', 'PIN 은 해시로만 저장되며 어디에도 평문으로 남지 않습니다.',
    `<div style="max-width:calc(460 * var(--s))">
      ${field('ad-pcur', V.pinCur, '현재 PIN', { password: true, numeric: true })}
      ${vs(10)}${field('ad-pnew', V.pinNew, '새 PIN (숫자 4~8자리)', { password: true, numeric: true })}
      ${vs(10)}${field('ad-pnew2', V.pinNew2, '새 PIN 확인', { password: true, numeric: true })}
      ${V.pinError ? vs(10) + `<div class="t-bodyS" style="color:var(--danger)">${esc(V.pinError)}</div>` : ''}
      ${vs(20)}${primary('ad-pchange', 'PIN 변경', 0, false, ' style="width:100%"')}
    </div>`);
}

function panelImport() {
  const kinds = [
    ['flavor', '향미 CSV', '내보내기한 향미 CSV 를 수정해 다시 넣습니다.'],
    ['json', '백업 JSON', '이전에 내보낸 관리자 설정 전체를 되돌립니다.'],
  ];
  const p = V.preview;
  let pv = '';
  if (p) {
    pv = `${vs(20)}${hair}${vs(16)}${label('가져오기 미리보기')}${vs(10)}
      ${kv('읽은 행', p.totalRows + '행')}
      ${kv('변경', p.updates.length + '개')}
      ${kv('변경 없음', p.unchanged + '개')}
      ${p.errors.length ? `${vs(12)}<div class="t-label" style="color:var(--danger)">오류</div>` +
        p.errors.map((e) => `<div class="t-bodyS" style="color:var(--danger)">· ${esc(e)}</div>`).join('') : ''}
      ${p.warnings.length ? `${vs(12)}<div class="t-label" style="color:var(--caution)">주의</div>
        <div class="scroll-y" style="max-height:calc(160 * var(--s))">` +
        p.warnings.map((e) => `<div class="t-bodyS c-gray">· ${esc(e)}</div>`).join('') + '</div>' : ''}
      ${p.updates.length ? `${vs(12)}<div class="t-label c-gold">변경 내역</div>
        <div class="scroll-y" style="max-height:calc(220 * var(--s))">` +
        p.updates.slice(0, 120).map(([n, ds]) =>
          `<div class="t-bodyS c-ivory">· ${esc(n)}</div>` +
          ds.map((x) => `<div class="t-caption c-gray" style="padding-left:calc(16 * var(--s))">${esc(x)}</div>`).join('')
        ).join('') + '</div>' : ''}
      ${vs(20)}${primary('ad-iapply', '이대로 반영', 260, p.errors.length > 0)}`;
  }

  return page('데이터 가져오기', '반영 전에 변경 내용을 먼저 확인합니다. 반영 시 자동 백업이 만들어집니다.',
    `<div class="row" style="gap:calc(12 * var(--s));align-items:stretch">
      ${kinds.map(([k, t, d]) => `<div class="glass clickable grow ad-kind ${V.importKind === k ? 'sel' : ''}" data-a="ad-ikind" data-k="${k}">
        <div class="t-bodyL ${V.importKind === k ? 'c-amber' : 'c-ivory'}">${esc(t)}</div>
        ${vs(6)}<div class="t-caption c-gray">${esc(d)}</div>
      </div>`).join('')}
     </div>
     ${vs(20)}
     <div class="row" style="gap:calc(12 * var(--s))">
       ${primary('ad-ipick', '파일 선택', 240)}
       ${p ? ghost('ad-icancel', '취소', 160) : ''}
     </div>
     ${V.importMsg ? vs(12) + `<div class="t-bodyS" style="color:var(--danger)">${esc(V.importMsg)}</div>` : ''}
     ${pv}
     <input type="file" id="ad-file" style="display:none" accept=".csv,.json,text/csv,application/json">`);
}

function panelExport() {
  const rows = [
    ['ad-xbrands', '브랜드 전체 CSV', '마스터 정보'],
    ['ad-xflavor', '향미 CSV', '34+10축 값 (수정 후 다시 가져오기 가능)'],
    ['ad-xsource', '출처 목록 CSV', '브랜드별 근거 URL'],
    ['ad-xqueue', '조사 대기 목록 CSV', '향미 자료가 없는 브랜드'],
    ['ad-xlog', '수정 이력 CSV', '누가·언제·왜 바꿨는지'],
    ['ad-xjson', '관리자 설정 백업 JSON', '다른 기기로 옮길 때 사용'],
  ];
  return page('데이터 내보내기', '파일은 브라우저의 다운로드 폴더에 저장됩니다.',
    rows.map(([a, t, d]) => `<div class="glass ad-row">
      <div class="grow"><div class="t-bodyM c-ivory">${esc(t)}</div>
      <div class="t-caption c-gray">${esc(d)}</div></div>
      ${ghost(a, '저장', 150)}
    </div>`).join(''));
}

function panelBackup() {
  const list = D.backups;
  return page('백업·복원', '가져오기를 반영할 때마다 자동으로 백업이 생성됩니다. 최근 5개까지 보관합니다.',
    `<div class="row" style="gap:calc(12 * var(--s))">
      ${primary('ad-bnow', '지금 백업', 220)}
     </div>
     ${vs(20)}
     ${list.length === 0 ? '<div class="t-bodyM c-gray">백업이 없습니다.</div>' :
      `<div class="ad-list">${list.map((f, i) => `<div class="glass ad-row">
        <div class="grow"><div class="t-bodyM c-ivory">${esc(f.name)}</div>
        <div class="t-caption c-gray">${esc(f.at)} · ${Math.round(f.payload.length / 1024)}KB</div></div>
        ${V.confirmRestore === f.name
        ? `<div class="t-caption" style="color:var(--danger)">현재 설정을 덮어씁니다.</div>
           ${ghost('ad-rcancel', '취소', 110)}${primary('ad-rdo', '복원 실행', 160, false, ` data-i="${i}"`)}`
        : ghost('ad-rask', '복원', 140, false, ` data-n="${esc(f.name)}"`)}
      </div>`).join('')}</div>`}`);
}

function panelLogs() {
  const logs = D.editLog.slice(0, 200);
  return page('로그·진단', '문제가 생겼을 때 확인할 정보입니다.',
    `${kv('버전', '웹 1.0')}
     ${kv('데이터 버전', CTX.S.meta.dataVersion || '-')}
     ${kv('저장 위치', '이 브라우저 (localStorage)')}
     ${kv('저장 용량', Math.round(JSON.stringify(D).length / 1024) + 'KB')}
     ${vs(16)}${hair}${vs(12)}
     ${label('향미 수정 이력')}${vs(8)}
     ${logs.length === 0 ? '<div class="t-bodyS c-gray">기록된 수정이 없습니다.</div>' :
      `<div class="scroll-y" style="max-height:calc(460 * var(--s))">${logs.map((l) =>
        `<div class="t-caption c-gray">${esc(l.at)} · ${esc(l.brandId)} · ${esc(l.feature)} ${l.from}→${l.to} · ${esc(l.editor)} · ${esc(l.reason)}</div>`).join('')}</div>`}
     ${vs(20)}${hair}${vs(16)}
     ${ghost('ad-wipe', '관리자 수정 전체 초기화', 320)}
     ${vs(8)}
     <div class="t-caption c-graydim">저장한 값을 모두 지우고 원본 데이터로 되돌립니다.</div>`);
}

const PANELS = {
  dashboard: panelDashboard, brands: panelBrands, flavor: panelFlavor,
  questions: panelQuestions, weights: panelWeights, options: panelOptions,
  price: panelPrice, display: panelDisplay, pin: panelPin,
  import: panelImport, export: panelExport, backup: panelBackup, logs: panelLogs,
};

/* ==========================================================================
   6. 화면
   ========================================================================== */
export function view(ctx) {
  CTX = ctx;
  if (V.locked) return viewGate();
  return `<div class="ad-wrap">
    <div class="ad-rail scroll-y">
      <div class="t-titleM c-ivory">관리자 설정</div>
      ${vs(4)}<div class="t-caption c-gold">MY SINGLE MALT</div>
      ${vs(20)}${hair}${vs(12)}
      ${MENUS.map(([k, t, d]) => `<div class="ad-menu${k === V.menu ? ' on' : ''}" data-a="ad-menu" data-k="${k}">
        <div class="t-bodyM ${k === V.menu ? 'c-ivory' : 'c-dim'}">${esc(t)}</div>
        <div class="t-caption c-graydim">${esc(d)}</div>
      </div>`).join('')}
      ${vs(20)}${ghost('ad-exit', '관리자 종료', 0, false, ' style="width:100%"')}
      ${vs(20)}
    </div>
    <div class="ad-body">
      ${(PANELS[V.menu] || panelDashboard)()}
      ${toast ? `${hair}<div class="row" style="padding-top:calc(12 * var(--s));gap:calc(12 * var(--s))">
        <div class="t-bodyS grow" style="color:var(--success)">${esc(toast)}</div>
        ${ghost('ad-toast', '닫기', 120)}</div>` : ''}
    </div>
  </div>`;
}

/* ==========================================================================
   7. 동작
   ========================================================================== */
function brandOverride(id) {
  if (!D.brands[id]) D.brands[id] = {};
  return D.brands[id];
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fileStamp() {
  return stamp().replace(/[-: ]/g, '').slice(0, 14);
}

function download(name, text, mime) {
  const blob = new Blob(['\uFEFF' + text], { type: (mime || 'text/csv') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csvRow = (a) => a.map(csvCell).join(',');

function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let sb = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q && c === '"' && src[i + 1] === '"') { sb += '"'; i++; }
    else if (c === '"') q = !q;
    else if (!q && c === ',') { row.push(sb); sb = ''; }
    else if (!q && (c === '\n' || c === '\r')) {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(sb); sb = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else sb += c;
  }
  row.push(sb);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

function backupNow(tag) {
  const name = `backup-${tag}-${fileStamp()}.json`;
  const payload = JSON.stringify({
    brands: D.brands, questions: D.questions, weights: D.weights,
    priceLabels: D.priceLabels,
    includeLimitedAndRare: D.includeLimitedAndRare,
    allowLowConfidenceAsBest: D.allowLowConfidenceAsBest,
    maxPerDistillery: D.maxPerDistillery, adventureMinScore: D.adventureMinScore,
    showBrandIndexMenu: D.showBrandIndexMenu, showFlavorGuideMenu: D.showFlavorGuideMenu,
    reduceMotion: D.reduceMotion,
  });
  D.backups.unshift({ name, at: stamp(), payload });
  D.backups = D.backups.slice(0, 5);
  save();
  return name;
}

function restore(payload) {
  const o = JSON.parse(payload);
  D = { ...D, ...o };
  save();
  CTX.reload();
}

function exportBrandsCsv() {
  const head = ['id', 'brandName', 'brandNameKo', 'distilleryName', 'officialRegionKo',
    'releaseStatusLabel', 'sourceUrl', 'dataAsOf', 'recommendable', 'adminVisible',
    'koreaAvailability', 'priceBand', 'representativeExpression', 'representativeAbv',
    'ageStatement', 'confidence', 'researchStatus', 'needsReview', 'lastVerifiedAt',
    'hasFlavor', 'descriptionKo'];
  const body = CTX.S.brands.map((b) => csvRow(head.map((k) => b[k])));
  download(`brands-${fileStamp()}.csv`, csvRow(head) + '\n' + body.join('\n'));
}

function exportFlavorCsv() {
  const axes = ENG.FLAVOR.concat(ENG.CASK);
  const head = ['id', 'brandName', 'hasFlavor', 'confidence'].concat(axes);
  const body = CTX.S.brands.map((b) => csvRow(
    [b.id, b.brandName, b.hasFlavor, b.confidence].concat(axes.map((k) => ENG.brandValue(b, k)))));
  download(`flavor-${fileStamp()}.csv`, csvRow(head) + '\n' + body.join('\n'));
}

function exportSourceCsv() {
  const head = ['id', 'brandName', 'sourceUrl', 'statusSourceUrl', 'distillerySourceUrl', 'profileSourceUrl', 'dataAsOf'];
  const body = CTX.S.brands.map((b) => csvRow(head.map((k) => b[k])));
  download(`sources-${fileStamp()}.csv`, csvRow(head) + '\n' + body.join('\n'));
}

function exportQueueCsv() {
  const head = ['id', 'brandName', 'distilleryName', 'officialRegionKo', 'releaseStatusRaw', 'sourceUrl', 'researchStatus'];
  const body = CTX.S.brands.filter((b) => !b.hasFlavor || b.researchStatus !== 'curated')
    .map((b) => csvRow(head.map((k) => b[k])));
  download(`research-queue-${fileStamp()}.csv`, csvRow(head) + '\n' + body.join('\n'));
}

function exportEditLogCsv() {
  const head = ['editedAt', 'brandId', 'feature', 'previousValue', 'newValue', 'editor', 'reason', 'sourceUrl'];
  const body = D.editLog.map((l) => csvRow([l.at, l.brandId, l.feature, l.from, l.to, l.editor, l.reason, l.sourceUrl]));
  download(`flavor-edit-log-${fileStamp()}.csv`, csvRow(head) + '\n' + body.join('\n'));
}

function previewFlavorCsv(text) {
  const errors = []; const warnings = []; const updates = [];
  const rows = parseCsv(text);
  if (rows.length < 2) return { totalRows: 0, updates, unchanged: 0, errors: ['데이터 행이 없습니다.'], warnings, staged: [] };
  const head = rows[0].map((h) => h.trim());
  const idx = {}; head.forEach((h, i) => { idx[h] = i; });
  if (!('id' in idx)) errors.push("'id' 열이 필요합니다.");
  const axes = ENG.FLAVOR.concat(ENG.CASK);
  const missing = axes.filter((a) => !(a in idx));
  if (missing.length === axes.length) errors.push('향미 열을 찾을 수 없습니다. 내보내기 CSV 형식을 사용하세요.');
  else if (missing.length) warnings.push('일부 열이 없어 기존 값을 유지합니다: ' + missing.slice(0, 5).join(', '));
  if (errors.length) return { totalRows: rows.length - 1, updates, unchanged: 0, errors, warnings, staged: [] };

  const byId = new Map(CTX.S.brands.map((b) => [b.id, b]));
  const staged = []; let unchanged = 0;
  rows.slice(1).forEach((r, n) => {
    const id = (r[idx.id] || '').trim();
    if (!id) return;
    const b = byId.get(id);
    if (!b) { warnings.push(`${n + 2}행: 알 수 없는 id '${id}' — 건너뜁니다.`); return; }
    const diffs = []; const vals = {};
    axes.forEach((k) => {
      if (!(k in idx)) return;
      const raw = (r[idx[k]] || '').trim();
      if (raw === '') return;
      const v = parseInt(raw, 10);
      if (isNaN(v) || v < 0 || v > 5) { warnings.push(`${n + 2}행 ${k}: '${raw}' 은 0~5 범위가 아니어서 무시합니다.`); return; }
      const cur = ENG.brandValue(b, k);
      if (cur !== v) { diffs.push(`${ENG.featureLabel(k)} ${cur}→${v}`); vals[k] = v; }
    });
    if (!diffs.length) { unchanged++; return; }
    updates.push([b.brandName, diffs]);
    staged.push({ id, vals });
  });
  return { totalRows: rows.length - 1, updates, unchanged, errors, warnings, staged };
}

function applyPreview(p) {
  backupNow('import');
  p.staged.forEach(({ id, vals }) => {
    const o = brandOverride(id);
    if (!o.flavor) o.flavor = {};
    const b = CTX.S.brands.find((x) => x.id === id);
    Object.entries(vals).forEach(([k, v]) => {
      D.editLog.unshift({
        at: stamp(), brandId: id, feature: k,
        from: b ? ENG.brandValue(b, k) : '', to: v,
        editor: '관리자', reason: 'CSV 가져오기', sourceUrl: '',
      });
      o.flavor[k] = v;
    });
  });
  D.editLog = D.editLog.slice(0, 1000);
  save();
  CTX.reload();
  return p.staged.length;
}

/** app.js 의 클릭 위임에서 호출한다. 처리했으면 true. */
export function action(a, el, ctx) {
  CTX = ctx;
  if (!a || a.indexOf('ad-') !== 0) return false;

  switch (a) {
    case 'ad-cancel':
      reset(); ctx.exit(); return true;

    case 'ad-unlock': {
      const first = !(D.pin && D.pin.hash);
      (async () => {
        if (first) {
          if (!/^\d{4,8}$/.test(V.pinInput)) V.pinError = '숫자 4~8자리로 입력해 주세요.';
          else if (V.pinInput !== V.pinConfirm) V.pinError = '두 번 입력한 PIN 이 서로 다릅니다.';
          else {
            await setPin(V.pinInput);
            V.locked = false; V.pinInput = ''; V.pinConfirm = ''; V.pinError = '';
          }
        } else if (await verifyPin(V.pinInput)) {
          V.locked = false; V.pinInput = ''; V.pinError = '';
        } else {
          V.pinInput = ''; V.pinError = 'PIN 이 올바르지 않습니다.';
        }
        ctx.refresh();
      })();
      return true;
    }

    case 'ad-menu':
      V.menu = el.dataset.k; V.wDraft = null; V.priceDraft = null;
      V.preview = null; V.importMsg = ''; toast = '';
      ctx.refresh(); return true;

    case 'ad-exit': reset(); ctx.exit(); return true;
    case 'ad-toast': toast = ''; ctx.refresh(); return true;

    /* ---------------------------------------------------------- 브랜드 */
    case 'ad-bissue': V.bIssuesOnly = !V.bIssuesOnly; ctx.refresh(); return true;
    case 'ad-bvis': {
      const b = ctx.S.brands.find((x) => x.id === el.dataset.id);
      if (b) { brandOverride(b.id).adminVisible = !b.adminVisible; save(); ctx.reload(); }
      return true;
    }
    case 'ad-brec': {
      const b = ctx.S.brands.find((x) => x.id === el.dataset.id);
      if (b) { brandOverride(b.id).recommendable = !b.recommendable; save(); ctx.reload(); }
      return true;
    }

    /* ---------------------------------------------------------- 향미 */
    case 'ad-fpick': V.fBrandId = el.dataset.id; V.fMsg = ''; ctx.refresh(); return true;
    case 'ad-fset': {
      if (!V.fSource.trim()) { V.fMsg = '출처 URL 을 먼저 입력하세요.'; ctx.refresh(); return true; }
      const b = ctx.S.brands.find((x) => x.id === V.fBrandId);
      if (!b) return true;
      const k = el.dataset.k; const v = +el.dataset.v;
      const o = brandOverride(b.id);
      if (!o.flavor) o.flavor = {};
      D.editLog.unshift({
        at: stamp(), brandId: b.id, feature: k, from: ENG.brandValue(b, k), to: v,
        editor: V.fEditor.trim() || '관리자', reason: V.fReason.trim() || '수동 조정',
        sourceUrl: V.fSource.trim(),
      });
      D.editLog = D.editLog.slice(0, 1000);
      o.flavor[k] = v;
      save();
      V.fMsg = `${ENG.featureLabel(k)} 값을 ${v} 로 저장했습니다.`;
      ctx.reload();
      return true;
    }

    /* ---------------------------------------------------------- 질문 */
    case 'ad-qact': {
      const id = el.dataset.id;
      const q = ctx.S.allQuestions.find((x) => x.id === id);
      if (q && !q.isMandatory) {
        if (!D.questions[id]) D.questions[id] = {};
        D.questions[id].active = !q.active;
        save(); ctx.reload();
      }
      return true;
    }

    /* ---------------------------------------------------------- 가중치 */
    case 'ad-w': {
      if (!V.wDraft) V.wDraft = { ...D.weights };
      const k = el.dataset.k; const d = +el.dataset.d;
      V.wDraft[k] = Math.max(0, Math.min(100, V.wDraft[k] + d));
      ctx.refresh(); return true;
    }
    case 'ad-wdefault': V.wDraft = { ...ENG.DEFAULT_WEIGHTS }; ctx.refresh(); return true;
    case 'ad-wsave': {
      const t = W_ROWS.reduce((s, [k]) => s + V.wDraft[k], 0);
      if (t !== 100) return true;
      D.weights = { ...V.wDraft }; save(); toast = '가중치를 저장했습니다.';
      ctx.reload(); return true;
    }

    /* ---------------------------------------------------------- 옵션 */
    case 'ad-orare': D.includeLimitedAndRare = !D.includeLimitedAndRare; save(); toast = '추천 옵션을 저장했습니다.'; ctx.reload(); return true;
    case 'ad-olow': D.allowLowConfidenceAsBest = !D.allowLowConfidenceAsBest; save(); toast = '추천 옵션을 저장했습니다.'; ctx.reload(); return true;
    case 'ad-omax':
      D.maxPerDistillery = Math.max(1, Math.min(2, D.maxPerDistillery + (+el.dataset.d)));
      save(); toast = '추천 옵션을 저장했습니다.'; ctx.reload(); return true;
    case 'ad-oadv':
      D.adventureMinScore = Math.max(50, Math.min(90, D.adventureMinScore + (+el.dataset.d) * 5));
      save(); toast = '추천 옵션을 저장했습니다.'; ctx.reload(); return true;

    /* ---------------------------------------------------------- 가격 */
    case 'ad-pdefault':
      V.priceDraft = ENG.PRICE_DEFAULTS.slice(0, 4).map((p) => p.label);
      ctx.refresh(); return true;
    case 'ad-psave':
      D.priceLabels = V.priceDraft.slice(); save();
      toast = '가격대 이름을 저장했습니다.'; ctx.reload(); return true;

    /* ---------------------------------------------------------- 화면 */
    case 'ad-dindex': D.showBrandIndexMenu = !D.showBrandIndexMenu; save(); toast = '저장했습니다.'; ctx.reload(); return true;
    case 'ad-dguide': D.showFlavorGuideMenu = !D.showFlavorGuideMenu; save(); toast = '저장했습니다.'; ctx.reload(); return true;
    case 'ad-dmotion': D.reduceMotion = !D.reduceMotion; save(); toast = '저장했습니다.'; ctx.reload(); return true;

    /* ---------------------------------------------------------- PIN */
    case 'ad-pchange': {
      (async () => {
        if (!(await verifyPin(V.pinCur))) V.pinError = '현재 PIN 이 올바르지 않습니다.';
        else if (!/^\d{4,8}$/.test(V.pinNew)) V.pinError = '숫자 4~8자리로 입력해 주세요.';
        else if (V.pinNew !== V.pinNew2) V.pinError = '새 PIN 이 서로 다릅니다.';
        else {
          await setPin(V.pinNew);
          V.pinCur = ''; V.pinNew = ''; V.pinNew2 = ''; V.pinError = '';
          toast = 'PIN 을 변경했습니다.';
        }
        ctx.refresh();
      })();
      return true;
    }

    /* ---------------------------------------------------------- 가져오기 */
    case 'ad-ikind': V.importKind = el.dataset.k; V.preview = null; V.importMsg = ''; ctx.refresh(); return true;
    case 'ad-icancel': V.preview = null; V.importMsg = ''; ctx.refresh(); return true;
    case 'ad-ipick': {
      const inp = document.getElementById('ad-file');
      if (!inp) return true;
      inp.onchange = () => {
        const file = inp.files && inp.files[0];
        if (!file) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const text = String(rd.result);
            if (V.importKind === 'json') {
              JSON.parse(text);
              backupNow('before-restore');
              restore(text);
              V.importMsg = ''; toast = '백업을 복원했습니다.';
            } else {
              V.preview = previewFlavorCsv(text);
              V.importMsg = '';
            }
          } catch (e) {
            V.importMsg = '가져오기 실패: ' + e.message;
          }
          ctx.refresh();
        };
        rd.readAsText(file, 'utf-8');
      };
      inp.click();
      return true;
    }
    case 'ad-iapply': {
      const n = applyPreview(V.preview);
      V.preview = null; toast = `가져오기를 반영했습니다. (${n}개 브랜드)`;
      ctx.refresh(); return true;
    }

    /* ---------------------------------------------------------- 내보내기 */
    case 'ad-xbrands': exportBrandsCsv(); toast = '브랜드 CSV 를 저장했습니다.'; ctx.refresh(); return true;
    case 'ad-xflavor': exportFlavorCsv(); toast = '향미 CSV 를 저장했습니다.'; ctx.refresh(); return true;
    case 'ad-xsource': exportSourceCsv(); toast = '출처 CSV 를 저장했습니다.'; ctx.refresh(); return true;
    case 'ad-xqueue': exportQueueCsv(); toast = '조사 대기 CSV 를 저장했습니다.'; ctx.refresh(); return true;
    case 'ad-xlog': exportEditLogCsv(); toast = '수정 이력 CSV 를 저장했습니다.'; ctx.refresh(); return true;
    case 'ad-xjson': {
      const name = backupNow('manual');
      download(name, D.backups[0].payload, 'application/json');
      toast = '백업 JSON 을 저장했습니다.'; ctx.refresh(); return true;
    }

    /* ---------------------------------------------------------- 백업 */
    case 'ad-bnow': toast = '백업 생성: ' + backupNow('manual'); ctx.refresh(); return true;
    case 'ad-rask': V.confirmRestore = el.dataset.n; ctx.refresh(); return true;
    case 'ad-rcancel': V.confirmRestore = ''; ctx.refresh(); return true;
    case 'ad-rdo': {
      const f = D.backups[+el.dataset.i];
      V.confirmRestore = '';
      if (f) { restore(f.payload); toast = '복원했습니다.'; }
      ctx.refresh(); return true;
    }

    /* ---------------------------------------------------------- 초기화 */
    case 'ad-wipe':
      D.brands = {}; D.questions = {}; D.editLog = [];
      save(); toast = '관리자 수정을 모두 초기화했습니다.'; ctx.reload(); return true;

    default: return false;
  }
}

/** input 이벤트 위임. 처리했으면 true. */
export function input(t, ctx) {
  CTX = ctx;
  const id = t.id;
  if (!id || id.indexOf('ad-') !== 0) return false;

  const keep = () => {
    ctx.refresh();
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* noop */ }
    }
  };

  switch (id) {
    case 'ad-pin': V.pinInput = t.value.replace(/\D/g, '').slice(0, 8); V.pinError = ''; return true;
    case 'ad-pin2': V.pinConfirm = t.value.replace(/\D/g, '').slice(0, 8); V.pinError = ''; return true;
    case 'ad-pcur': V.pinCur = t.value; V.pinError = ''; return true;
    case 'ad-pnew': V.pinNew = t.value; V.pinError = ''; return true;
    case 'ad-pnew2': V.pinNew2 = t.value; V.pinError = ''; return true;
    case 'ad-bq': V.bQuery = t.value; keep(); return true;
    case 'ad-fq': V.fQuery = t.value; keep(); return true;
    case 'ad-feditor': V.fEditor = t.value; return true;
    case 'ad-freason': V.fReason = t.value; return true;
    case 'ad-fsource': V.fSource = t.value; return true;
    default:
      if (id.indexOf('ad-price-') === 0) {
        if (!V.priceDraft) V.priceDraft = D.priceLabels.slice();
        V.priceDraft[+id.slice(9)] = t.value;
        return true;
      }
      return false;
  }
}
