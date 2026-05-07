/* ============================
   TESTLAB — app.js
   ============================ */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUBJECTS = [
  {
    key: 'ipei',
    name: 'Itinerario Personal de Empleabilidad I',
    abbr: 'IPEI',
    file: 'ipei_completo.json',
    icon: '💼',
    color: '#f59e0b',
  },
  {
    key: 'bbdd',
    name: 'Administración de Bases de Datos',
    abbr: 'BBDD',
    file: 'bbdd_completo.json',
    icon: '🗄️',
    color: '#3b82f6',
  },
  {
    key: 'ssoo',
    name: 'Administración de Sistemas Operativos',
    abbr: 'SSOO',
    file: 'ssoo_completo.json',
    icon: '🖥️',
    color: '#8b5cf6',
  },
  {
    key: 'lm',
    name: 'Lenguaje de Marcas',
    abbr: 'LM',
    file: 'lenguaje_completo.json',
    icon: '🏷️',
    color: '#ec4899',
  },
  {
    key: 'impl',
    name: 'Implementación de Aplicaciones Web',
    abbr: 'IAW',
    file: 'implantacion_completo.json',
    icon: '🌐',
    color: '#10b981',
  },
  {
    key: 'svc',
    name: 'Servicios de Red e Internet',
    abbr: 'SRI',
    file: 'servicios_completo.json',
    icon: '📡',
    color: '#f97316',
  },
];

const COUNT_PRESETS = [5, 10, 15, 20, 30, 50];

// ── STATE ────────────────────────────────────────────────────────────────────
let state = {
  subject: null,        // SUBJECTS item
  allQuestions: [],     // all questions from JSON
  testQuestions: [],    // selected random subset
  currentIndex: 0,
  answers: [],          // { answered: bool, correct: bool, chosen: str, correctKey: str, questionText, options }
  answered: false,
};

// ── DOM HELPERS ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const showScreen = (id) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
};

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── ESCAPE HTML ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── SHUFFLE ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── SCREEN 1: SUBJECTS ───────────────────────────────────────────────────────
function renderSubjectGrid() {
  const grid = $('subject-grid');
  grid.innerHTML = '';
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

    // Async load count
    loadQuestionCount(subj);
  });
}

async function loadQuestionCount(subj) {
  try {
    const res = await fetch(subj.file);
    const data = await res.json();
    const n = data.preguntas ? data.preguntas.length : 0;
    const el = $(`count-${subj.key}`);
    if (el) el.textContent = `${n} preguntas disponibles`;
  } catch {
    const el = $(`count-${subj.key}`);
    if (el) el.textContent = 'Error cargando';
  }
}

async function selectSubject(subj) {
  state.subject = subj;
  // Load questions
  try {
    const res = await fetch(subj.file);
    const data = await res.json();
    state.allQuestions = data.preguntas || [];
  } catch {
    showToast('Error cargando las preguntas. Revisa los archivos JSON.');
    return;
  }

  // Render count screen
  $('selected-subject-badge').textContent = `${subj.icon} ${subj.abbr}`;
  $('total-available').textContent = state.allQuestions.length;

  const countOpts = $('count-options');
  countOpts.innerHTML = '';
  COUNT_PRESETS.forEach(n => {
    const pill = document.createElement('button');
    pill.className = 'count-pill';
    if (n > state.allQuestions.length) pill.classList.add('disabled');
    pill.textContent = n;
    pill.addEventListener('click', () => startTest(n));
    countOpts.appendChild(pill);
  });

  // Custom max
  const customInput = $('custom-count');
  customInput.max = state.allQuestions.length;
  customInput.value = '';

  showScreen('screen-count');
}

// ── SCREEN 2: COUNT ──────────────────────────────────────────────────────────
$('back-to-subject').addEventListener('click', () => showScreen('screen-subject'));

$('btn-custom-start').addEventListener('click', () => {
  const val = parseInt($('custom-count').value);
  if (!val || val < 1) { showToast('Introduce un número válido'); return; }
  if (val > state.allQuestions.length) {
    showToast(`Máximo ${state.allQuestions.length} preguntas disponibles`);
    return;
  }
  startTest(val);
});

// ── START TEST ────────────────────────────────────────────────────────────────
function startTest(count) {
  const n = Math.min(count, state.allQuestions.length);
  state.testQuestions = shuffle(state.allQuestions).slice(0, n);
  state.currentIndex = 0;
  state.answers = new Array(n).fill(null);
  state.answered = false;

  // Header chips
  $('test-subject-chip').textContent = `${state.subject.icon} ${state.subject.abbr}`;
  $('q-total').textContent = n;

  updateLiveScore();
  renderQuestion();
  showScreen('screen-test');
}

// ── SCREEN 3: TEST ────────────────────────────────────────────────────────────
$('back-to-count').addEventListener('click', () => {
  if (confirm('¿Salir del test? Se perderá el progreso.')) {
    showScreen('screen-count');
  }
});

function renderQuestion() {
  const idx = state.currentIndex;
  const q = state.testQuestions[idx];
  const total = state.testQuestions.length;

  // Progress
  $('progress-bar').style.width = `${(idx / total) * 100}%`;
  $('q-current').textContent = idx + 1;

  // Card animation reset
  const card = $('question-card');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = '';

  $('question-number').textContent = `Pregunta ${idx + 1} de ${total}`;
  $('question-text').textContent = q.enunciado;

  // Options
  const grid = $('options-grid');
  grid.innerHTML = '';
  const optionKeys = ['a', 'b', 'c', 'd'].filter(k => q.opciones && q.opciones[k] != null);

  optionKeys.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.key = key;
    btn.innerHTML = `<span class="option-key">${key.toUpperCase()}</span><span>${esc(q.opciones[key])}</span>`;
    btn.addEventListener('click', () => answerQuestion(key));
    grid.appendChild(btn);
  });

  // Reset feedback
  $('explanation-box').classList.add('hidden');
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

  // Save answer
  state.answers[idx] = {
    answered: true,
    correct: isCorrect,
    chosen,
    correctKey: correct,
    questionText: q.enunciado,
    options: q.opciones,
  };

  // Mark options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.add('answered');
    if (btn.dataset.key === correct) btn.classList.add('correct');
    if (btn.dataset.key === chosen && !isCorrect) btn.classList.add('wrong');
  });

  // Feedback
  const box = $('explanation-box');
  if (isCorrect) {
    box.textContent = '✓ ¡Correcto!';
    box.className = 'explanation-box correct-feedback';
  } else {
    const correctText = q.opciones[correct];
    box.textContent = `✗ Incorrecto. La respuesta correcta es ${correct.toUpperCase()}: ${correctText}`;
    box.className = 'explanation-box';
  }
  box.classList.remove('hidden');

  updateLiveScore();

  const isLast = idx === state.testQuestions.length - 1;
  const nextBtn = $('btn-next');
  nextBtn.textContent = isLast ? 'Ver resultados →' : 'Siguiente →';
  nextBtn.classList.remove('hidden');
}

$('btn-next').addEventListener('click', () => {
  const isLast = state.currentIndex === state.testQuestions.length - 1;
  if (isLast) {
    showResults();
  } else {
    state.currentIndex++;
    renderQuestion();
  }
});

function updateLiveScore() {
  const answered = state.answers.filter(Boolean);
  const correct = answered.filter(a => a.correct).length;
  const wrong = answered.filter(a => !a.correct).length;
  $('live-correct').textContent = correct;
  $('live-wrong').textContent = wrong;
}

// ── SCREEN 4: RESULTS ─────────────────────────────────────────────────────────
function showResults() {
  const total = state.testQuestions.length;
  const answered = state.answers.filter(Boolean);
  const correct = answered.filter(a => a.correct).length;
  const wrong = answered.filter(a => !a.correct).length;
  const skipped = total - answered.length;
  const pct = Math.round((correct / total) * 100);

  // Emoji & message
  let emoji, msg;
  if (pct === 100) { emoji = '🏆'; msg = '¡Perfecto! Resultado impecable.'; }
  else if (pct >= 80) { emoji = '🎉'; msg = 'Muy buen resultado. ¡Sigue así!'; }
  else if (pct >= 60) { emoji = '👍'; msg = 'Aprobado. Pero hay margen de mejora.'; }
  else if (pct >= 40) { emoji = '📚'; msg = 'Suspendido. A repasar el temario.'; }
  else { emoji = '😅'; msg = 'Necesitas repasar bastante. ¡No te rindas!'; }

  $('result-emoji').textContent = emoji;
  $('score-percent').textContent = `${pct}%`;
  $('score-fraction').textContent = `${correct} de ${total} correctas`;
  $('score-message').textContent = msg;
  $('stat-correct').textContent = correct;
  $('stat-wrong').textContent = wrong;
  $('stat-skip').textContent = skipped;

  // Color score
  const scoreEl = $('score-percent');
  if (pct >= 60) scoreEl.style.color = 'var(--correct)';
  else if (pct >= 40) scoreEl.style.color = 'var(--warning)';
  else scoreEl.style.color = 'var(--wrong)';

  showScreen('screen-results');

  // Animate bar after brief delay
  setTimeout(() => {
    $('score-bar-fill').style.width = `${pct}%`;
  }, 100);

  // Review list — only wrong/skipped
  const reviewList = $('review-list');
  reviewList.innerHTML = '';
  const errors = state.answers.map((a, i) => ({ a, q: state.testQuestions[i], i }))
    .filter(({ a }) => !a || !a.correct);

  if (errors.length === 0) {
    reviewList.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.8rem;color:var(--correct);">✓ Sin errores. ¡Todo correcto!</p>';
  } else {
    errors.forEach(({ a, q, i }) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const yourText = a && a.chosen ? `Tu respuesta: ${a.chosen.toUpperCase()}. ${esc(q.opciones[a.chosen])}` : 'Sin responder';
      const correctText = `Correcta: ${q.respuesta_correcta.toUpperCase()}. ${esc(q.opciones[q.respuesta_correcta])}`;
      item.innerHTML = `
        <div class="review-q">P${i + 1}. ${esc(q.enunciado)}</div>
        <div class="review-answers">
          <span class="review-your">✗ ${yourText}</span>
          <span class="review-correct">✓ ${correctText}</span>
        </div>
      `;
      reviewList.appendChild(item);
    });
  }
}

$('btn-retry').addEventListener('click', () => {
  // Same subject, same count
  startTest(state.testQuestions.length);
});

$('btn-new-subject').addEventListener('click', () => {
  showScreen('screen-subject');
});

$('back-to-count').addEventListener('click', () => {
  if (confirm('¿Salir del test? Se perderá el progreso.')) {
    showScreen('screen-count');
  }
});

// ── INIT ─────────────────────────────────────────────────────────────────────
renderSubjectGrid();
showScreen('screen-subject');
