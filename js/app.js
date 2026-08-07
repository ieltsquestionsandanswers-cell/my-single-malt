/*
 * 나만의 싱글몰트 - iPad 웹(PWA) UI
 * 엔진(js/engine.js)은 Android 원본과 동일하게 동작하도록 포팅된 코드다.
 */
import * as E from './engine.js';

// ------------------------------------------------------------------ 상태
const S = {
  brands: [], pool: [], questions: [], meta: {},
  engine: null, answers: null, current: null, finishReason: '',
  result: null, vector: null,
  detailFrom: 'screen-result', detailBrand: null,
  indexQuery: '', indexRegion: '',
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// --------------------------------------------------------------- 향미 아이콘
// Android 의 FlavorIcon 과 같은 이름 체계를 쓰는 선화 아이콘.
const ICON_PATHS = {
  apple: 'M12 8.4c-1.1-1-3.1-1-4.3.3-1.5 1.6-1.2 4.6.3 6.6 .8 1.1 1.7 1.9 2.6 1.9 .6 0 1-.3 1.4-.3s.8.3 1.4.3c.9 0 1.8-.8 2.6-1.9 1.5-2 1.8-5 .3-6.6-1.2-1.3-3.2-1.3-4.3-.3zM12 8.4V5.6M12 5.6c1.4 0 2.4-1 2.6-2.2-1.4-.2-2.6.8-2.6 2.2z',
  caramel: 'M5.5 8.5h13v7.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2zM5.5 8.5 8 5h8l2.5 3.5M9 12v3M15 12v3',
  cask: 'M6 5.2c-1.6 2-1.6 11.6 0 13.6h12c1.6-2 1.6-11.6 0-13.6zM4.6 9h14.8M4.6 15h14.8M12 5v14',
  cereal: 'M12 20V9M12 9c0-2 1.4-3.6 3-4-.2 2-1.3 3.6-3 4zM12 9c0-2-1.4-3.6-3-4 .2 2 1.3 3.6 3 4zM12 13.5c0-2 1.4-3.6 3-4-.2 2-1.3 3.6-3 4zM12 13.5c0-2-1.4-3.6-3-4 .2 2 1.3 3.6 3 4z',
  charcoal: 'M4 15.5 7.5 9l4 2.5L15 7l5 8.5zM4 15.5h16v2.5H4zM8.5 12.6l2.5 2.9',
  cheese: 'M4 16.5 13.5 6.5 20 10v6.5zM4 16.5h16M9 12.5a1 1 0 1 0 .01 0M14 13.5a1 1 0 1 0 .01 0',
  chocolate: 'M5.5 5.5h13v13h-13zM12 5.5v13M5.5 12h13M9 8.7h.01M15 15.3h.01',
  citrus: 'M12 4a8 8 0 1 0 .01 0zM12 12 5 8.6M12 12l7-3.4M12 12v8M12 12 6.2 17.6M12 12l5.8 5.6',
  cream: 'M6 13c0-3.5 6-5 6-9 0 4 6 5.5 6 9a6 6 0 0 1-12 0zM9.5 13.5a2.5 2.5 0 0 0 5 0',
  driedfruit: 'M8.5 9.5a3 3 0 1 0 .01 0M15.5 10.5a3 3 0 1 0 .01 0M11.5 15.5a3 3 0 1 0 .01 0',
  earth: 'M3 17.5h18M3.5 17.5c1.5-4 4-6 6.5-6s5 2 6.5 6M12 11.5V7M12 7c1.6 0 2.8-1.2 3-2.7-1.7-.2-3 1-3 2.7zM12 8.6c-1.4-.2-2.4-1.3-2.4-2.6 1.4 0 2.4 1.1 2.4 2.6z',
  fire: 'M12 3.5c3 3.4 5.5 5.8 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2 1-3.4 2.2-4.7.3 1.2.9 2 1.8 2.4.6-2.6.5-4.7 1.5-7.1zM12 20a2.7 2.7 0 0 0 2.7-2.7c0-1.6-1.3-2.4-2.7-4.1-1.4 1.7-2.7 2.5-2.7 4.1A2.7 2.7 0 0 0 12 20z',
  flower: 'M12 9.6a2.4 2.4 0 1 0 .01 0M12 9.6c0-2.3-1-3.9-2.5-3.9S7 7.3 7 9.6M12 9.6c0-2.3 1-3.9 2.5-3.9S17 7.3 17 9.6M9.8 11a2.4 2.4 0 0 1-4.2 1.2M14.2 11a2.4 2.4 0 0 0 4.2 1.2M12 12v8',
  gift: 'M4.5 10.5h15v8.5h-15zM3.5 7h17v3.5h-17zM12 7v12M12 7c-1.6 0-3.6-.4-3.6-2s2.2-1.5 3.6 2zM12 7c1.6 0 3.6-.4 3.6-2s-2.2-1.5-3.6 2z',
  glass: 'M6.5 6h11l-1.3 12.4a1 1 0 0 1-1 .9H8.8a1 1 0 0 1-1-.9zM7.2 12.4h9.6',
  honey: 'M12 3.4 18 7v7l-6 3.6L6 14V7zM12 8 15 9.8v3.4L12 15l-3-1.8V9.8z',
  meat: 'M14.8 4.6a4.6 4.6 0 0 1 3.2 7.7c-1.6 1.6-2.8 1.3-4 2.5s-1.2 3.4-3.3 4.4c-2.4 1.1-5.3-.4-5.3-2.9 0-1.9 1.3-2.6 2.1-3.4 1.2-1.2 1-2.4 2.6-4a4.6 4.6 0 0 1 4.7-4.3zM8.6 15.4a2 2 0 1 0 .01 0',
  nut: 'M12 3.6c3.4 1.8 5.4 5.2 5.4 8.8a5.4 5.4 0 0 1-10.8 0c0-3.6 2-7 5.4-8.8zM12 8.2v9M9.6 10.6c1 .8 3.8.8 4.8 0',
  oak: 'M12 20.5v-5M12 15.5c-3.6 0-6.5-2.4-6.5-5.4 0-1.2.5-2.3 1.3-3.2-.3-1.6.9-3.1 2.5-3.1.7 0 1.3.2 1.8.7A3.2 3.2 0 0 1 12 3.5c1 0 2 .4 2.6 1.1a2.6 2.6 0 0 1 4.3 3.1c.8.9 1.3 2 1.3 3.2 0 3-2.9 5.4-6.5 5.4z',
  peach: 'M12 7.5c-3 0-5.5 2.3-5.5 5.3S9 19 12 19s5.5-3.2 5.5-6.2S15 7.5 12 7.5zM12 7.5v11M12 7.5c0-2 1.6-3.6 3.6-3.6 0 2-1.6 3.6-3.6 3.6z',
  question: 'M12 3.6a8.4 8.4 0 1 0 .01 0M9.4 9.6a2.7 2.7 0 0 1 5.3.8c0 1.8-2.6 2.2-2.6 4M12 17.6h.01',
  redfruit: 'M9 14.5a2.8 2.8 0 1 0 .01 0M15.6 15.6a2.6 2.6 0 1 0 .01 0M9.4 11.8C10 8 12.4 5.4 16 4.4M15.8 13c-.5-3.4.3-6.5 2.6-8.6',
  smoke: 'M5 8c1.6-1.8 3.4-1.8 5 0s3.4 1.8 5 0 3.4-1.8 4.8 0M5 12.4c1.6-1.8 3.4-1.8 5 0s3.4 1.8 5 0 3.4-1.8 4.8 0M5 16.8c1.6-1.8 3.4-1.8 5 0s3.4 1.8 5 0 3.4-1.8 4.8 0',
  spice: 'M12 12a2.2 2.2 0 1 0 .01 0M12 9.8V4M12 14.2V20M9.8 12H4M14.2 12H20M10.4 10.4 6.4 6.4M13.6 13.6l4 4M13.6 10.4l4-4M10.4 13.6l-4 4',
  tropical: 'M12 9.5c-2.6 0-4.6 2.2-4.6 5s2 5.5 4.6 5.5 4.6-2.7 4.6-5.5-2-5-4.6-5zM9.4 12l5.2 4.4M14.6 12l-5.2 4.4M12 9.5V6M12 6c0-1.6 1.6-2.6 3.4-2.4-.2 1.6-1.6 2.6-3.4 2.4zM12 6c0-1.6-1.6-2.6-3.4-2.4.2 1.6 1.6 2.6 3.4 2.4z',
  vanilla: 'M8.5 4.6c3.6 1 6 4.6 6 9 0 3.4-1.6 5.8-3.4 5.8s-3-2-3-4.6c0-4.4 1.4-8 6-10.2M14.5 13.6c1.6 0 3-1.3 3-3',
  wave: 'M3 15.5c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.2 0M3 10.5c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.2 0M3 20c1.8-2 3.6-2 5.4 0',
};

function iconSvg(name) {
  const p = ICON_PATHS[name] || ICON_PATHS.question;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
}

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  const sc = document.querySelector('#' + id + ' .scroll');
  if (sc) sc.scrollTop = 0;
}

// ------------------------------------------------------------- 데이터 적재
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
    $('home-version').textContent = '데이터 로드 실패';
    console.error(err);
    return;
  }
  S.brands = E.parseBrands(payload.brands);
  S.questions = E.parseQuestions(payload.questions).filter((q) => q.active);
  S.pool = S.brands.filter((b) => b.adminVisible && b.recommendable && b.hasFlavor && !b.isUpcoming);
  S.meta = {
    dataVersion: payload.brands.dataVersion || '',
    dataAsOf: payload.brands.dataAsOf || '',
    priceBands: payload.brands.priceBands || null,
  };
  renderHome();
  renderGuide();
  renderIndexRegions();
}

// ------------------------------------------------------------------- 홈
function renderHome() {
  $('home-version').textContent = `데이터 ${S.meta.dataAsOf || S.meta.dataVersion}`;
  const distilleries = new Set(S.brands.map((b) => b.distillerySlug)).size;
  const regions = {};
  S.brands.forEach((b) => { regions[b.officialRegionKo] = (regions[b.officialRegionKo] || 0) + 1; });
  const topRegion = Object.entries(regions).sort((a, b) => b[1] - a[1])[0];
  const stats = [
    [S.brands.length, '수록 브랜드'],
    [distilleries, '증류소'],
    [S.pool.length, '추천 가능 브랜드'],
    [S.questions.length, '질문 은행'],
    [E.SIZE, '향미·캐스크 축'],
    [topRegion ? `${topRegion[1]}` : '-', topRegion ? `${topRegion[0]} 최다` : '지역'],
  ];
  const wrap = $('home-stats');
  wrap.innerHTML = '';
  stats.forEach(([v, k]) => {
    const s = el('div', 'stat');
    s.appendChild(el('b', null, String(v)));
    s.appendChild(el('span', null, k));
    wrap.appendChild(s);
  });
}

// ----------------------------------------------------------------- 퀴즈
function startQuiz() {
  S.engine = new E.AdaptiveQuestionEngine(S.questions, S.pool, new E.RecommendationEngine());
  S.answers = E.emptyAnswerState();
  S.result = null;
  const n = S.engine.next(S.answers);
  S.current = n.question;
  S.finishReason = n.reason;
  show('screen-quiz');
  renderQuiz();
}

function renderQuiz() {
  const q = S.current;
  if (!q) return;
  const p = S.engine.progress(S.answers);
  $('quiz-count').textContent = `질문 ${p.askedCount + 1} · 최소 ${p.minQuestions} ~ 최대 ${p.maxQuestions}`;
  $('quiz-features').textContent = `확인된 향미 ${p.confirmedFeatures}개`;
  $('quiz-progress').style.width = p.percent + '%';
  $('q-cat').textContent = q.category || '';
  $('q-title').textContent = q.title;
  $('q-sub').textContent = q.subtitle || '';

  const body = $('q-body');
  body.innerHTML = '';
  if (q.selectionType === 'BRAND_SEARCH') renderBrandSearch(body, q);
  else if (q.selectionType === 'BRAND_RATING') renderBrandRating(body, q);
  else renderOptions(body, q);

  $('quiz-prev').style.visibility = hasPrevious() ? 'visible' : 'hidden';
  updateNext();
}

function renderOptions(body, q) {
  const opts = q.options.filter((o) => o.active);
  const cols = opts.length <= 4 ? 2 : opts.length <= 6 ? 3 : 4;
  const grid = el('div', `options cols-${cols}`);
  const selected = S.answers.selections.get(q.id) || [];
  opts.forEach((o) => {
    const b = el('button', 'opt' + (selected.includes(o.id) ? ' selected' : ''));
    b.appendChild(el('span', 'check', '✓'));
    if (o.icon) {
      const ic = el('span', 'icon');
      ic.innerHTML = iconSvg(o.icon);
      b.appendChild(ic);
    }
    b.appendChild(el('span', 'label', o.label));
    if (o.description) b.appendChild(el('span', 'desc', o.description));
    b.addEventListener('click', () => {
      S.answers = E.applySelection(q, S.answers, o.id);
      renderQuiz();
    });
    grid.appendChild(b);
  });
  body.appendChild(grid);
}

function renderBrandSearch(body, q) {
  const wrap = el('div', 'brand-search');
  const input = el('input', 'search-input');
  input.placeholder = '브랜드 이름을 입력하세요 (예: 글렌피딕, Ardbeg)';
  input.value = '';

  const chips = el('div', 'chip-row');
  const hits = el('div', 'brand-hits');

  const renderChips = () => {
    chips.innerHTML = '';
    if (!S.answers.tastedBrandIds.length) {
      chips.appendChild(el('span', 'tag', '선택한 브랜드가 없어도 다음으로 넘어갈 수 있습니다'));
      return;
    }
    S.answers.tastedBrandIds.forEach((id) => {
      const b = S.brands.find((x) => x.id === id);
      if (!b) return;
      const c = el('button', 'chip on', `${b.brandNameKo || b.brandName} ✕`);
      c.addEventListener('click', () => {
        S.answers = E.cloneAnswerState(S.answers);
        S.answers.tastedBrandIds = S.answers.tastedBrandIds.filter((x) => x !== id);
        S.answers.brandRatings.delete(id);
        renderChips(); renderHits(input.value); updateNext();
      });
      chips.appendChild(c);
    });
  };

  const renderHits = (term) => {
    hits.innerHTML = '';
    const t = term.trim().toLowerCase();
    if (!t) return;
    const found = S.brands.filter((b) =>
      b.brandNameKo.toLowerCase().includes(t) ||
      b.brandName.toLowerCase().includes(t) ||
      b.distilleryName.toLowerCase().includes(t)).slice(0, 12);
    if (!found.length) { hits.appendChild(el('div', 'empty', '검색 결과가 없습니다')); return; }
    found.forEach((b) => {
      const c = el('button', 'bcard');
      c.appendChild(el('span', 'nm', b.brandNameKo || b.brandName));
      c.appendChild(el('span', 'sub', `${b.brandName} · ${b.officialRegionKo}`));
      c.addEventListener('click', () => {
        if (S.answers.tastedBrandIds.includes(b.id)) return;
        if (S.answers.tastedBrandIds.length >= 10) return;
        S.answers = E.cloneAnswerState(S.answers);
        S.answers.tastedBrandIds.push(b.id);
        renderChips(); updateNext();
      });
      hits.appendChild(c);
    });
  };

  input.addEventListener('input', () => renderHits(input.value));
  wrap.appendChild(input);
  wrap.appendChild(chips);
  wrap.appendChild(hits);
  body.appendChild(wrap);
  renderChips();
}

function renderBrandRating(body, q) {
  const wrap = el('div', 'brand-search');
  if (!S.answers.tastedBrandIds.length) {
    wrap.appendChild(el('div', 'empty', '평가할 브랜드가 없습니다.'));
  }
  S.answers.tastedBrandIds.forEach((id) => {
    const b = S.brands.find((x) => x.id === id);
    if (!b) return;
    const row = el('div', 'rate-row');
    row.appendChild(el('div', 'nm', b.brandNameKo || b.brandName));
    const cr = el('div', 'chip-row');
    Object.values(E.BRAND_RATINGS).forEach((r) => {
      const on = S.answers.brandRatings.get(id) === r.optionId;
      const c = el('button', 'chip' + (on ? ' on' : ''), r.label);
      c.addEventListener('click', () => {
        S.answers = E.cloneAnswerState(S.answers);
        S.answers.brandRatings.set(id, r.optionId);
        renderQuiz();
      });
      cr.appendChild(c);
    });
    row.appendChild(cr);
    wrap.appendChild(row);
  });
  body.appendChild(wrap);
}

function updateNext() {
  const q = S.current;
  const ok = E.canProceed(q, S.answers);
  $('quiz-next').disabled = !ok;
  const sel = S.answers.selections.get(q.id) || [];
  let hint = '';
  if (q.selectionType === 'MULTI') {
    hint = `최소 ${q.minSelection}개, 최대 ${q.maxSelection}개 선택 (현재 ${sel.length}개)`;
  } else if (q.selectionType === 'BRAND_SEARCH') {
    hint = `마셔본 브랜드를 최대 10개까지 고를 수 있습니다 (현재 ${S.answers.tastedBrandIds.length}개)`;
  } else if (q.selectionType === 'BRAND_RATING') {
    hint = '고른 브랜드마다 평가를 선택해 주세요';
  } else {
    hint = '하나를 선택해 주세요';
  }
  $('quiz-hint').textContent = hint;
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
  if (r.next.finished || !S.current) analyzeAndShow();
  else renderQuiz();
}

function goPrev() {
  const order = S.answers.askedOrder;
  const cur = S.current ? S.current.id : null;
  const prevId = (cur && order.includes(cur))
    ? order[order.indexOf(cur) - 1]
    : order[order.length - 1];
  if (prevId == null) return;
  const prev = S.engine.question(prevId);
  if (!prev) return;
  S.answers = E.cloneAnswerState(S.answers);
  S.answers.askedOrder = order.slice(0, order.indexOf(prevId));
  S.current = prev;
  renderQuiz();
}

// --------------------------------------------------------------- 분석·결과
const STEPS = [
  '답변을 향미 좌표로 변환하는 중',
  '브랜드 향미 데이터와 대조하는 중',
  '예산과 국내 유통 상황을 반영하는 중',
  '추천 이유를 정리하는 중',
];

function analyzeAndShow() {
  show('screen-analyzing');
  let i = 0;
  $('analyzing-step').textContent = STEPS[0];
  const timer = setInterval(() => {
    i += 1;
    if (i < STEPS.length) $('analyzing-step').textContent = STEPS[i];
  }, 380);

  setTimeout(() => {
    const vector = S.engine.buildVector(S.answers);
    S.vector = vector;
    S.result = new E.RecommendationEngine().recommend(
      S.pool, vector, new Set(S.answers.tastedBrandIds), S.answers.brandRatings,
      S.finishReason === 'MAX_REACHED');
    clearInterval(timer);
    renderResult();
    show('screen-result');
  }, 1250);
}

function renderResult() {
  const r = S.result;
  const mix = r.profileMix;
  $('result-title').textContent = mix.length
    ? `${mix[0].profile.nameKo} 방향의 취향입니다`
    : '추천 결과';
  $('result-sub').textContent = mix.length
    ? mix[0].profile.descriptionKo
    : '선택하신 답변을 기준으로 정리한 결과입니다.';

  const pb = $('result-profiles');
  pb.innerHTML = '';
  mix.forEach((m) => pb.appendChild(el('span', 'tag', `${m.profile.nameKo} ${m.percent}%`)));
  pb.appendChild(el('span', 'tag',
    `질문 ${S.answers.askedOrder.length}개 · 후보 ${r.ranked.length}개 · 제외 ${r.excludedByHardRule.length}개`));

  const cards = $('result-cards');
  cards.innerHTML = '';
  if (r.insufficient) {
    cards.appendChild(el('div', 'empty', '조건에 맞는 브랜드를 찾지 못했습니다. 조건을 완화해 다시 시도해 주세요.'));
  }
  r.recommendations.forEach((rec) => {
    const b = rec.scored.brand;
    const roleMeta = E.ROLES.find((x) => x.id === rec.role);
    const c = el('button', 'rcard' + (rec.role === 'BEST' ? ' best' : ''));
    c.appendChild(el('div', 'role', roleMeta.label));
    c.appendChild(el('div', 'nm-ko', b.brandNameKo || b.brandName));
    c.appendChild(el('div', 'nm-en', `${b.brandName} · ${b.officialRegionKo}`));
    const pct = el('div', 'pct');
    pct.appendChild(el('b', null, rec.scored.matchPercent + '%'));
    pct.appendChild(el('span', null, '취향 일치도'));
    c.appendChild(pct);
    const ul = el('ul');
    rec.reasons.forEach((x) => ul.appendChild(el('li', null, x)));
    c.appendChild(ul);
    const meta = el('div', 'meta');
    E.flavorTags(b, S.vector, 3).forEach((t) => meta.appendChild(el('span', 'tag', t)));
    c.appendChild(meta);
    c.addEventListener('click', () => openDetail(b, 'screen-result'));
    cards.appendChild(c);
  });

  $('result-note').textContent = r.maxQuestionsReached
    ? '질문 상한에 도달해 지금까지의 답변으로 정리한 결과입니다. 카드를 누르면 향미 데이터와 근거를 볼 수 있습니다.'
    : '카드를 누르면 향미 44축 데이터와 추천 근거, 출처를 볼 수 있습니다.';
}

// ----------------------------------------------------------------- 상세
function openDetail(brand, from) {
  S.detailBrand = brand;
  S.detailFrom = from;
  renderDetail();
  show('screen-detail');
}

function renderDetail() {
  const b = S.detailBrand;
  const v = S.vector;
  $('detail-logo').textContent = b.officialRegionKo || '';
  $('detail-title').textContent = b.brandNameKo || b.brandName;
  const scored = S.result ? S.result.ranked.find((x) => x.brand.id === b.id) : null;
  $('detail-sub').textContent =
    `${b.brandName} · ${b.distilleryName} · ${b.officialRegionKo}` +
    (scored ? ` · 취향 일치도 ${scored.matchPercent}%` : '');

  const body = $('detail-body');
  body.innerHTML = '';

  // 기본 정보
  const info = el('div', 'panel');
  info.appendChild(el('h3', null, '기본 정보'));
  const dl = el('dl', 'kv');
  const priceLabel = (E.PRICE_DEFAULTS.find((p) => p.code === b.priceBand) || {}).label || '미확정';
  const rows = [
    ['대표 제품', b.representativeExpression || '-'],
    ['도수', b.representativeAbv != null ? b.representativeAbv + '%' : '-'],
    ['숙성 연수', b.ageStatement || 'NAS'],
    ['가격대', priceLabel],
    ['국내 유통', E.Availability.labelKo(b.koreaAvailability)],
    ['출시 상태', b.releaseStatusLabel || b.releaseStatusRaw || '-'],
    ['입문 적합도', '★'.repeat(Math.max(b.beginnerFriendly, 0)) || '-'],
    ['데이터 신뢰도', b.confidence + (b.needsReview ? ' (재검토 필요)' : '')],
  ];
  rows.forEach(([k, val]) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, String(val))); });
  info.appendChild(dl);
  body.appendChild(info);

  // 추천 이유 / 서빙
  const why = el('div', 'panel');
  why.appendChild(el('h3', null, '왜 이 브랜드인가'));
  const ul = el('ul', 'reasons');
  const reasons = v ? E.reasonsFor(b, v, 'BEST') : ['취향 진단을 완료하면 개인화된 근거가 표시됩니다.'];
  reasons.forEach((x) => ul.appendChild(el('li', null, x)));
  why.appendChild(ul);
  if (v) {
    const adv = E.servingAdvice(b, v);
    if (adv) {
      why.appendChild(el('h3', null, '마시는 방법'));
      why.appendChild(el('p', 'body-text', adv));
    }
  }
  const notice = E.varianceNotice(b);
  if (notice) why.appendChild(el('p', 'result-sub', notice));
  body.appendChild(why);

  // 향미 34축
  const fl = el('div', 'panel');
  fl.appendChild(el('h3', null, '향미 프로파일 (0~5)'));
  fl.appendChild(barList(E.FLAVOR, b, v));
  body.appendChild(fl);

  // 캐스크 + 출처
  const ck = el('div', 'panel');
  ck.appendChild(el('h3', null, '캐스크 성향'));
  ck.appendChild(barList(E.CASK, b, v));
  ck.appendChild(el('h3', null, '출처'));
  const srcs = el('div', 'srcs');
  [['브랜드 목록', b.sourceUrl], ['출시 상태', b.statusSourceUrl],
    ['증류소 목록', b.distillerySourceUrl], ['향미 프로파일', b.profileSourceUrl]]
    .filter(([, u]) => u).forEach(([k, u]) => {
      const p = el('p');
      const a = el('a', null, `${k} · ${u}`);
      a.href = u; a.target = '_blank'; a.rel = 'noopener';
      p.appendChild(a);
      srcs.appendChild(p);
    });
  srcs.appendChild(el('p', 'result-sub', `기준일 ${b.dataAsOf || S.meta.dataAsOf}`));
  ck.appendChild(srcs);
  body.appendChild(ck);
}

function barList(keys, b, v) {
  const wrap = el('div', 'bars');
  keys.forEach((k) => {
    const val = E.brandValue(b, k);
    const row = el('div', 'bar-row');
    row.appendChild(el('span', 'nm', E.featureLabel(k)));
    const track = el('div', 'bar-track');
    const fill = el('div', 'bar-fill');
    fill.style.width = (val / 5 * 100) + '%';
    if (v && v.hasFeature(k) && Math.abs(v.targetOf(k) - val) <= 1) {
      fill.style.background = 'linear-gradient(90deg,#7f9a5d,#c9b432)';
    }
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'v', String(val)));
    wrap.appendChild(row);
  });
  return wrap;
}

// ------------------------------------------------------------ 브랜드 목록
function renderIndexRegions() {
  const wrap = $('index-regions');
  wrap.innerHTML = '';
  const regions = [...new Set(S.brands.map((b) => b.officialRegionKo))].filter(Boolean).sort();
  [['', '전체'], ...regions.map((r) => [r, r])].forEach(([val, label]) => {
    const c = el('button', 'chip' + (S.indexRegion === val ? ' on' : ''), label);
    c.addEventListener('click', () => { S.indexRegion = val; renderIndexRegions(); renderIndex(); });
    wrap.appendChild(c);
  });
}

function renderIndex() {
  const t = S.indexQuery.trim().toLowerCase();
  const scores = S.result
    ? new Map(S.result.ranked.map((x) => [x.brand.id, x.matchPercent]))
    : new Map();
  let list = S.brands.filter((b) => b.adminVisible);
  if (S.indexRegion) list = list.filter((b) => b.officialRegionKo === S.indexRegion);
  if (t) {
    list = list.filter((b) =>
      b.brandNameKo.toLowerCase().includes(t) ||
      b.brandName.toLowerCase().includes(t) ||
      b.distilleryName.toLowerCase().includes(t));
  }
  list = list.slice().sort((a, b) => {
    const sa = scores.get(a.id), sb = scores.get(b.id);
    if (sa != null || sb != null) {
      if ((sb || -1) !== (sa || -1)) return (sb || -1) - (sa || -1);
    }
    return a.brandName < b.brandName ? -1 : a.brandName > b.brandName ? 1 : 0;
  });

  $('index-count').textContent = `${list.length} / ${S.brands.length} 브랜드`;
  const grid = $('index-grid');
  grid.innerHTML = '';
  if (!list.length) { grid.appendChild(el('div', 'empty', '조건에 맞는 브랜드가 없습니다')); return; }
  list.forEach((b) => {
    const c = el('button', 'bcard');
    c.appendChild(el('span', 'nm', b.brandNameKo || b.brandName));
    c.appendChild(el('span', 'sub', `${b.brandName} · ${b.officialRegionKo}`));
    const row = el('div', 'row');
    const pct = scores.get(b.id);
    if (pct != null) row.appendChild(el('span', 'tag', `일치 ${pct}%`));
    if (!b.hasFlavor) row.appendChild(el('span', 'tag', '향미 조사 중'));
    else E.flavorTags(b, S.vector, 2).forEach((x) => row.appendChild(el('span', 'tag', x)));
    c.appendChild(row);
    c.addEventListener('click', () => openDetail(b, 'screen-index'));
    grid.appendChild(c);
  });
}

// ------------------------------------------------------------ 향미 가이드
function renderGuide() {
  const grid = $('guide-grid');
  grid.innerHTML = '';
  E.PROFILES.forEach((p) => {
    const c = el('div', 'panel');
    c.appendChild(el('h3', null, `${p.nameKo}  ·  ${p.nameEn}`));
    c.appendChild(el('p', 'result-sub', p.descriptionKo));
    const row = el('div', 'meta', null);
    row.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;margin-top:12px';
    Object.entries(p.core).filter(([, w]) => w > 0).forEach(([k]) => {
      row.appendChild(el('span', 'tag', E.featureLabel(k)));
    });
    c.appendChild(row);
    grid.appendChild(c);
  });
}

// ------------------------------------------------------------------ 이벤트
$('age-yes').addEventListener('click', () => show('screen-home'));
$('age-no').addEventListener('click', () => { $('age-deny').style.display = 'block'; });
$('btn-start').addEventListener('click', startQuiz);
$('btn-index').addEventListener('click', () => { renderIndex(); show('screen-index'); });
$('btn-guide').addEventListener('click', () => show('screen-guide'));
$('quiz-exit').addEventListener('click', () => show('screen-home'));
$('quiz-next').addEventListener('click', goNext);
$('quiz-prev').addEventListener('click', goPrev);
$('result-restart').addEventListener('click', startQuiz);
$('result-home').addEventListener('click', () => show('screen-home'));
$('detail-back').addEventListener('click', () => show(S.detailFrom));
$('index-back').addEventListener('click', () => show(S.result ? 'screen-result' : 'screen-home'));
$('guide-back').addEventListener('click', () => show('screen-home'));
$('index-search').addEventListener('input', (e) => { S.indexQuery = e.target.value; renderIndex(); });

// 테스트 훅 (자동화 검증용)
window.MSM = {
  S, E,
  start: startQuiz,
  next: goNext,
  pickOption: (i) => {
    const opts = document.querySelectorAll('#q-body .opt');
    if (opts[i]) opts[i].click();
  },
  autoRun(policy = 0) {
    startQuiz();
    let guard = 0;
    while (S.current && guard < 60) {
      guard++;
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
    const vector = S.engine.buildVector(S.answers);
    S.vector = vector;
    S.result = new E.RecommendationEngine().recommend(
      S.pool, vector, new Set(S.answers.tastedBrandIds), S.answers.brandRatings,
      S.finishReason === 'MAX_REACHED');
    renderResult();
    show('screen-result');
    return {
      asked: S.answers.askedOrder.length,
      reason: S.finishReason,
      top: S.result.recommendations.map((r2) => [r2.role, r2.scored.brand.id, r2.scored.matchPercent]),
      rank: S.result.ranked.slice(0, 4).map((x) => [x.brand.id, x.matchPercent]),
    };
  },
};

// ------------------------------------------------------------------- PWA
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

boot();
