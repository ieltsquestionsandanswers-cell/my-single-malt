/*
 * 나만의 싱글몰트 - 추천 엔진 (웹 포팅)
 *
 * Android(Kotlin) 원본을 1:1로 옮긴 결정론적 엔진이다.
 *   domain/model/Features.kt, Brand.kt, TasteVector.kt, Question.kt
 *   domain/engine/RecommendationEngine.kt, AdaptiveQuestionEngine.kt,
 *                 TasteProfileClassifier.kt, ReasonGenerator.kt
 *
 * 난수, 시간, 외부 API 를 사용하지 않는다. 동일 입력 → 동일 결과.
 */

// ---------------------------------------------------------------- Features
export const FLAVOR = [
  'smokeIntensity', 'peatMedicinal', 'peatEarthy', 'smokeAshy', 'smokeWoody',
  'smokeMeaty', 'sweetness', 'honey', 'vanilla', 'caramelToffee',
  'chocolateCoffee', 'freshOrchardFruit', 'citrus', 'stoneFruit',
  'tropicalFruit', 'redFruit', 'driedFruit', 'floral', 'herbalGrassy',
  'cerealMalty', 'nutty', 'creamy', 'sweetSpice', 'drySpice', 'oakTannin',
  'coastalBriny', 'maritimeSeaweed', 'waxy', 'oily', 'body',
  'alcoholIntensity', 'finishLength', 'complexity', 'dryness',
];

export const CASK = [
  'exBourbon', 'olorosoSherry', 'pxSherry', 'port', 'redWine', 'whiteWine',
  'rum', 'virginOak', 'toastedOak', 'mixedCask',
];

export const USE = [
  'neatSuitability', 'waterSuitability', 'onTheRocksSuitability',
  'highballSuitability', 'seafoodPairing', 'meatPairing', 'cheesePairing',
  'dessertPairing', 'quietDrinkingSuitability', 'socialDrinkingSuitability',
  'giftSuitability',
];

export const ALL = FLAVOR.concat(CASK);
export const SIZE = ALL.length;

const _idx = new Map(ALL.map((k, i) => [k, i]));
const _useIdx = new Map(USE.map((k, i) => [k, i]));

export function indexOf(key) {
  const i = _idx.get(key);
  return i === undefined ? -1 : i;
}
export function useIndexOf(key) {
  const i = _useIdx.get(key);
  return i === undefined ? -1 : i;
}

export const GROUP_CORE = [
  'sweetness', 'honey', 'vanilla', 'caramelToffee', 'chocolateCoffee',
  'freshOrchardFruit', 'citrus', 'stoneFruit', 'tropicalFruit', 'redFruit',
  'driedFruit', 'floral', 'herbalGrassy', 'cerealMalty', 'nutty', 'creamy',
  'sweetSpice', 'drySpice', 'dryness', 'complexity', 'coastalBriny',
  'maritimeSeaweed',
].map(indexOf);

export const GROUP_PEAT_TEXTURE = [
  'smokeIntensity', 'peatMedicinal', 'peatEarthy', 'smokeAshy', 'smokeWoody',
  'smokeMeaty', 'body', 'oakTannin', 'waxy', 'oily', 'alcoholIntensity',
  'finishLength',
].map(indexOf);

export const GROUP_CASK = CASK.map(indexOf);

export const CHART_AXES = [
  ['smokeIntensity', '스모크'],
  ['sweetness', '단맛'],
  ['freshOrchardFruit', '과일'],
  ['oakTannin', '오크'],
  ['body', '바디'],
  ['finishLength', '피니시'],
];

const LABELS = {
  smokeIntensity: '스모크', peatMedicinal: '요오드·메디시널', peatEarthy: '흙과 이끼 피트',
  smokeAshy: '숯과 재', smokeWoody: '장작 연기', smokeMeaty: '훈제 고기',
  sweetness: '단맛', honey: '꿀', vanilla: '바닐라', caramelToffee: '캐러멜·토피',
  chocolateCoffee: '초콜릿·커피', freshOrchardFruit: '사과와 배', citrus: '감귤',
  stoneFruit: '복숭아·살구', tropicalFruit: '열대과일', redFruit: '붉은 과일',
  driedFruit: '건과일', floral: '꽃', herbalGrassy: '허브·풀', cerealMalty: '곡물·몰트',
  nutty: '견과', creamy: '크리미', sweetSpice: '달콤한 향신료', drySpice: '드라이한 향신료',
  oakTannin: '오크', coastalBriny: '바다·소금', maritimeSeaweed: '해초', waxy: '왁시',
  oily: '오일리', body: '바디', alcoholIntensity: '도수감', finishLength: '피니시',
  complexity: '복합성', dryness: '드라이함',
  exBourbon: '버번 캐스크', olorosoSherry: '올로로소 셰리', pxSherry: 'PX 셰리',
  port: '포트', redWine: '레드와인', whiteWine: '화이트와인', rum: '럼',
  virginOak: '버진 오크', toastedOak: '토스티드 오크', mixedCask: '복합 캐스크',
};

export function featureLabel(key) {
  return LABELS[key] || key;
}

// ------------------------------------------------------------ Availability
export const Availability = {
  WIDELY: 'widelyAvailable', AVAILABLE: 'available', LIMITED: 'limited',
  RARE: 'rare', UNKNOWN: 'unknown', UNAVAILABLE: 'unavailable',
  labelKo(v) {
    switch (v) {
      case 'widelyAvailable': return '국내에서 비교적 쉽게 구할 수 있음';
      case 'available': return '국내 유통 확인';
      case 'limited': return '제한적 유통';
      case 'rare': return '희소·구하기 어려움';
      case 'unavailable': return '국내 유통 확인 안 됨';
      default: return '유통 정보 미확인';
    }
  },
  ease(v) {
    switch (v) {
      case 'widelyAvailable': return 5;
      case 'available': return 4;
      case 'limited': return 2;
      case 'rare': return 1;
      case 'unavailable': return 0;
      default: return 2;
    }
  },
};

export const PRICE_ORDER = ['A', 'B', 'C', 'D'];
export const PRICE_DEFAULTS = [
  { code: 'A', label: '10만 원 미만' },
  { code: 'B', label: '10만~20만 원' },
  { code: 'C', label: '20만~40만 원' },
  { code: 'D', label: '40만 원 이상' },
  { code: 'X', label: '가격 정보 미확정' },
];

/* 화면에 보여줄 가격 구간 이름. 관리자가 바꾸면 setPriceLabels 로 갱신된다. */
let priceLabels = PRICE_DEFAULTS.map((p) => p.label);

export function setPriceLabels(labels) {
  priceLabels = PRICE_DEFAULTS.map((p, i) => {
    const v = labels && labels[i] != null ? String(labels[i]).trim() : '';
    return v || p.label;
  });
}

export function priceLabel(code) {
  const i = PRICE_DEFAULTS.findIndex((p) => p.code === code);
  return i >= 0 ? priceLabels[i] : PRICE_DEFAULTS[PRICE_DEFAULTS.length - 1].label;
}

/* 예산 질문의 선택지는 관리자가 정한 가격 구간 이름을 따른다. */
export function optionLabel(option) {
  const band = option.flags && option.flags.budgetBand;
  return band && PRICE_ORDER.indexOf(band) >= 0 ? priceLabel(band) : option.label;
}

const UPCOMING_STATUSES = new Set([
  'MATURING', 'MATURING_UNRELEASED', 'FIRST_RELEASE_PREORDER',
  'PRODUCTION_UNCONFIRMED', 'UNKNOWN',
]);

// ------------------------------------------------------------------ utils
const round = (x) => Math.round(x);                       // Kotlin roundToInt (half up)
const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const desc = (f) => (a, b) => cmp(f(b), f(a));
const asc = (f) => (a, b) => cmp(f(a), f(b));
const chain = (...cs) => (a, b) => {
  for (const c of cs) { const r = c(a, b); if (r !== 0) return r; }
  return 0;
};
function maxWith(list, comparator) {
  if (!list.length) return null;
  let m = list[0];
  for (let i = 1; i < list.length; i++) if (comparator(m, list[i]) < 0) m = list[i];
  return m;
}
function toIntOrNull(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  if (!/^[+-]?\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}
function fmtNum(d) {
  return d % 1 === 0 ? String(Math.trunc(d)) : d.toFixed(1);
}
const n0 = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

// ------------------------------------------------------------------ Brand
export function parseBrands(payload) {
  const seen = new Set();
  return (payload.brands || []).map((o) => {
    if (!o.id) throw new Error('id 가 비어 있는 브랜드 행이 있습니다.');
    if (seen.has(o.id)) throw new Error('중복 브랜드 id: ' + o.id);
    seen.add(o.id);

    const hasFlavor = o.flavor != null;
    const f = new Array(SIZE).fill(0);
    if (o.flavor) for (let i = 0; i < FLAVOR.length; i++) f[i] = n0(o.flavor[FLAVOR[i]]);
    if (o.cask) for (let i = 0; i < CASK.length; i++) f[FLAVOR.length + i] = n0(o.cask[CASK[i]]);
    const u = new Array(USE.length).fill(0);
    if (o.use) for (let i = 0; i < USE.length; i++) u[i] = n0(o.use[USE[i]]);

    const b = {
      id: o.id,
      brandName: o.brandName || '',
      brandNameKo: o.brandNameKo || '',
      normalizedBrandName: o.normalizedBrandName || '',
      distilleryName: o.distilleryName || '',
      distillerySlug: o.distillerySlug || '',
      officialRegion: o.officialRegion || '',
      officialRegionKo: o.officialRegionKo || '',
      practicalSubregion: o.practicalSubregion || '',
      releaseStatus: o.releaseStatus || '',
      releaseStatusRaw: o.releaseStatusRaw || '',
      releaseStatusLabel: o.releaseStatusLabel || '',
      originalNote: o.originalNote || '',
      listBasis: o.listBasis || '',
      verificationLevel: o.verificationLevel || '',
      sourceUrl: o.sourceUrl || '',
      statusSourceUrl: o.statusSourceUrl || '',
      distillerySourceUrl: o.distillerySourceUrl || '',
      profileSourceUrl: o.profileSourceUrl || '',
      dataAsOf: o.dataAsOf || '',
      recommendable: !!o.recommendable,
      adminVisible: o.adminVisible !== false,
      stockStatus: o.stockStatus || 'unknown',
      koreaAvailability: o.koreaAvailability || 'unknown',
      priceBand: o.priceBand || 'X',
      rarity: n0(o.rarity),
      popularity: n0(o.popularity),
      beginnerFriendly: n0(o.beginnerFriendly),
      giftSuitability: n0(o.giftSuitability),
      representativeExpression: o.representativeExpression || '',
      representativeAbv: typeof o.representativeAbv === 'number' ? o.representativeAbv : null,
      ageStatement: o.ageStatement == null ? '' : String(o.ageStatement),
      imagePath: o.imagePath || '',
      confidence: o.confidence || 'Low',
      confidenceFactor: typeof o.confidenceFactor === 'number' ? o.confidenceFactor : 1.0,
      researchStatus: o.researchStatus || '',
      needsReview: !!o.needsReview,
      lastVerifiedAt: o.lastVerifiedAt || '',
      archetype: o.archetype || '',
      descriptionKo: o.descriptionKo || '',
      descriptionEn: o.descriptionEn || '',
      hasFlavor,
      f, u,
    };
    b.ageYears = toIntOrNull(b.ageStatement);
    b.isUpcoming = UPCOMING_STATUSES.has(b.releaseStatus);
    return b;
  });
}

export function brandValue(b, key) {
  const i = indexOf(key);
  return i < 0 ? 0 : b.f[i];
}
export function useValue(b, key) {
  const i = useIndexOf(key);
  return i < 0 ? 0 : b.u[i];
}

// --------------------------------------------------------------- Question
function parseCondition(e) {
  if (e == null || typeof e !== 'object') return null;
  if (e.all) return { t: 'all', items: e.all.map(parseCondition).filter(Boolean) };
  if (e.any) return { t: 'any', items: e.any.map(parseCondition).filter(Boolean) };
  if (e.not) { const c = parseCondition(e.not); return c ? { t: 'not', item: c } : null; }
  if (e.optionSelected) return { t: 'optSel', q: e.optionSelected[0], o: e.optionSelected[1] };
  if (e.optionNotSelected) return { t: 'optNot', q: e.optionNotSelected[0], o: e.optionNotSelected[1] };
  if (e.flagAtLeast) return { t: 'flagMin', flag: e.flagAtLeast[0], v: e.flagAtLeast[1] };
  if (e.flagAtMost) return { t: 'flagMax', flag: e.flagAtMost[0], v: e.flagAtMost[1] };
  if (e.answered) return { t: 'answered', q: e.answered };
  if (e.targetAtMost) return { t: 'tgtMax', feature: e.targetAtMost[0], v: e.targetAtMost[1] };
  if (e.targetAtLeast) return { t: 'tgtMin', feature: e.targetAtLeast[0], v: e.targetAtLeast[1] };
  if (e.hasTastedBrands) return { t: 'tasted' };
  return null;
}

export function parseQuestions(payload) {
  return (payload.questions || []).map((o) => ({
    id: o.id,
    category: o.category || '',
    title: o.title || '',
    subtitle: o.subtitle || '',
    selectionType: o.selectionType || 'SINGLE',
    minSelection: n0(o.minSelection),
    maxSelection: n0(o.maxSelection),
    orderGroup: n0(o.orderGroup),
    isMandatory: !!o.isMandatory,
    minimumExperienceLevel: n0(o.minimumExperienceLevel),
    maximumExperienceLevel: o.maximumExperienceLevel == null ? 5 : n0(o.maximumExperienceLevel),
    displayCondition: parseCondition(o.displayCondition),
    skipCondition: parseCondition(o.skipCondition),
    coversFeatures: o.coversFeatures || [],
    tags: o.tags || [],
    active: o.active !== false,
    version: n0(o.version) || 1,
    options: (o.options || []).map((p) => ({
      id: p.id,
      questionId: p.questionId || o.id,
      label: p.label || '',
      description: p.description || '',
      icon: p.icon || '',
      featureEffects: Object.entries(p.featureEffects || {}).map(([feature, fo]) => ({
        feature,
        target: n0(fo.t),
        weight: n0(fo.w),
        hard: !!fo.hard,
        tolerance: fo.tol == null ? 1 : n0(fo.tol),
      })),
      flags: p.flags || {},
      exclusionEffects: (p.exclusionEffects || []).map((e) => ({
        feature: e.feature,
        maxAllowed: e.maxAllowed == null ? 5 : n0(e.maxAllowed),
        penaltyOnly: !!e.penaltyOnly,
      })),
      branchTarget: p.branchTarget || '',
      exclusive: !!p.exclusive,
      displayOrder: n0(p.displayOrder),
      active: p.active !== false,
    })),
  }));
}

export const BRAND_RATINGS = {
  RATE_LOVED: { optionId: 'RATE_LOVED', label: '아주 좋았어요', blend: 0.25 },
  RATE_OK: { optionId: 'RATE_OK', label: '괜찮았어요', blend: 0.10 },
  RATE_DISLIKED: { optionId: 'RATE_DISLIKED', label: '취향과 달랐어요', blend: 0.0 },
  RATE_UNSURE: { optionId: 'RATE_UNSURE', label: '잘 기억나지 않아요', blend: 0.0 },
};

// ------------------------------------------------------------- TasteVector
export class TasteVector {
  constructor() {
    this.target = new Array(SIZE).fill(-1);
    this.weight = new Array(SIZE).fill(0);
    this.hard = new Array(SIZE).fill(false);
    this.tolerance = new Array(SIZE).fill(1);
    this.sources = Array.from({ length: SIZE }, () => new Set());
    this.hardExclusions = new Map();
    this.penaltyRules = new Map();
    this.flags = new Map();
  }

  isSet(i) { return i >= 0 && this.target[i] >= 0; }
  hasFeature(key) { return this.isSet(indexOf(key)); }
  targetOf(key) { const i = indexOf(key); return i < 0 ? -1 : this.target[i]; }
  weightOf(key) { const i = indexOf(key); return i < 0 ? 0 : this.weight[i]; }
  isHard(key) { const i = indexOf(key); return i >= 0 && this.hard[i]; }

  apply(key, t, w, isHard, tol, sourceQuestionId) {
    const i = indexOf(key);
    if (i < 0) return;
    this.sources[i].add(sourceQuestionId);
    if (isHard) {
      this.hard[i] = true;
      if (w >= this.weight[i] || this.target[i] < 0) {
        this.target[i] = t;
        this.weight[i] = Math.max(this.weight[i], w);
        this.tolerance[i] = tol;
      }
      return;
    }
    if (this.hard[i]) {
      if (w > this.weight[i]) this.weight[i] = w;
      return;
    }
    if (this.target[i] < 0 || w > this.weight[i]) {
      this.target[i] = t; this.weight[i] = w; this.tolerance[i] = tol;
    } else if (w === this.weight[i]) {
      this.target[i] = round((this.target[i] + t) / 2.0);
      this.tolerance[i] = Math.max(this.tolerance[i], tol);
    }
  }

  addHardExclusion(key, maxAllowed, penaltyOnly) {
    const i = indexOf(key);
    if (i < 0) return;
    const bag = penaltyOnly ? this.penaltyRules : this.hardExclusions;
    const prev = bag.has(i) ? bag.get(i) : 5;
    bag.set(i, Math.min(prev, maxAllowed));
  }

  putFlag(name, value) {
    const prev = this.flags.get(name);
    if (typeof prev === 'number' && typeof value === 'number') {
      this.flags.set(name, value >= prev ? value : prev);
    } else {
      this.flags.set(name, value);
    }
  }

  intFlag(name, def = 0) {
    const v = this.flags.get(name);
    return typeof v === 'number' ? Math.trunc(v) : def;
  }
  doubleFlag(name, def) {
    const v = this.flags.get(name);
    return typeof v === 'number' ? v : def;
  }
  stringFlag(name, def = '') {
    const v = this.flags.get(name);
    return typeof v === 'string' ? v : def;
  }
  boolFlag(name, def = false) {
    const v = this.flags.get(name);
    return typeof v === 'boolean' ? v : def;
  }

  coveredCount() {
    let c = 0;
    for (let i = 0; i < SIZE; i++) if (this.target[i] >= 0 && this.weight[i] > 0) c++;
    return c;
  }

  blendLikedBrand(brand, ratio) {
    if (!brand.hasFlavor || ratio <= 0) return;
    for (let i = 0; i < SIZE; i++) {
      if (this.hard[i]) continue;
      const bv = brand.f[i];
      if (this.target[i] < 0) {
        if (bv >= 3) {
          this.target[i] = bv;
          this.weight[i] = 2;
          this.sources[i].add('LIKED:' + brand.id);
        }
      } else {
        const blended = this.target[i] * (1 - ratio) + bv * ratio;
        this.target[i] = clamp(round(blended), 0, 5);
        this.sources[i].add('LIKED:' + brand.id);
      }
    }
  }

  snapshotSummary() {
    const idx = [];
    for (let i = 0; i < SIZE; i++) if (this.target[i] >= 0 && this.weight[i] >= 3) idx.push(i);
    idx.sort((a, b) => this.weight[b] - this.weight[a]);
    return idx.map((i) =>
      `${ALL[i]}=${this.target[i]}(w${this.weight[i]}${this.hard[i] ? ',hard' : ''})`);
  }

  copyOf() {
    const c = new TasteVector();
    c.target = this.target.slice();
    c.weight = this.weight.slice();
    c.hard = this.hard.slice();
    c.tolerance = this.tolerance.slice();
    c.sources = this.sources.map((s) => new Set(s));
    c.hardExclusions = new Map(this.hardExclusions);
    c.penaltyRules = new Map(this.penaltyRules);
    c.flags = new Map(this.flags);
    return c;
  }
}

// ------------------------------------------------------- TasteProfiles (19장)
export const PROFILES = [
  { id: 'floral_bright', nameKo: '화사한 플로럴', nameEn: 'Bright & Floral',
    descriptionKo: '꽃과 허브, 감귤이 앞서고 바디가 가벼운 산뜻한 방향입니다.',
    core: { floral: 1.0, herbalGrassy: 0.8, citrus: 0.9, body: -0.7 } },
  { id: 'orchard_honey', nameKo: '잘 익은 과일과 꿀', nameEn: 'Ripe Fruit & Honey',
    descriptionKo: '사과와 배, 복숭아에 꿀 같은 단맛이 이어지는 방향입니다.',
    core: { freshOrchardFruit: 1.0, stoneFruit: 0.9, honey: 1.0, sweetness: 0.7 } },
  { id: 'sherry_spice', nameKo: '건과일과 향신료', nameEn: 'Dried Fruit & Spice',
    descriptionKo: '건포도와 무화과, 계피 같은 향신료가 중심인 진한 방향입니다.',
    core: { driedFruit: 1.0, sweetSpice: 0.8, olorosoSherry: 0.9, pxSherry: 0.7 } },
  { id: 'sweet_citrus', nameKo: '달콤하고 상큼한 스타일', nameEn: 'Sweet & Zesty',
    descriptionKo: '감귤과 바닐라의 달콤함이 산뜻하게 이어지는 방향입니다.',
    core: { citrus: 1.0, vanilla: 0.9, sweetness: 0.8, freshOrchardFruit: 0.6 } },
  { id: 'oak_vanilla', nameKo: '구운 오크와 바닐라', nameEn: 'Toasted Oak & Vanilla',
    descriptionKo: '바닐라와 캐러멜, 구운 오크의 무게감이 중심인 방향입니다.',
    core: { vanilla: 1.0, caramelToffee: 0.9, toastedOak: 0.8, oakTannin: 0.7 } },
  { id: 'coastal', nameKo: '해안과 바다', nameEn: 'Coastal & Maritime',
    descriptionKo: '짭조름한 바다 공기와 오일리한 질감이 특징인 방향입니다.',
    core: { coastalBriny: 1.0, maritimeSeaweed: 0.8, oily: 0.7, waxy: 0.5 } },
  { id: 'fruit_smoke', nameKo: '과일과 스모크', nameEn: 'Fruit & Smoke',
    descriptionKo: '은은한 스모크 뒤로 과일과 꿀이 함께 남는 균형형 방향입니다.',
    core: { smokeIntensity: 0.6, freshOrchardFruit: 0.7, honey: 0.7, body: 0.5 } },
  { id: 'heavy_peat', nameKo: '강한 피트', nameEn: 'Heavy Peat',
    descriptionKo: '강한 피트와 요오드, 재의 여운이 중심인 방향입니다.',
    core: { smokeIntensity: 1.0, peatMedicinal: 0.9, peatEarthy: 0.8, smokeAshy: 0.7 } },
];

function profileRawScore(profile, values, known) {
  let sum = 0, wsum = 0;
  for (const [k, w] of Object.entries(profile.core)) {
    if (!known(k)) continue;
    const v = clamp(values(k), 0, 5) / 5.0;
    if (w >= 0) { sum += w * v; wsum += w; } else { sum += (-w) * (1.0 - v); wsum += (-w); }
  }
  return wsum === 0 ? 0 : sum / wsum;
}

export function classifyProfiles(v) {
  const scores = PROFILES
    .map((p) => [p, profileRawScore(p, (k) => Math.max(v.targetOf(k), 0), (k) => v.hasFeature(k))])
    .filter((x) => x[1] > 0);
  if (!scores.length) return [];
  const top = scores.slice().sort(chain(desc((x) => x[1]), asc((x) => x[0].id))).slice(0, 2);
  const total = top.reduce((a, x) => a + x[1], 0);
  if (total <= 0) return [];
  const first = round((top[0][1] / total) * 100);
  if (top.length === 1) return [{ profile: top[0][0], percent: 100, rawScore: top[0][1] }];
  return [
    { profile: top[0][0], percent: first, rawScore: top[0][1] },
    { profile: top[1][0], percent: 100 - first, rawScore: top[1][1] },
  ];
}

export function classifyBrandProfile(b) {
  if (!b.hasFlavor) return null;
  return maxWith(PROFILES, chain(
    asc((p) => profileRawScore(p, (k) => brandValue(b, k), () => true)),
    desc((p) => p.id),
  ));
}

export function flavorTags(b, v, limit = 5) {
  if (!b.hasFlavor) return [];
  const scored = [];
  for (let i = 0; i < ALL.length; i++) {
    const key = ALL[i];
    const base = b.f[i];
    const bonus = (v && v.targetOf(key) >= 3 && v.weightOf(key) >= 3) ? 1.2 : 0.0;
    if (base >= 3) scored.push({ key, s: base + bonus });
  }
  return scored
    .sort(chain(desc((x) => x.s), asc((x) => x.key)))
    .slice(0, limit)
    .map((x) => featureLabel(x.key));
}

// ---------------------------------------------------- RecommendationEngine
export const DEFAULT_WEIGHTS = {
  coreFlavor: 50, peatTexture: 18, cask: 10, serving: 7,
  budgetAvailability: 10, dataQuality: 5,
};

export const DEFAULT_OPTIONS = {
  includeLimitedAndRare: true,
  allowLowConfidenceAsBest: false,
  maxPerDistillery: 1,
  adventureMinScore: 65,
};

export const ROLES = [
  { id: 'BEST', label: 'BEST MATCH', ko: '가장 잘 맞는 추천' },
  { id: 'SAFE', label: 'SAFE CHOICE', ko: '접근성이 좋은 안전한 대안' },
  { id: 'REGION', label: 'NEW REGION', ko: '다른 지역·증류소 대안' },
  { id: 'ADVENTURE', label: 'ADVENTURE', ko: '새로운 향미를 경험하는 추천' },
];
const ROLE_IDS = ROLES.map((r) => r.id);

export class RecommendationEngine {
  constructor(weights = DEFAULT_WEIGHTS, options = DEFAULT_OPTIONS) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  rank(brands, vector, tastedBrandIds = new Set(), brandRatings = new Map()) {
    const excluded = [];
    const disliked = [];
    for (const [bid, rating] of brandRatings) {
      if (rating !== 'RATE_DISLIKED') continue;
      const b = brands.find((x) => x.id === bid);
      if (b && b.hasFlavor) disliked.push(b);
    }

    const pool = brands.filter((b) =>
      b.adminVisible && b.recommendable && b.hasFlavor && !b.isUpcoming);

    const scored = [];
    for (const b of pool) {
      const hardReason = this._hardExclusionReason(b, vector);
      if (hardReason !== null) { excluded.push([b, hardReason]); continue; }
      scored.push(this._score(b, vector, tastedBrandIds, disliked));
    }
    const ranked = scored.slice().sort(chain(
      desc((x) => x.score),
      desc((x) => x.brand.popularity),
      desc((x) => x.brand.beginnerFriendly),
      asc((x) => x.brand.id),
    ));
    return { ranked, excluded };
  }

  recommend(brands, vector, tastedBrandIds = new Set(), brandRatings = new Map(), maxQuestionsReached = false) {
    const { ranked, excluded } = this.rank(brands, vector, tastedBrandIds, brandRatings);
    const profileMix = classifyProfiles(vector);

    if (!ranked.length) {
      return {
        recommendations: [], ranked: [], excludedByHardRule: excluded,
        insufficient: true, relaxationHints: this._relaxationHints(vector),
        profileMix, maxQuestionsReached,
      };
    }
    const picks = this._selectDiverse(ranked, vector, tastedBrandIds);
    const best = picks.length ? picks[0][1] : null;
    const recommendations = picks.map(([role, sb]) => ({
      role,
      scored: sb,
      reasons: reasonsFor(sb.brand, vector, role),
      roleNote: this._roleNote(role, sb, best),
    }));
    return {
      recommendations, ranked, excludedByHardRule: excluded,
      insufficient: false, relaxationHints: [], profileMix, maxQuestionsReached,
    };
  }

  _hardExclusionReason(b, v) {
    for (const [idx, maxAllowed] of v.hardExclusions) {
      if (b.f[idx] > maxAllowed) {
        return `${featureLabel(ALL[idx])} 강도 ${b.f[idx]} > 허용 ${maxAllowed}`;
      }
    }
    if (!this.options.includeLimitedAndRare && b.rarity >= 4) return '한정·희귀 브랜드 제외 설정';
    if (v.intFlag('availabilityImportance', 0) >= 5 &&
      b.koreaAvailability === Availability.UNAVAILABLE) return '국내 유통 확인 안 됨';
    return null;
  }

  _score(b, v, tastedIds, disliked) {
    const notes = [];
    const w = this.weights;

    const core = this._groupMatch(b, v, GROUP_CORE);
    const peat = this._groupMatch(b, v, GROUP_PEAT_TEXTURE);
    const cask = this._groupMatch(b, v, GROUP_CASK);
    const serve = this._servingScore(b, v);
    const budget = this._budgetAvailabilityScore(b, v, notes);
    const quality = this._dataQualityScore(b);

    const parts = [
      [core, w.coreFlavor, core >= 0],
      [peat, w.peatTexture, peat >= 0],
      [cask, w.cask, cask >= 0],
      [serve, w.serving, true],
      [budget, w.budgetAvailability, true],
      [quality, w.dataQuality, true],
    ];
    const active = parts.filter((p) => p[2]);
    const activeWeight = active.reduce((a, p) => a + p[1], 0);
    const raw = activeWeight === 0 ? 50.0
      : active.reduce((a, p) => a + p[0] * p[1], 0) / activeWeight;

    let adj = 0.0;

    for (const [idx, maxAllowed] of v.penaltyRules) {
      if (b.f[idx] > maxAllowed) {
        adj -= 12.0;
        notes.push(`${featureLabel(ALL[idx])}가 매우 강해 감점`);
      } else if (b.f[idx] === maxAllowed) {
        adj -= 5.0;
      }
    }

    let avoidHonored = 0;
    for (let i = 0; i < SIZE; i++) {
      if (v.hard[i] && v.target[i] <= 1 && b.f[i] <= 1) avoidHonored++;
    }
    adj += Math.min(avoidHonored * 1.5, 6.0);

    const maxAbv = v.doubleFlag('maxAbv', 70.0);
    const abv = b.representativeAbv;
    if (abv != null && abv > maxAbv) {
      const over = abv - maxAbv;
      adj -= Math.min(20.0, 6.0 + over * 1.2);
      notes.push(`대표 제품 도수 ${fmtNum(abv)}%가 선호 범위를 넘어 감점`);
    }

    const minAge = v.intFlag('minAge', 0);
    if (minAge > 0) {
      const age = b.ageYears;
      if (age == null) adj -= 4.0;
      else if (age < minAge) adj -= 6.0;
      else adj += 2.0;
    }

    const giftWeight = v.intFlag('giftWeight', 0);
    if (giftWeight > 0) adj += (b.giftSuitability - 3) * (giftWeight * 0.6);

    const beginnerWeight = v.intFlag('beginnerWeight', 0);
    if (beginnerWeight > 0) adj += (b.beginnerFriendly - 3) * (beginnerWeight * 0.55);

    if (v.flags.has('popularityPreference')) {
      const pref = v.intFlag('popularityPreference', 2);
      adj -= Math.abs(pref - b.popularity) * 1.1;
    }

    const novelty = v.intFlag('noveltyWeight', 0);
    if (novelty > 0) {
      adj += (5 - b.popularity) * (novelty * 0.35);
      adj += (b.rarity - 2) * (novelty * 0.25);
    }

    if (v.flags.has('rarityPreference')) {
      const pref = v.intFlag('rarityPreference', 2);
      adj -= Math.abs(pref - b.rarity) * 0.8;
    }

    if (tastedIds.has(b.id)) {
      if (v.boolFlag('excludeTasted', false)) {
        adj -= 25.0;
        notes.push('새로운 스타일을 원하셔서 이미 마셔본 브랜드는 순위를 낮췄습니다');
      } else {
        adj -= 4.0;
      }
    }

    let worstSim = 0.0;
    for (const d of disliked) {
      if (d.id === b.id) { adj -= 30.0; notes.push('직접 취향과 다르다고 답한 브랜드'); continue; }
      const sim = similarity(b, d);
      if (sim > worstSim) worstSim = sim;
    }
    if (worstSim > 0.80) {
      adj -= (worstSim - 0.80) * 100.0;
      notes.push('취향과 달랐다고 답한 브랜드와 향미가 비슷해 감점');
    }

    const finalScore = clamp((raw + adj) * b.confidenceFactor, 0.0, 100.0);

    return {
      brand: b,
      score: finalScore,
      matchPercent: clamp(round(finalScore), 0, 100),
      breakdown: {
        coreFlavor: core, peatTexture: peat, cask, serving: serve,
        budgetAvailability: budget, dataQuality: quality,
        adjustments: adj, confidenceFactor: b.confidenceFactor,
        raw, final: finalScore,
      },
      notes,
      noveltyFeatures: this._noveltyFeatures(b, v),
    };
  }

  _groupMatch(b, v, group) {
    let wsum = 0, dsum = 0;
    for (const i of group) {
      const w = v.weight[i];
      if (w <= 0 || v.target[i] < 0) continue;
      const diff = Math.abs(v.target[i] - b.f[i]);
      const tol = v.tolerance[i];
      const eff = Math.max(0.0, diff - Math.max(tol - 1, 0));
      let dist = eff / 5.0;
      if (v.hard[i] && b.f[i] > v.target[i]) dist = Math.min(1.0, dist * 2.0);
      dsum += w * dist;
      wsum += w;
    }
    if (wsum === 0) return -1.0;
    return clamp(100.0 * (1.0 - dsum / wsum), 0.0, 100.0);
  }

  _servingScore(b, v) {
    let total = 0, count = 0;
    switch (v.stringFlag('serve')) {
      case 'neat': total += useValue(b, 'neatSuitability') * 20.0; count++; break;
      case 'water': total += useValue(b, 'waterSuitability') * 20.0; count++; break;
      case 'rocks': total += useValue(b, 'onTheRocksSuitability') * 20.0; count++; break;
      case 'highball': total += useValue(b, 'highballSuitability') * 20.0; count++; break;
      case 'mixed': {
        const avg = ['neatSuitability', 'waterSuitability', 'onTheRocksSuitability', 'highballSuitability']
          .reduce((a, k) => a + useValue(b, k), 0) / 4.0;
        total += avg * 20.0; count++;
        break;
      }
      default: break;
    }
    switch (v.stringFlag('food')) {
      case 'seafood': total += useValue(b, 'seafoodPairing') * 20.0; count++; break;
      case 'meat': total += useValue(b, 'meatPairing') * 20.0; count++; break;
      case 'cheese': total += useValue(b, 'cheesePairing') * 20.0; count++; break;
      case 'dessert': total += useValue(b, 'dessertPairing') * 20.0; count++; break;
      case 'nuts': total += useValue(b, 'dessertPairing') * 10.0 + useValue(b, 'cheesePairing') * 10.0; count++; break;
      default: break;
    }
    switch (v.stringFlag('occasion')) {
      case 'quiet': case 'digestif':
        total += useValue(b, 'quietDrinkingSuitability') * 20.0; count++; break;
      case 'social': case 'withMeal':
        total += useValue(b, 'socialDrinkingSuitability') * 20.0; count++; break;
      case 'gift': case 'special':
        total += useValue(b, 'giftSuitability') * 20.0; count++; break;
      default: break;
    }
    return count === 0 ? 60.0 : clamp(total / count, 0.0, 100.0);
  }

  _budgetAvailabilityScore(b, v, notes) {
    let score = 100.0;
    const band = v.stringFlag('budgetBand', 'ANY');
    if (band !== 'ANY' && b.priceBand !== 'X') {
      const want = PRICE_ORDER.indexOf(band);
      const has = PRICE_ORDER.indexOf(b.priceBand);
      if (want >= 0 && has >= 0) {
        const over = has - want;
        if (over <= 0) {
          // no penalty
        } else if (over === 1) {
          score -= 25.0; notes.push('생각하신 가격대보다 한 단계 높은 편입니다');
        } else {
          score -= 45.0; notes.push('생각하신 가격대보다 상당히 높은 편입니다');
        }
        if (over < -1) score -= 5.0;
      }
    } else if (b.priceBand === 'X') {
      score -= 10.0;
    }
    const importance = v.intFlag('availabilityImportance', 2);
    if (importance > 0) {
      const ease = Availability.ease(b.koreaAvailability);
      score -= (5 - ease) * importance * 2.2;
      if (ease <= 1 && importance >= 4) notes.push('국내에서 구하기 어려울 수 있습니다');
    }
    return clamp(score, 0.0, 100.0);
  }

  _dataQualityScore(b) {
    let s = b.confidence === 'High' ? 100.0 : b.confidence === 'Medium' ? 85.0 : 60.0;
    if (b.needsReview) s -= 8.0;
    if (!b.profileSourceUrl || !b.profileSourceUrl.trim()) s -= 10.0;
    return clamp(s, 0.0, 100.0);
  }

  _noveltyFeatures(b, v) {
    const out = [];
    for (let i = 0; i < SIZE; i++) {
      if (v.hard[i]) continue;
      if (v.hardExclusions.has(i)) continue;
      if (b.f[i] >= 4 && (v.target[i] < 0 || v.target[i] <= 2)) out.push(ALL[i]);
    }
    return out;
  }

  _selectDiverse(ranked, v, tastedIds) {
    const picked = new Map();
    const usedIds = new Set();
    const distilleryCount = new Map();

    const canTake = (sb, allowSecond = false) => {
      if (usedIds.has(sb.brand.id)) return false;
      const c = distilleryCount.get(sb.brand.distillerySlug) || 0;
      const limit = allowSecond ? 2 : this.options.maxPerDistillery;
      return c < limit;
    };
    const take = (role, sb) => {
      picked.set(role, sb);
      usedIds.add(sb.brand.id);
      distilleryCount.set(sb.brand.distillerySlug,
        (distilleryCount.get(sb.brand.distillerySlug) || 0) + 1);
    };

    // 1) BEST
    const best = ranked.find((sb) =>
      this.options.allowLowConfidenceAsBest || sb.brand.confidence !== 'Low') || ranked[0];
    take('BEST', best);

    // 2) SAFE
    const safe = ranked.find((sb) =>
      canTake(sb) &&
      sb.brand.beginnerFriendly >= 3 &&
      Availability.ease(sb.brand.koreaAvailability) >= 4 &&
      sb.brand.popularity >= 3 &&
      sb.brand.confidence !== 'Low')
      || ranked.find((sb) => canTake(sb) && Availability.ease(sb.brand.koreaAvailability) >= 3);
    if (safe) take('SAFE', safe);

    // 3) REGION
    const region = ranked.find((sb) => canTake(sb) && sb.brand.officialRegion !== best.brand.officialRegion)
      || ranked.find((sb) => canTake(sb) && sb.brand.distillerySlug !== best.brand.distillerySlug);
    if (region) take('REGION', region);

    // 4) ADVENTURE
    const adventurePool = ranked.filter((sb) =>
      canTake(sb) &&
      sb.score >= this.options.adventureMinScore &&
      !tastedIds.has(sb.brand.id) &&
      (this.options.allowLowConfidenceAsBest || sb.brand.confidence !== 'Low'));
    const adventure = maxWith(
      adventurePool.filter((sb) => sb.noveltyFeatures.length > 0),
      chain(asc((x) => x.noveltyFeatures.length), asc((x) => x.score), desc((x) => x.brand.id)),
    ) || (adventurePool.length ? adventurePool[0] : null);
    if (adventure) take('ADVENTURE', adventure);

    // 빈 역할 채우기
    for (const role of ROLE_IDS) {
      if (picked.has(role)) continue;
      const fill = ranked.find((sb) => canTake(sb, true));
      if (fill) take(role, fill);
    }

    // 지역 다양성 보정
    const regions = new Set([...picked.values()].map((sb) => sb.brand.officialRegion));
    if (regions.size === 1) {
      const alt = ranked.find((sb) =>
        !usedIds.has(sb.brand.id) && sb.brand.officialRegion !== best.brand.officialRegion);
      if (alt && picked.has('REGION')) {
        const old = picked.get('REGION');
        usedIds.delete(old.brand.id);
        picked.set('REGION', alt);
        usedIds.add(alt.brand.id);
      }
    }
    return ROLE_IDS.filter((r) => picked.has(r)).map((r) => [r, picked.get(r)]);
  }

  _roleNote(role, sb, best) {
    switch (role) {
      case 'BEST':
        return '선택하신 답변과 향미 데이터가 가장 가깝게 일치한 브랜드입니다.';
      case 'SAFE':
        return '국내에서 비교적 접근하기 쉽고 실패 가능성이 낮은 선택지입니다.';
      case 'REGION':
        return (best && sb.brand.officialRegion !== best.brand.officialRegion)
          ? `${sb.brand.officialRegionKo} 지역에서 비슷한 취향을 만족시키는 대안입니다.`
          : `${sb.brand.distilleryName} 증류소의 다른 성향을 가진 대안입니다.`;
      case 'ADVENTURE':
        return sb.noveltyFeatures.length
          ? '지금까지 선택하지 않은 ' +
            sb.noveltyFeatures.slice(0, 2).map(featureLabel).join(', ') +
            ' 향미를 경험할 수 있습니다.'
          : '취향 범위를 조금 넓혀볼 수 있는 선택지입니다.';
      default: return '';
    }
  }

  _relaxationHints(v) {
    const hints = [];
    if (v.stringFlag('budgetBand', 'ANY') !== 'ANY') hints.push('가격 조건 완화');
    if (v.intFlag('availabilityImportance', 0) >= 4) hints.push('희소성 조건 완화');
    if (v.hardExclusions.size > 0) hints.push('향미 조건 일부 완화');
    hints.push('가장 가까운 추천 보기');
    return hints;
  }

  withOptions(o) { return new RecommendationEngine(this.weights, o); }
  withWeights(w) { return new RecommendationEngine(w, this.options); }
}

export function similarity(a, b) {
  let d = 0;
  for (let i = 0; i < SIZE; i++) d += Math.abs(a.f[i] - b.f[i]);
  return 1.0 - (d / (SIZE * 5.0));
}

// ------------------------------------------------------- ReasonGenerator
function answeredDirectly(v, idx) {
  for (const s of v.sources[idx]) if (!s.startsWith('LIKED:')) return true;
  return false;
}

function pickTemplate(list, seed) {
  if (list.length === 1) return list[0];
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return list[((h % list.length) + list.length) % list.length];
}

function likeTemplates(label, strong) {
  return strong ? [
    `진한 ${label} 풍미를 선호한 취향과 잘 맞습니다.`,
    `${label}을(를) 강하게 원한다고 답하셨고, 이 브랜드의 대표 성향과 일치합니다.`,
    `${label} 중심의 향미를 찾으셨는데 이 브랜드가 그 방향에 가깝습니다.`,
  ] : [
    `${label}이(가) 은은하게 느껴지길 원한 답변과 어울립니다.`,
    `${label}을(를) 적당히 선호한 취향과 균형이 맞습니다.`,
    `${label}의 강도가 원하신 수준과 가깝습니다.`,
  ];
}

function avoidTemplates(label) {
  return [
    `${label}은(는) 피하고 싶다고 답하셨고, 이 브랜드에서는 거의 드러나지 않습니다.`,
    `${label}을(를) 원하지 않는다고 선택하셔서 해당 성향이 낮은 브랜드를 골랐습니다.`,
    `${label}에 부담을 느낀다고 답하신 점을 반영했습니다.`,
  ];
}

export function reasonsFor(b, v, role, limit = 3) {
  const out = [];
  const add = (s) => { if (s && !out.includes(s)) out.push(s); };
  if (!b.hasFlavor) return ['이 브랜드는 향미 데이터 조사가 진행 중입니다.'];

  const idxAll = ALL.map((_, i) => i);

  const liked = idxAll
    .filter((i) => answeredDirectly(v, i) && !v.hard[i] &&
      v.target[i] >= 3 && v.weight[i] >= 3 &&
      b.f[i] >= 3 && Math.abs(v.target[i] - b.f[i]) <= 1)
    .sort(chain(desc((i) => v.weight[i]), desc((i) => b.f[i]), asc((i) => i)));

  const avoided = idxAll
    .filter((i) => answeredDirectly(v, i) && v.target[i] <= 1 && v.weight[i] >= 4 &&
      (v.hard[i] || v.hardExclusions.has(i) || v.penaltyRules.has(i)) && b.f[i] <= 1)
    .sort(chain(desc((i) => v.weight[i]), asc((i) => i)));

  liked.slice(0, 2).forEach((i) => {
    add(pickTemplate(likeTemplates(featureLabel(ALL[i]), v.target[i] >= 4), `${b.id}:${i}`));
  });
  avoided.slice(0, 1).forEach((i) => {
    add(pickTemplate(avoidTemplates(featureLabel(ALL[i])), `${b.id}:a${i}`));
  });

  if (out.length < limit) add(bodyFinishReason(b, v));
  if (out.length < limit) add(abvReason(b, v));
  if (out.length < limit) add(caskReason(b, v));
  if (out.length < limit) add(purchaseReason(b, v, role));
  if (out.length < limit) {
    liked.slice(2, 2 + (limit - out.length)).forEach((i) => {
      add(pickTemplate(likeTemplates(featureLabel(ALL[i]), v.target[i] >= 4), `${b.id}:x${i}`));
    });
  }
  if (!out.length) out.push('선택하신 답변 전반과 이 브랜드의 향미 데이터가 비교적 가깝게 맞습니다.');
  return out.slice(0, limit);
}

function bodyFinishReason(b, v) {
  const bi = indexOf('body');
  const fi = indexOf('finishLength');
  const bodyOk = answeredDirectly(v, bi) && v.target[bi] >= 0 && Math.abs(v.target[bi] - b.f[bi]) <= 1;
  const finOk = answeredDirectly(v, fi) && v.target[fi] >= 0 && Math.abs(v.target[fi] - b.f[fi]) <= 1;
  const bodyWord = b.f[bi] <= 1 ? '가볍고 깨끗한 바디'
    : b.f[bi] === 2 ? '부드러운 바디'
      : b.f[bi] === 3 ? '중간 정도의 바디'
        : b.f[bi] === 4 ? '묵직한 바디' : '오일처럼 진한 바디';
  const finWord = b.f[fi] <= 1 ? '짧고 깔끔한 피니시'
    : b.f[fi] === 2 ? '가볍게 마무리되는 피니시'
      : b.f[fi] === 3 ? '중간 길이의 피니시'
        : b.f[fi] === 4 ? '길게 이어지는 피니시' : '매우 길고 강한 피니시';
  if (bodyOk && finOk) return `${bodyWord} 와 ${finWord}를 원하신 취향을 충족합니다.`;
  if (bodyOk) return `${bodyWord}를 원한다고 답하신 점과 맞습니다.`;
  if (finOk) return `${finWord}를 원한다고 답하신 점과 맞습니다.`;
  return null;
}

function abvReason(b, v) {
  const abv = b.representativeAbv;
  if (abv == null) return null;
  if (!v.flags.has('maxAbv')) return null;
  const maxAbv = v.doubleFlag('maxAbv', 70.0);
  if (abv <= maxAbv && maxAbv <= 46.5 && abv <= 46.5)
    return `부담이 적은 도수를 원하셨고 대표 제품이 ${fmtNum(abv)}%입니다.`;
  if (abv <= maxAbv && abv >= 50.0)
    return `높은 도수도 괜찮다고 답하셨고 대표 제품이 ${fmtNum(abv)}%입니다.`;
  if (abv <= maxAbv) return `선택하신 도수 범위 안에 있는 ${fmtNum(abv)}% 제품입니다.`;
  return null;
}

function caskReason(b, v) {
  const cands = CASK.map(indexOf)
    .filter((i) => answeredDirectly(v, i) && v.target[i] >= 3 && b.f[i] >= 3);
  if (!cands.length) return null;
  let best = cands[0];
  let bestKey = v.weight[best] * 10 + b.f[best];
  for (const i of cands) {
    const k = v.weight[i] * 10 + b.f[i];
    if (k > bestKey) { best = i; bestKey = k; }
  }
  return `${featureLabel(ALL[best])} 성향을 선호한 답변이 이 브랜드의 숙성 방향과 맞습니다.`;
}

function purchaseReason(b, v, role) {
  const importance = v.intFlag('availabilityImportance', 0);
  if (importance >= 4 && Availability.ease(b.koreaAvailability) >= 4) {
    return '국내에서 비교적 쉽게 구할 수 있어야 한다는 조건을 만족합니다.';
  }
  const band = v.stringFlag('budgetBand', 'ANY');
  if (band !== 'ANY' && b.priceBand !== 'X') {
    const want = PRICE_ORDER.indexOf(band);
    const has = PRICE_ORDER.indexOf(b.priceBand);
    if (want >= 0 && has >= 0 && has <= want) {
      const label = priceLabel(b.priceBand);
      return `생각하신 예산 범위(${label}) 안에서 선택할 수 있습니다.`;
    }
  }
  if (role === 'SAFE' && b.beginnerFriendly >= 4) {
    return '처음 접해도 부담이 적어 안전한 선택지입니다.';
  }
  return null;
}

export function servingAdvice(b, v) {
  if (!b.hasFlavor) return '대표적인 음용 방식 정보는 준비 중입니다.';
  let sb = '';
  const neat = useValue(b, 'neatSuitability');
  const water = useValue(b, 'waterSuitability');
  const rocks = useValue(b, 'onTheRocksSuitability');
  const highball = useValue(b, 'highballSuitability');
  const serve = v.stringFlag('serve');
  if (serve === 'highball' && highball >= 4) sb += '탄산수와 함께 하이볼로 만들면 향이 시원하게 열립니다. ';
  else if (serve === 'rocks' && rocks >= 4) sb += '얼음을 한 조각 넣으면 단맛이 정돈되어 편하게 마실 수 있습니다. ';
  else if (serve === 'water' || water >= 4) sb += '먼저 스트레이트로 향을 확인한 뒤, 물을 몇 방울 더해 향미가 열리는 변화를 경험해 보세요. ';
  else if (neat >= 4) sb += '상온에서 스트레이트로 천천히 향의 변화를 따라가 보세요. ';
  else sb += '잔에 따른 뒤 잠시 두었다가 향부터 확인해 보세요. ';

  if (b.f[indexOf('alcoholIntensity')] >= 4) sb += '도수가 높은 편이라 물을 소량 더하면 자극이 부드러워집니다. ';

  const food = v.stringFlag('food');
  if (food === 'seafood' && useValue(b, 'seafoodPairing') >= 4) sb += '해산물 안주와 잘 어울립니다.';
  else if (food === 'meat' && useValue(b, 'meatPairing') >= 4) sb += '구운 육류와 잘 어울립니다.';
  else if (food === 'cheese' && useValue(b, 'cheesePairing') >= 4) sb += '숙성 치즈와 잘 어울립니다.';
  else if (food === 'dessert' && useValue(b, 'dessertPairing') >= 4) sb += '다크초콜릿과 잘 어울립니다.';
  return sb.trim();
}

export function varianceNotice(b) {
  return b.confidence !== 'High'
    ? '이 브랜드는 제품별 캐스크와 향미 차이가 큰 편입니다. 추천 결과는 브랜드의 대표적인 성향을 기준으로 합니다.'
    : null;
}

// --------------------------------------------------- AdaptiveQuestionEngine
export function emptyAnswerState() {
  return {
    selections: new Map(),      // questionId -> [optionId]
    tastedBrandIds: [],
    brandRatings: new Map(),    // brandId -> 'RATE_LOVED' | ...
    askedOrder: [],
  };
}

export function cloneAnswerState(s) {
  return {
    selections: new Map([...s.selections].map(([k, v]) => [k, v.slice()])),
    tastedBrandIds: s.tastedBrandIds.slice(),
    brandRatings: new Map(s.brandRatings),
    askedOrder: s.askedOrder.slice(),
  };
}

export class AdaptiveQuestionEngine {
  constructor(questions, brands, engine = new RecommendationEngine(),
    minQuestions = 12, maxQuestions = 26, targetAverage = 19) {
    this.questions = questions;
    this.brands = brands;
    this.engine = engine;
    this.minQuestions = minQuestions;
    this.maxQuestions = maxQuestions;
    this.targetAverage = targetAverage;
    this.byId = new Map(questions.map((q) => [q.id, q]));
  }

  question(id) { return this.byId.get(id) || null; }

  buildVector(state) {
    const v = new TasteVector();
    const order = state.askedOrder.concat(
      [...state.selections.keys()].filter((k) => !state.askedOrder.includes(k)));
    for (const qid of order) {
      const q = this.byId.get(qid);
      if (!q) continue;
      const selected = state.selections.get(qid);
      if (!selected) continue;
      for (const optId of selected) {
        const opt = q.options.find((o) => o.id === optId);
        if (!opt) continue;
        for (const fe of opt.featureEffects) {
          v.apply(fe.feature, fe.target, fe.weight, fe.hard, fe.tolerance, q.id);
        }
        for (const ex of opt.exclusionEffects) {
          v.addHardExclusion(ex.feature, ex.maxAllowed, ex.penaltyOnly);
        }
        for (const [k, value] of Object.entries(opt.flags)) v.putFlag(k, value);
      }
    }
    for (const [brandId, ratingId] of state.brandRatings) {
      const rating = BRAND_RATINGS[ratingId];
      if (!rating || rating.blend <= 0) continue;
      const b = this.brands.find((x) => x.id === brandId);
      if (!b) continue;
      v.blendLikedBrand(b, rating.blend);
    }
    return v;
  }

  evaluate(cond, state, v) {
    if (cond == null) return true;
    switch (cond.t) {
      case 'all': return cond.items.every((c) => this.evaluate(c, state, v));
      case 'any': return cond.items.some((c) => this.evaluate(c, state, v));
      case 'not': return !this.evaluate(cond.item, state, v);
      case 'optSel': return (state.selections.get(cond.q) || []).includes(cond.o);
      case 'optNot': return !(state.selections.get(cond.q) || []).includes(cond.o);
      case 'flagMin': return v.intFlag(cond.flag, -2147483648) >= cond.v;
      case 'flagMax': return v.intFlag(cond.flag, 2147483647) <= cond.v;
      case 'answered': return (state.selections.get(cond.q) || []).length > 0;
      case 'tgtMax': { const t = v.targetOf(cond.feature); return t >= 0 && t <= cond.v; }
      case 'tgtMin': { const t = v.targetOf(cond.feature); return t >= cond.v; }
      case 'tasted': return state.tastedBrandIds.length > 0;
      default: return true;
    }
  }

  _isEligible(q, state, v) {
    if (!q.active) return false;
    if (state.selections.has(q.id)) return false;
    const exp = v.intFlag('experienceLevel', 2);
    if (exp < q.minimumExperienceLevel) return false;
    if (exp > q.maximumExperienceLevel) return false;
    if (!this.evaluate(q.displayCondition, state, v)) return false;
    if (q.skipCondition != null && this.evaluate(q.skipCondition, state, v)) return false;
    if (q.selectionType === 'BRAND_RATING' && state.tastedBrandIds.length === 0) return false;
    return true;
  }

  eligibleQuestions(state, v) {
    return this.questions.filter((q) => this._isEligible(q, state, v));
  }

  next(state) {
    const v = this.buildVector(state);
    const asked = state.selections.size;
    const eligible = this.eligibleQuestions(state, v);

    if (asked >= this.maxQuestions) return { question: null, finished: true, reason: 'MAX_REACHED' };
    if (!eligible.length) return { question: null, finished: true, reason: 'NO_MORE_QUESTIONS' };

    const mandatory = eligible.filter((q) => q.isMandatory)
      .sort(chain(asc((q) => q.orderGroup), asc((q) => q.id)));
    if (mandatory.length) return { question: mandatory[0], finished: false, reason: 'MANDATORY' };

    if (asked >= this.minQuestions && this._shouldStop(state, v, asked)) {
      return { question: null, finished: true, reason: 'CONFIDENT' };
    }

    const { ranked } = this.engine.rank(this.brands, v, new Set(state.tastedBrandIds), state.brandRatings);
    const top = ranked.slice(0, 20).map((x) => x.brand);
    const pool = top.length ? top : this.brands.filter((b) => b.hasFlavor).slice(0, 20);

    const scoredQ = eligible.map((q) => [q, this._informationGain(q, pool, v)]);
    const best = scoredQ.slice().sort(chain(
      desc((x) => x[1]), asc((x) => x[0].orderGroup), asc((x) => x[0].id),
    ))[0];

    if (best[1] <= 0.0001 && asked >= this.minQuestions) {
      return { question: null, finished: true, reason: 'NO_INFORMATION_GAIN' };
    }
    return { question: best[0], finished: false, reason: 'INFORMATION_GAIN' };
  }

  _informationGain(q, pool, v) {
    if (!pool.length) return 0.0;
    let features = q.coversFeatures;
    if (!features.length) {
      const seen = [];
      for (const o of q.options) for (const fe of o.featureEffects) {
        if (!seen.includes(fe.feature)) seen.push(fe.feature);
      }
      features = seen;
    }
    if (!features.length) {
      const flagKeys = [];
      for (const o of q.options) for (const k of Object.keys(o.flags)) {
        if (!flagKeys.includes(k)) flagKeys.push(k);
      }
      const unresolved = flagKeys.filter((k) => !v.flags.has(k)).length;
      return unresolved > 0 ? 0.35 : 0.0;
    }
    let total = 0, counted = 0;
    for (const f of features) {
      const idx = indexOf(f);
      if (idx < 0) continue;
      if (v.target[idx] >= 0 && v.weight[idx] >= 4) continue;
      let sum = 0;
      for (const b of pool) sum += b.f[idx];
      const mean = sum / pool.length;
      let variance = 0;
      for (const b of pool) variance += (b.f[idx] - mean) * (b.f[idx] - mean);
      variance /= pool.length;
      total += variance;
      counted++;
    }
    if (counted === 0) return 0.0;
    let gain = total / counted / 6.25;
    if (q.tags.includes('core')) gain *= 1.25;
    if (q.tags.includes('expert') && v.intFlag('experienceLevel', 2) < 4) gain *= 0.4;
    const unseen = features.filter((f) => indexOf(f) >= 0 && v.targetOf(f) < 0).length;
    gain *= (1.0 + unseen * 0.08);
    return gain;
  }

  _shouldStop(state, v, asked) {
    if (!this.mandatoryDone(state, v)) return false;
    if (v.coveredCount() < 10) return false;
    if (!v.flags.has('budgetBand') && !v.flags.has('availabilityImportance')) return false;

    const { ranked } = this.engine.rank(this.brands, v, new Set(state.tastedBrandIds), state.brandRatings);
    if (ranked.length < 2) return true;
    const first = ranked[0], second = ranked[1];
    const diff = first.score - second.score;
    if (diff < 3.0) return false;
    if (first.brand.confidence === 'Low') return false;
    const topFive = ranked.slice(0, 5).map((x) => x.brand);
    if (caskSplit(topFive)) return false;
    if (peatSplit(topFive)) return false;
    return first.score >= 82.0 && diff >= 6.0;
  }

  mandatoryDone(state, v) {
    return !this.questions
      .filter((q) => q.isMandatory && q.active)
      .some((q) => !state.selections.has(q.id) && this._isEligibleIgnoringAsked(q, state, v));
  }

  _isEligibleIgnoringAsked(q, state, v) {
    const exp = v.intFlag('experienceLevel', 2);
    if (exp < q.minimumExperienceLevel || exp > q.maximumExperienceLevel) return false;
    if (!this.evaluate(q.displayCondition, state, v)) return false;
    if (q.skipCondition != null && this.evaluate(q.skipCondition, state, v)) return false;
    return true;
  }

  progress(state) {
    const v = this.buildVector(state);
    const asked = state.selections.size;
    const remainingMandatory = this.questions.filter((q) =>
      q.isMandatory && q.active && !state.selections.has(q.id) &&
      this._isEligibleIgnoringAsked(q, state, v)).length;
    let expected = remainingMandatory > 0
      ? Math.max(this.minQuestions, asked + remainingMandatory + 2)
      : Math.max(this.minQuestions, Math.min(this.targetAverage, asked + 3));
    expected = Math.min(expected, this.maxQuestions);
    const ratio = expected === 0 ? 0 : asked / expected;
    const percent = clamp(round(ratio * 100), 0, asked >= this.minQuestions ? 99 : 95);
    return {
      askedCount: asked, percent, confirmedFeatures: v.coveredCount(),
      minQuestions: this.minQuestions, maxQuestions: this.maxQuestions,
    };
  }

  conflicts(state) {
    const v = this.buildVector(state);
    const out = [];
    for (const [brandId, ratingId] of state.brandRatings) {
      if (ratingId !== 'RATE_LOVED') continue;
      const b = this.brands.find((x) => x.id === brandId);
      if (!b || !b.hasFlavor) continue;
      for (const [idx, maxAllowed] of v.hardExclusions) {
        if (b.f[idx] > maxAllowed) {
          const msg = `좋았다고 선택하신 ${b.brandNameKo}은(는) ${featureLabel(ALL[idx])}이(가) 강한 편입니다. ` +
            '직접 피하고 싶다고 답하신 조건을 우선 적용했습니다.';
          if (!out.includes(msg)) out.push(msg);
        }
      }
    }
    return out;
  }

  pruneInvalidAnswers(state) {
    let current = state;
    let changed = true, guard = 0;
    while (changed && guard < 10) {
      guard++;
      changed = false;
      const v = this.buildVector(current);
      const invalid = [...current.selections.keys()].filter((qid) => {
        const q = this.byId.get(qid);
        if (!q) return true;
        if (q.isMandatory) return false;
        return !this._isEligibleIgnoringAsked(q, current, v);
      });
      if (invalid.length) {
        const next = cloneAnswerState(current);
        for (const qid of invalid) next.selections.delete(qid);
        next.askedOrder = next.askedOrder.filter((x) => !invalid.includes(x));
        current = next;
        changed = true;
      }
    }
    return current;
  }
}

function caskSplit(top) {
  if (top.length < 3) return false;
  const sherry = indexOf('olorosoSherry');
  const bourbon = indexOf('exBourbon');
  const sherryLead = top.filter((b) => b.f[sherry] >= 3).length;
  const bourbonLead = top.filter((b) => b.f[bourbon] >= 3).length;
  return sherryLead >= 2 && bourbonLead >= 2;
}

function peatSplit(top) {
  if (top.length < 3) return false;
  const smoke = indexOf('smokeIntensity');
  const hi = top.filter((b) => b.f[smoke] >= 3).length;
  const lo = top.filter((b) => b.f[smoke] <= 1).length;
  return hi >= 2 && lo >= 2;
}

// ------------------------------------------------------------ 선택 헬퍼
/** SessionViewModel.select() 와 동일한 규칙 */
export function applySelection(q, state, optionId) {
  const existing = state.selections.get(q.id) || [];
  const option = q.options.find((o) => o.id === optionId);
  if (!option) return state;

  let updated;
  if (q.selectionType === 'SINGLE') {
    updated = existing.includes(optionId) ? [] : [optionId];
  } else if (q.selectionType === 'MULTI') {
    if (existing.includes(optionId)) {
      updated = existing.filter((x) => x !== optionId);
    } else if (option.exclusive) {
      updated = [optionId];
    } else {
      const cleaned = existing.filter((id) => {
        const o = q.options.find((x) => x.id === id);
        return !(o && o.exclusive);
      });
      updated = cleaned.length >= q.maxSelection
        ? cleaned.slice(1).concat([optionId])
        : cleaned.concat([optionId]);
    }
  } else {
    updated = existing.includes(optionId)
      ? existing.filter((x) => x !== optionId)
      : existing.concat([optionId]);
  }
  const next = cloneAnswerState(state);
  if (!updated.length) next.selections.delete(q.id); else next.selections.set(q.id, updated);
  return next;
}

export function canProceed(q, state) {
  if (!q) return false;
  const sel = state.selections.get(q.id) || [];
  if (q.selectionType === 'BRAND_SEARCH') return true;
  if (q.selectionType === 'BRAND_RATING') {
    return state.tastedBrandIds.every((id) => state.brandRatings.has(id));
  }
  return sel.length >= q.minSelection;
}

/** SessionViewModel.goNext() 와 동일한 규칙 */
export function advance(engine, q, state) {
  let next = cloneAnswerState(state);
  if (q.selectionType === 'BRAND_SEARCH' && !next.selections.has(q.id)) {
    next.selections.set(q.id, []);
  }
  if (!next.askedOrder.includes(q.id)) next.askedOrder.push(q.id);
  next = engine.pruneInvalidAnswers(next);
  const r = engine.next(next);
  return { state: next, next: r };
}
