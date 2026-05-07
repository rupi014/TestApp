/* ============================
   TESTLAB — app.js
   ============================ */

// ── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://qhdewapjdqiucfwdezbc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZGV3YXBqZHFpdWNmd2RlemJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzg1NTMsImV4cCI6MjA5Mzc1NDU1M30.oN86XWYbPrAM4Ns9mQ41PeaaD6JeR70hOViALb8t2cI';

const sbFetch = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || '',
      ...opts.headers,
    },
  });

// ── SUBJECTS CONFIG ───────────────────────────────────────────────────────────
const SUBJECTS = [
  { key: 'ipei', name: 'Itinerario Personal de Empleabilidad I', abbr: 'IPEI', file: 'ipei_completo.json',          icon: '💼', color: '#f59e0b' },
  { key: 'bbdd', name: 'Administración de Bases de Datos',        abbr: 'BBDD', file: 'bbdd_completo.json',          icon: '🗄️', color: '#3b82f6' },
  { key: 'ssoo', name: 'Administración de Sistemas Operativos',   abbr: 'SSOO', file: 'ssoo_completo.json',          icon: '🖥️', color: '#8b5cf6' },
  { key: 'lm',   name: 'Lenguaje de Marcas',                      abbr: 'LM',   file: 'lenguaje_completo.json',      icon: '🏷️', color: '#ec4899' },
  { key: 'impl', name: 'Implementación de Aplicaciones Web',      abbr: 'IAW',  file: 'implantacion_completo.json',  icon: '🌐', color: '#10b981' },
  { key: 'svc',  name: 'Servicios de Red e Internet',             abbr: 'SRI',  file: 'servicios_completo.json',     icon: '📡', color: '#f97316' },
];

const COUNT_PRESETS = [5, 10, 15, 20, 30, 50];
const COMP_QUESTIONS = 30;

// ── STATE ─────────────────────────────────────────────────────────────────────
let state = {
  subject: null,
  allQuestions: [],
  testQuestions: [],
  currentIndex: 0,
  answers: [],
  answered: false,
  isCompetitive: false,
  compResult: null,   // { correct, total, pct, abbr }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const showScreen = (id) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
};

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showToast(msg, type = 'error') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.background = type === 'success' ? 'var(--correct)' : 'var(--wrong)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── SCREEN 1: SUBJECT GRID ────────────────────────────────────────────────────
function renderSubjectGrid() {
  const grid = $('subject-grid');
  grid.innerHTML = '';

  // Competitive card first
  const compCard = document.createElement('div');
  compCard.className = 'subject-card comp-card';
  compCard.innerHTML = `
    <div class="card-icon">⚡</div>
    <div class="comp-card-text">
      <div class="card-name">Modo Competitivo</div>
      <div class="card-abbr">30 preguntas · Ranking global</div>
    </div>
    <span class="comp-card-cta">Jugar →</span>
  `;
  compCard.addEventListener('click', () => showScreen('screen-competitive'));
  grid.appendChild(compCard);

  // Subject cards
  SUBJECTS.forEach(subj => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--card-accent', subj.color);
    card.innerHTML = `
      <div class="card-icon">${subj.icon}</div>
      <div class="card-name">${subj.name}</div>
      <div class="card-abbr">${subj.abbr}</div>
      <div class="card-count" id="count-${subj.key}">Cargando…</div>
    `;
    card.addEventListener('click', () => selectSubject(subj));
    grid.appendChild(card);
    loadQuestionCount(subj);
  });
}

async function loadQuestionCount(subj) {
  try {
    const res = await fetch(subj.file);
    const data = await res.json();
    const el = $(`count-${subj.key}`);
    if (el) el.textContent = `${data.preguntas?.length ?? 0} preguntas disponibles`;
  } catch {
    const el = $(`count-${subj.key}`);
    if (el) el.textContent = 'Error cargando';
  }
}

// ── SCREEN 5: COMPETITIVE SUBJECT GRID ───────────────────────────────────────
function renderCompSubjectGrid() {
  const grid = $('comp-subject-grid');
  grid.innerHTML = '';
  SUBJECTS.forEach(subj => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--card-accent', subj.color);
    card.innerHTML = `
      <div class="card-icon">${subj.icon}</div>
      <div class="card-name">${subj.name}</div>
      <div class="card-abbr">${subj.abbr}</div>
      <div class="card-count" style="color:${subj.color}">${COMP_QUESTIONS} preguntas</div>
    `;
    card.addEventListener('click', () => startCompetitive(subj));
    grid.appendChild(card);
  });
}

$('back-from-competitive').addEventListener('click', () => showScreen('screen-subject'));
$('btn-view-ranking').addEventListener('click', () => { loadRanking(); showScreen('screen-ranking'); });

async function startCompetitive(subj) {
  state.isCompetitive = true;
  state.subject = subj;
  try {
    const res = await fetch(subj.file);
    const data = await res.json();
    state.allQuestions = data.preguntas || [];
  } catch {
    showToast('Error cargando las preguntas.');
    return;
  }
  startTest(COMP_QUESTIONS);
}

// ── SCREEN 2: COUNT ───────────────────────────────────────────────────────────
async function selectSubject(subj) {
  state.isCompetitive = false;
  state.subject = subj;
  try {
    const res = await fetch(subj.file);
    const data = await res.json();
    state.allQuestions = data.preguntas || [];
  } catch {
    showToast('Error cargando las preguntas.');
    return;
  }

  $('selected-subject-badge').textContent = `${subj.icon} ${subj.abbr}`;
  $('total-available').textContent = state.allQuestions.length;

  const countOpts = $('count-options');
  countOpts.innerHTML = '';
  COUNT_PRESETS.forEach(n => {
    const pill = document.createElement('button');
    pill.className = 'count-pill' + (n > state.allQuestions.length ? ' disabled' : '');
    pill.textContent = n;
    pill.addEventListener('click', () => startTest(n));
    countOpts.appendChild(pill);
  });

  $('custom-count').max = state.allQuestions.length;
  $('custom-count').value = '';
  showScreen('screen-count');
}

$('back-to-subject').addEventListener('click', () => showScreen('screen-subject'));
$('btn-custom-start').addEventListener('click', () => {
  const val = parseInt($('custom-count').value);
  if (!val || val < 1) { showToast('Introduce un número válido'); return; }
  if (val > state.allQuestions.length) { showToast(`Máximo ${state.allQuestions.length} preguntas`); return; }
  startTest(val);
});

// ── START TEST ────────────────────────────────────────────────────────────────
function startTest(count) {
  const n = Math.min(count, state.allQuestions.length);
  state.testQuestions = shuffle(state.allQuestions).slice(0, n);
  state.currentIndex = 0;
  state.answers = new Array(n).fill(null);
  state.answered = false;

  // Header
  const chip = $('test-subject-chip');
  chip.textContent = `${state.subject.icon} ${state.subject.abbr}`;
  chip.className = state.isCompetitive ? 'comp-chip' : 'subject-chip';
  $('q-total').textContent = n;

  updateLiveScore();
  renderQuestion();
  showScreen('screen-test');
}

// ── SCREEN 3: TEST ────────────────────────────────────────────────────────────
$('back-to-count').addEventListener('click', () => {
  if (confirm('¿Salir del test? Se perderá el progreso.')) {
    showScreen(state.isCompetitive ? 'screen-competitive' : 'screen-count');
  }
});

function renderQuestion() {
  const idx = state.currentIndex;
  const q = state.testQuestions[idx];
  const total = state.testQuestions.length;

  $('progress-bar').style.width = `${(idx / total) * 100}%`;
  $('q-current').textContent = idx + 1;

  const card = $('question-card');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = '';

  $('question-number').textContent = `Pregunta ${idx + 1} de ${total}`;
  $('question-text').textContent = q.enunciado;

  const grid = $('options-grid');
  grid.innerHTML = '';
  ['a', 'b', 'c', 'd'].filter(k => q.opciones?.[k] != null).forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.key = key;
    btn.innerHTML = `<span class="option-key">${key.toUpperCase()}</span><span>${esc(q.opciones[key])}</span>`;
    btn.addEventListener('click', () => answerQuestion(key));
    grid.appendChild(btn);
  });

  $('explanation-box').className = 'explanation-box hidden';
  $('btn-next').classList.add('hidden');
  state.answered = false;
}

function answerQuestion(chosen) {
  if (state.answered) return;
  state.answered = true;

  const idx = state.currentIndex;
  const q = state.testQuestions[idx];
  const correct = q.respuesta_correcta;
  const isCorrect = chosen === correct;

  state.answers[idx] = { answered: true, correct: isCorrect, chosen, correctKey: correct, questionText: q.enunciado, options: q.opciones };

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.add('answered');
    if (btn.dataset.key === correct) btn.classList.add('correct');
    if (btn.dataset.key === chosen && !isCorrect) btn.classList.add('wrong');
  });

  const box = $('explanation-box');
  if (isCorrect) {
    box.textContent = '✓ ¡Correcto!';
    box.className = 'explanation-box correct-feedback';
  } else {
    box.textContent = `✗ Incorrecto. La respuesta correcta es ${correct.toUpperCase()}: ${q.opciones[correct]}`;
    box.className = 'explanation-box';
  }
  box.classList.remove('hidden');

  updateLiveScore();

  const isLast = idx === state.testQuestions.length - 1;
  const nextBtn = $('btn-next');
  nextBtn.textContent = isLast ? (state.isCompetitive ? 'Ver mi resultado →' : 'Ver resultados →') : 'Siguiente →';
  nextBtn.classList.remove('hidden');
}

$('btn-next').addEventListener('click', () => {
  const isLast = state.currentIndex === state.testQuestions.length - 1;
  if (isLast) {
    state.isCompetitive ? showSubmit() : showResults();
  } else {
    state.currentIndex++;
    renderQuestion();
  }
});

function updateLiveScore() {
  const answered = state.answers.filter(Boolean);
  $('live-correct').textContent = answered.filter(a => a.correct).length;
  $('live-wrong').textContent = answered.filter(a => !a.correct).length;
}

// ── SCREEN 4: RESULTS (normal) ────────────────────────────────────────────────
function showResults() {
  const total = state.testQuestions.length;
  const answered = state.answers.filter(Boolean);
  const correct = answered.filter(a => a.correct).length;
  const wrong = answered.filter(a => !a.correct).length;
  const skipped = total - answered.length;
  const pct = Math.round((correct / total) * 100);

  let emoji, msg;
  if (pct === 100)     { emoji = '🏆'; msg = '¡Perfecto! Resultado impecable.'; }
  else if (pct >= 80)  { emoji = '🎉'; msg = 'Muy buen resultado. ¡Sigue así!'; }
  else if (pct >= 60)  { emoji = '👍'; msg = 'Aprobado. Pero hay margen de mejora.'; }
  else if (pct >= 40)  { emoji = '📚'; msg = 'Suspendido. A repasar el temario.'; }
  else                  { emoji = '😅'; msg = 'Necesitas repasar bastante. ¡No te rindas!'; }

  $('result-emoji').textContent = emoji;
  $('score-percent').textContent = `${pct}%`;
  $('score-percent').style.color = pct >= 60 ? 'var(--correct)' : pct >= 40 ? 'var(--warning)' : 'var(--wrong)';
  $('score-fraction').textContent = `${correct} de ${total} correctas`;
  $('score-message').textContent = msg;
  $('stat-correct').textContent = correct;
  $('stat-wrong').textContent = wrong;
  $('stat-skip').textContent = skipped;

  showScreen('screen-results');
  setTimeout(() => { $('score-bar-fill').style.width = `${pct}%`; }, 100);

  const reviewList = $('review-list');
  reviewList.innerHTML = '';
  const errors = state.answers.map((a, i) => ({ a, q: state.testQuestions[i], i })).filter(({ a }) => !a || !a.correct);
  if (errors.length === 0) {
    reviewList.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.8rem;color:var(--correct);">✓ Sin errores. ¡Todo correcto!</p>';
  } else {
    errors.forEach(({ a, q, i }) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const yourText = a?.chosen ? `Tu respuesta: ${a.chosen.toUpperCase()}. ${esc(q.opciones[a.chosen])}` : 'Sin responder';
      const correctText = `Correcta: ${q.respuesta_correcta.toUpperCase()}. ${esc(q.opciones[q.respuesta_correcta])}`;
      item.innerHTML = `
        <div class="review-q">P${i + 1}. ${esc(q.enunciado)}</div>
        <div class="review-answers">
          <span class="review-your">✗ ${yourText}</span>
          <span class="review-correct">✓ ${correctText}</span>
        </div>`;
      reviewList.appendChild(item);
    });
  }
}

$('btn-retry').addEventListener('click', () => startTest(state.testQuestions.length));
$('btn-new-subject').addEventListener('click', () => showScreen('screen-subject'));

// ── SCREEN 6: SUBMIT (competitive) ───────────────────────────────────────────
function showSubmit() {
  const total = state.testQuestions.length;
  const correct = state.answers.filter(a => a?.correct).length;
  const pct = Math.round((correct / total) * 100);

  state.compResult = { correct, total, pct, abbr: state.subject.abbr };

  let emoji;
  if (pct === 100) emoji = '🏆';
  else if (pct >= 80) emoji = '🎉';
  else if (pct >= 60) emoji = '👍';
  else emoji = '📚';

  $('submit-emoji').textContent = emoji;
  $('submit-percent').textContent = `${pct}%`;
  $('submit-percent').style.color = pct >= 60 ? 'var(--correct)' : pct >= 40 ? 'var(--warning)' : 'var(--wrong)';
  $('submit-fraction').textContent = `${correct} de ${total} correctas`;
  $('submit-error').classList.add('hidden');
  $('player-name').value = '';

  showScreen('screen-submit');
  setTimeout(() => { $('submit-bar').style.width = `${pct}%`; }, 100);
}

$('btn-save-score').addEventListener('click', async () => {
  const name = $('player-name').value.trim();
  if (!name) { $('submit-error').textContent = 'Introduce tu nombre.'; $('submit-error').classList.remove('hidden'); return; }

  const btn = $('btn-save-score');
  btn.textContent = 'Guardando…';
  btn.disabled = true;

  const { correct, total, pct, abbr } = state.compResult;
  try {
    const res = await sbFetch('/ranking', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({ nombre: name, asignatura: abbr, correctas: correct, total, porcentaje: pct }),
    });
    if (!res.ok) throw new Error(await res.text());
    showToast('¡Resultado guardado! 🎉', 'success');
    loadRanking();
    showScreen('screen-ranking');
  } catch (e) {
    console.error(e);
    $('submit-error').textContent = 'Error al guardar. Inténtalo de nuevo.';
    $('submit-error').classList.remove('hidden');
  } finally {
    btn.textContent = 'Guardar 🏅';
    btn.disabled = false;
  }
});

$('btn-skip-save').addEventListener('click', () => {
  loadRanking();
  showScreen('screen-ranking');
});

// ── SCREEN 7: RANKING ─────────────────────────────────────────────────────────
$('back-from-ranking').addEventListener('click', () => showScreen('screen-subject'));
$('ranking-filter').addEventListener('change', () => loadRanking());

async function loadRanking() {
  $('ranking-loading').classList.remove('hidden');
  $('ranking-table').classList.add('hidden');
  $('ranking-empty').classList.add('hidden');

  const filter = $('ranking-filter').value;
  let url = '/ranking?order=porcentaje.desc,correctas.desc,fecha.asc&limit=50';
  if (filter !== 'all') url += `&asignatura=eq.${encodeURIComponent(filter)}`;

  try {
    const res = await sbFetch(url, { headers: { 'Range': '0-49' } });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    $('ranking-loading').classList.add('hidden');

    if (!data.length) {
      $('ranking-empty').classList.remove('hidden');
      return;
    }

    const tbody = $('ranking-tbody');
    tbody.innerHTML = '';
    data.forEach((row, i) => {
      const pos = i + 1;
      const posClass = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '';
      const pctColor = row.porcentaje >= 60 ? 'var(--correct)' : row.porcentaje >= 40 ? 'var(--warning)' : 'var(--wrong)';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="rank-pos ${posClass}">${medal || pos}</span></td>
        <td><span class="rank-name">${esc(row.nombre)}</span></td>
        <td><span class="rank-subj">${esc(row.asignatura)}</span></td>
        <td><span class="rank-score">${row.correctas}/${row.total}</span></td>
        <td><span class="rank-pct" style="color:${pctColor}">${row.porcentaje}%</span></td>
        <td><span class="rank-date">${formatDate(row.fecha)}</span></td>
      `;
      tbody.appendChild(tr);
    });

    $('ranking-table').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    $('ranking-loading').textContent = 'Error cargando el ranking.';
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
renderSubjectGrid();
renderCompSubjectGrid();
showScreen('screen-subject');
