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
  { key: 'ports', name: 'Puertos y Protocolos',                   abbr: 'PUERTOS', file: 'puertos.json',            icon: '🔌', color: '#06b6d4' },
];

const COUNT_PRESETS  = [5, 10, 15, 20, 30, 50];
const COMP_QUESTIONS = 30;

// ── STATE ─────────────────────────────────────────────────────────────────────
let state = {
  subject:       null,
  allQuestions:  [],
  testQuestions: [],
  currentIndex:  0,
  answers:       [],
  answered:      false,
  isCompetitive: false,
  compResult:    null,   // { correct, wrong, skipped, total, puntuacion, pct, abbr, tiempoSegundos }
  // timer
  timerInterval: null,
  timerSeconds:  0,
  focusedElementIndex: -1,

  // study mode state
  isStudyMode:    false,
  studyQuestions: [],
  studyOrder:     [],
  studyAnswers:   {},   // { originalIndex: { chosen: 'a' or null, revealed: true } }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const showScreen = (id) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
  state.focusedElementIndex = -1;
  updateKeyboardFocus();
};

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,229,176,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  state.timerSeconds = 0;
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const el = $('comp-timer');
  if (el) el.textContent = formatTime(state.timerSeconds);
}

// ── PUNTUACIÓN TIPO TEST (−1/3 por fallo) ────────────────────────────────────
// Formula: correctas - (errores / 3)
// Redondeado a 2 decimales, mínimo 0
function calcPuntuacion(correct, wrong) {
  const raw = correct - (wrong / 3);
  return Math.max(0, Math.round(raw * 100) / 100);
}

// ── SCREEN 1: SUBJECT GRID ────────────────────────────────────────────────────
function renderSubjectGrid() {
  const grid = $('subject-grid');
  grid.innerHTML = '';

  const compCard = document.createElement('div');
  compCard.className = 'subject-card comp-card';
  compCard.innerHTML = `
    <div class="card-icon">⚡</div>
    <div class="comp-card-text">
      <div class="card-name">Modo Competitivo</div>
      <div class="card-abbr">30 preguntas · Ranking global · Con penalización</div>
    </div>
    <span class="comp-card-cta">Jugar →</span>
  `;
  compCard.addEventListener('click', () => showScreen('screen-competitive'));
  grid.appendChild(compCard);

  const studyCard = document.createElement('div');
  studyCard.className = 'subject-card study-card';
  studyCard.innerHTML = `
    <div class="card-icon">📚</div>
    <div class="study-card-text">
      <div class="card-name">Modo Estudio</div>
      <div class="card-abbr">Sin presión · Ver respuestas e índices · Todas las preguntas</div>
    </div>
    <span class="study-card-cta">Estudiar →</span>
  `;
  studyCard.addEventListener('click', () => { renderStudySubjectGrid(); showScreen('screen-study-subjects'); });
  grid.appendChild(studyCard);

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
    const res  = await fetch(subj.file);
    const data = await res.json();
    const el   = $(`count-${subj.key}`);
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
    const res  = await fetch(subj.file);
    const data = await res.json();
    state.allQuestions = data.preguntas || [];
  } catch {
    showToast('Error cargando las preguntas.');
    return;
  }
  startTest(COMP_QUESTIONS);
}

// ── SCREEN 8: STUDY MODE SUBJECT GRID ──────────────────────────────────────────
function renderStudySubjectGrid() {
  const grid = $('study-subject-grid');
  grid.innerHTML = '';
  SUBJECTS.forEach(subj => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--card-accent', subj.color);
    card.innerHTML = `
      <div class="card-icon">${subj.icon}</div>
      <div class="card-name">${subj.name}</div>
      <div class="card-abbr">${subj.abbr}</div>
      <div class="card-count" id="study-count-${subj.key}" style="color:${subj.color}">Cargando…</div>
    `;
    card.addEventListener('click', () => startStudySession(subj));
    grid.appendChild(card);
    loadStudyQuestionCount(subj);
  });
}

async function loadStudyQuestionCount(subj) {
  try {
    const res  = await fetch(subj.file);
    const data = await res.json();
    const el   = $(`study-count-${subj.key}`);
    if (el) el.textContent = `${data.preguntas?.length ?? 0} preguntas`;
  } catch {
    const el = $(`study-count-${subj.key}`);
    if (el) el.textContent = 'Error cargando';
  }
}

$('back-from-study-subjects').addEventListener('click', () => showScreen('screen-subject'));
$('back-from-study-session').addEventListener('click', () => {
  if (confirm('¿Salir del modo estudio? Se perderá el progreso de esta sesión.')) {
    showScreen('screen-study-subjects');
  }
});

async function startStudySession(subj) {
  state.isStudyMode = true;
  state.isCompetitive = false;
  state.subject = subj;
  try {
    const res  = await fetch(subj.file);
    const data = await res.json();
    state.studyQuestions = data.preguntas || [];
  } catch {
    showToast('Error cargando las preguntas.');
    return;
  }

  // Set up CSS theme variables for study session screen
  const studyScreen = $('screen-study-session');
  if (studyScreen && subj.color) {
    studyScreen.style.setProperty('--subject-accent', subj.color);
  }

  $('study-session-chip').textContent = `📚 ${subj.abbr}`;
  $('study-total').textContent = state.studyQuestions.length;

  // Initialize study state
  state.currentIndex = 0;
  state.studyAnswers = {};
  state.studyOrder = Array.from({ length: state.studyQuestions.length }, (_, i) => i);

  // Initialize controls
  $('study-shuffle-toggle').checked = false;
  $('study-auto-reveal-toggle').checked = false;

  // Generate question selector dropdown options
  const selector = $('study-question-selector');
  selector.innerHTML = '';
  state.studyQuestions.forEach((q, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    const text = q.enunciado.length > 50 ? q.enunciado.slice(0, 50) + '...' : q.enunciado;
    opt.textContent = `${idx + 1}. ${text}`;
    selector.appendChild(opt);
  });

  selector.value = 0;

  // Render the first question
  renderStudyQuestion();
  showScreen('screen-study-session');
}

function renderStudyQuestion() {
  const idx = state.currentIndex;
  const origIdx = state.studyOrder[idx];
  const q = state.studyQuestions[origIdx];
  const total = state.studyQuestions.length;

  // Update progress bar
  $('study-progress-bar').style.width = `${((idx + 1) / total) * 100}%`;
  $('study-current').textContent = idx + 1;
  $('study-question-selector').value = origIdx;

  // Card animation reflow
  const card = $('study-question-card');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = '';

  $('study-question-number').textContent = `Pregunta ${idx + 1} de ${total}`;
  $('study-question-text').textContent = q.enunciado;

  // Options grid
  const grid = $('study-options-grid');
  grid.innerHTML = '';

  const optionsKeys = ['a', 'b', 'c', 'd'].filter(k => q.opciones?.[k] != null);
  const saved = state.studyAnswers[origIdx] || null;
  const isAutoReveal = $('study-auto-reveal-toggle').checked;
  const shouldShowAnswer = isAutoReveal || (saved && saved.revealed);

  optionsKeys.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.key = key;
    btn.innerHTML = `<span class="option-key">${key.toUpperCase()}</span><span>${esc(q.opciones[key])}</span>`;

    if (saved && saved.chosen) {
      btn.classList.add('answered');
      if (key === q.respuesta_correcta) btn.classList.add('correct');
      if (key === saved.chosen && saved.chosen !== q.respuesta_correcta) btn.classList.add('wrong');
    } else if (shouldShowAnswer) {
      btn.classList.add('answered');
      if (key === q.respuesta_correcta) btn.classList.add('correct');
    } else {
      btn.addEventListener('click', () => answerStudyQuestion(key));
    }
    grid.appendChild(btn);
  });

  // Explanation box
  const box = $('study-explanation-box');
  box.className = 'explanation-box hidden';

  if (saved && saved.chosen) {
    const isCorrect = saved.chosen === q.respuesta_correcta;
    if (isCorrect) {
      box.textContent = '✓ ¡Correcto!';
      box.className = 'explanation-box correct-feedback';
    } else {
      box.textContent = `✗ Incorrecto. La respuesta correcta es ${q.respuesta_correcta.toUpperCase()}: ${q.opciones[q.respuesta_correcta]}`;
      box.className = 'explanation-box wrong-feedback';
    }
    box.classList.remove('hidden');
  } else if (shouldShowAnswer) {
    box.textContent = `Respuesta correcta es ${q.respuesta_correcta.toUpperCase()}: ${q.opciones[q.respuesta_correcta]}`;
    box.className = 'explanation-box correct-feedback';
    box.classList.remove('hidden');
  }

  // Navigation button states
  $('btn-study-prev').disabled = (idx === 0);
  $('btn-study-prev').style.opacity = (idx === 0) ? 0.4 : 1;
  $('btn-study-prev').style.pointerEvents = (idx === 0) ? 'none' : 'auto';

  const isLast = (idx === total - 1);
  $('btn-study-next').textContent = isLast ? 'Finalizar estudio 🏁' : 'Siguiente →';
  
  // Set focus on keyboard navigation if needed
  state.focusedElementIndex = -1;
}

function answerStudyQuestion(chosen) {
  const idx = state.currentIndex;
  const origIdx = state.studyOrder[idx];
  const q = state.studyQuestions[origIdx];

  state.studyAnswers[origIdx] = {
    chosen: chosen,
    revealed: true
  };

  renderStudyQuestion();
}

$('study-shuffle-toggle').addEventListener('change', () => {
  const currentIdxInOrig = state.studyOrder[state.currentIndex];
  const n = state.studyQuestions.length;
  if ($('study-shuffle-toggle').checked) {
    const indices = Array.from({ length: n }, (_, i) => i);
    state.studyOrder = shuffle(indices);
  } else {
    state.studyOrder = Array.from({ length: n }, (_, i) => i);
  }
  state.currentIndex = state.studyOrder.indexOf(currentIdxInOrig);
  if (state.currentIndex === -1) state.currentIndex = 0;

  renderStudyQuestion();
});

$('study-auto-reveal-toggle').addEventListener('change', () => {
  renderStudyQuestion();
});

$('btn-study-reset').addEventListener('click', () => {
  const origIdx = state.studyOrder[state.currentIndex];
  delete state.studyAnswers[origIdx];
  renderStudyQuestion();
});

$('btn-study-reveal').addEventListener('click', () => {
  const origIdx = state.studyOrder[state.currentIndex];
  state.studyAnswers[origIdx] = {
    chosen: null,
    revealed: true
  };
  renderStudyQuestion();
});

$('btn-study-prev').addEventListener('click', () => {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderStudyQuestion();
  }
});

$('btn-study-next').addEventListener('click', () => {
  const total = state.studyQuestions.length;
  if (state.currentIndex < total - 1) {
    state.currentIndex++;
    renderStudyQuestion();
  } else {
    if (confirm('¿Has terminado de estudiar? Volverás a la selección de asignaturas.')) {
      showScreen('screen-study-subjects');
    }
  }
});

$('study-question-selector').addEventListener('change', (e) => {
  const origIdx = parseInt(e.target.value);
  const idx = state.studyOrder.indexOf(origIdx);
  if (idx !== -1) {
    state.currentIndex = idx;
    renderStudyQuestion();
  }
});

// ── SCREEN 2: COUNT (modo normal) ─────────────────────────────────────────────
async function selectSubject(subj) {
  state.isCompetitive = false;
  state.subject = subj;
  try {
    const res  = await fetch(subj.file);
    const data = await res.json();
    state.allQuestions = data.preguntas || [];
  } catch {
    showToast('Error cargando las preguntas.');
    return;
  }

  // Accent específico para la pantalla de selección de preguntas
  const countContainer = document.querySelector('#screen-count .count-container');
  if (countContainer) countContainer.style.setProperty('--subject-accent', subj.color);

  $('selected-subject-badge').textContent = `${subj.icon} ${subj.abbr}`;
  $('total-available').textContent = state.allQuestions.length;

  const countOpts = $('count-options');
  countOpts.innerHTML = '';
  const presets = (subj.key === 'ports')
    ? COUNT_PRESETS.filter(n => n !== 30 && n !== 50).concat(25).sort((a, b) => a - b)
    : COUNT_PRESETS;

  presets.forEach(n => {
    const pill = document.createElement('button');
    pill.className = 'count-pill' + (n > state.allQuestions.length ? ' disabled' : '');
    pill.textContent = n;
    pill.addEventListener('click', () => startTest(n));
    countOpts.appendChild(pill);
  });

  $('custom-count').max   = state.allQuestions.length;
  $('custom-count').value = '';
  showScreen('screen-count');
}

$('back-to-subject').addEventListener('click', () => showScreen('screen-subject'));
$('btn-custom-start').addEventListener('click', () => {
  const val = parseInt($('custom-count').value);
  if (!val || val < 1)                      { showToast('Introduce un número válido'); return; }
  if (val > state.allQuestions.length)       { showToast(`Máximo ${state.allQuestions.length} preguntas`); return; }
  startTest(val);
});

// ── START TEST ────────────────────────────────────────────────────────────────
function startTest(count) {
  const n = Math.min(count, state.allQuestions.length);
  
  // Seleccionamos N preguntas al azar y para cada una mezclamos sus opciones
  state.testQuestions = shuffle(state.allQuestions).slice(0, n).map(q => {
    if (!q.opciones) return { ...q };
    
    const keys = Object.keys(q.opciones).filter(k => q.opciones[k] != null);
    const shuffledKeys = shuffle([...keys]);
    const newOpciones = {};
    let newCorrectKey = q.respuesta_correcta;
    
    keys.forEach((key, i) => {
      const sourceKey = shuffledKeys[i];
      newOpciones[key] = q.opciones[sourceKey];
      if (sourceKey === q.respuesta_correcta) {
        newCorrectKey = key;
      }
    });
    
    return { ...q, opciones: newOpciones, respuesta_correcta: newCorrectKey };
  });

  state.currentIndex  = 0;
  state.answers       = new Array(n).fill(null);
  state.answered      = false;

  // Accent específico por asignatura también dentro del test (hover respuestas + chip superior)
  const testScreen = document.querySelector('#screen-test');
  if (testScreen && state.subject?.color) {
    testScreen.style.setProperty('--subject-accent', state.subject.color);
  }

  // Header chip
  const chip = $('test-subject-chip');
  chip.textContent = `${state.subject.icon} ${state.subject.abbr}`;
  chip.className   = state.isCompetitive ? 'comp-chip' : 'subject-chip';

  $('q-total').textContent = n;

  // Timer row: show only in competitive
  const timerRow = $('timer-row');
  if (state.isCompetitive) {
    timerRow.classList.remove('hidden');
    startTimer();
  } else {
    timerRow.classList.add('hidden');
    stopTimer();
  }

  updateLiveScore();
  renderQuestion();
  showScreen('screen-test');
}

// ── SCREEN 3: TEST ────────────────────────────────────────────────────────────
$('back-to-count').addEventListener('click', () => {
  if (confirm('¿Salir del test? Se perderá el progreso.')) {
    stopTimer();
    showScreen(state.isCompetitive ? 'screen-competitive' : 'screen-count');
  }
});

function renderQuestion() {
  const idx   = state.currentIndex;
  const q     = state.testQuestions[idx];
  const total = state.testQuestions.length;

  $('progress-bar').style.width = `${(idx / total) * 100}%`;
  $('q-current').textContent    = idx + 1;

  const card = $('question-card');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = '';

  $('question-number').textContent = `Pregunta ${idx + 1} de ${total}`;
  $('question-text').textContent   = q.enunciado;

  const grid = $('options-grid');
  grid.innerHTML = '';
  ['a', 'b', 'c', 'd'].filter(k => q.opciones?.[k] != null).forEach(key => {
    const btn = document.createElement('button');
    btn.className    = 'option-btn';
    btn.dataset.key  = key;
    btn.innerHTML    = `<span class="option-key">${key.toUpperCase()}</span><span>${esc(q.opciones[key])}</span>`;
    btn.addEventListener('click', () => answerQuestion(key));
    grid.appendChild(btn);
  });

  $('explanation-box').className = 'explanation-box hidden';
  $('btn-next').classList.add('hidden');
  state.answered = false;
  state.focusedElementIndex = -1;
}

function answerQuestion(chosen) {
  if (state.answered) return;
  state.answered = true;

  const idx      = state.currentIndex;
  const q        = state.testQuestions[idx];
  const correct  = q.respuesta_correcta;
  const isCorrect = chosen === correct;

  state.answers[idx] = { answered: true, correct: isCorrect, chosen, correctKey: correct, questionText: q.enunciado, options: q.opciones };

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.add('answered');
    if (btn.dataset.key === correct)           btn.classList.add('correct');
    if (btn.dataset.key === chosen && !isCorrect) btn.classList.add('wrong');
  });

  const box = $('explanation-box');
  if (isCorrect) {
    box.textContent = '✓ ¡Correcto!';
    box.className   = 'explanation-box correct-feedback';
  } else {
    box.textContent = `✗ Incorrecto. La respuesta correcta es ${correct.toUpperCase()}: ${q.opciones[correct]}`;
    box.className   = 'explanation-box wrong-feedback';
  }
  box.classList.remove('hidden');

  updateLiveScore();

  const isLast   = idx === state.testQuestions.length - 1;
  const nextBtn  = $('btn-next');
  nextBtn.textContent = isLast ? (state.isCompetitive ? 'Ver mi resultado →' : 'Ver resultados →') : 'Siguiente →';
  nextBtn.classList.remove('hidden');

  // Auto-enfocar el botón Siguiente para navegación por teclado
  state.focusedElementIndex = 0; 
  updateKeyboardFocus();
}

$('btn-next').addEventListener('click', () => {
  const isLast = state.currentIndex === state.testQuestions.length - 1;
  if (isLast) {
    stopTimer();
    state.isCompetitive ? showSubmit() : showResults();
  } else {
    state.currentIndex++;
    renderQuestion();
  }
});

function updateLiveScore() {
  const answered = state.answers.filter(Boolean);
  $('live-correct').textContent = answered.filter(a =>  a.correct).length;
  $('live-wrong').textContent   = answered.filter(a => !a.correct).length;
}

// ── SCREEN 4: RESULTS (modo normal) ──────────────────────────────────────────
function showResults() {
  const total   = state.testQuestions.length;
  const answered = state.answers.filter(Boolean);
  const correct  = answered.filter(a =>  a.correct).length;
  const wrong    = answered.filter(a => !a.correct).length;
  const skipped  = total - answered.length;
  const pct      = Math.round((correct / total) * 100);

  let emoji, msg;
  if (pct === 100)    { emoji = '🏆'; msg = '¡Perfecto! Resultado impecable.'; }
  else if (pct >= 80) { emoji = '🎉'; msg = 'Muy buen resultado. ¡Sigue así!'; }
  else if (pct >= 60) { emoji = '👍'; msg = 'Aprobado. Pero hay margen de mejora.'; }
  else if (pct >= 40) { emoji = '📚'; msg = 'Suspendido. A repasar el temario.'; }
  else                { emoji = '😅'; msg = 'Necesitas repasar bastante. ¡No te rindas!'; }

  $('result-emoji').textContent  = emoji;
  $('score-percent').textContent = `${pct}%`;
  $('score-percent').style.color = pct >= 60 ? 'var(--correct)' : pct >= 40 ? 'var(--warning)' : 'var(--wrong)';
  $('score-fraction').textContent = `${correct} de ${total} correctas`;
  $('score-message').textContent  = msg;
  $('stat-correct').textContent   = correct;
  $('stat-wrong').textContent     = wrong;
  $('stat-skip').textContent      = skipped;

  showScreen('screen-results');
  setTimeout(() => { $('score-bar-fill').style.width = `${pct}%`; }, 100);

  const reviewList = $('review-list');
  reviewList.innerHTML = '';
  const errors = state.answers.map((a, i) => ({ a, q: state.testQuestions[i], i })).filter(({ a }) => !a || !a.correct);
  if (!errors.length) {
    reviewList.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.8rem;color:var(--correct);">✓ Sin errores. ¡Todo correcto!</p>';
  } else {
    errors.forEach(({ a, q, i }) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const yourText    = a?.chosen ? `Tu respuesta: ${a.chosen.toUpperCase()}. ${esc(q.opciones[a.chosen])}` : 'Sin responder';
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
  const total      = state.testQuestions.length;
  const answered   = state.answers.filter(Boolean);
  const correct    = answered.filter(a =>  a.correct).length;
  const wrong      = answered.filter(a => !a.correct).length;
  const skipped    = total - answered.length;
  const puntuacion = calcPuntuacion(correct, wrong);
  // % based on penalized score vs total questions
  const pct        = Math.round((puntuacion / total) * 100);
  const tiempoSeg  = state.timerSeconds;

  state.compResult = { correct, wrong, skipped, total, puntuacion, pct, abbr: state.subject.abbr, tiempoSegundos: tiempoSeg };

  let emoji;
  if (pct >= 90) emoji = '🏆';
  else if (pct >= 70) emoji = '🎉';
  else if (pct >= 50) emoji = '👍';
  else emoji = '📚';

  $('submit-emoji').textContent    = emoji;
  $('submit-percent').textContent  = `${pct}%`;
  $('submit-percent').style.color  = pct >= 60 ? 'var(--correct)' : pct >= 40 ? 'var(--warning)' : 'var(--wrong)';
  $('submit-fraction').textContent = `${correct} correctas · ${wrong} errores · ${skipped} sin responder`;

  // Penalty breakdown
  $('submit-penalty').innerHTML =
    `<span class="penalty-correct">+${correct} correctas</span>` +
    `<span class="penalty-sep">−</span>` +
    `<span class="penalty-wrong">${wrong} errores ÷ 3 = −${(wrong/3).toFixed(2)}</span>` +
    `<span class="penalty-sep">=</span>` +
    `<span class="penalty-total">${puntuacion} / ${total} puntos</span>`;

  $('submit-time').textContent  = formatTime(tiempoSeg);
  $('submit-error').classList.add('hidden');
  $('player-name').value = '';

  showScreen('screen-submit');
  setTimeout(() => { $('submit-bar').style.width = `${Math.min(pct, 100)}%`; }, 100);
}

$('btn-save-score').addEventListener('click', async () => {
  const name = $('player-name').value.trim();
  if (!name) {
    $('submit-error').textContent = 'Introduce tu nombre.';
    $('submit-error').classList.remove('hidden');
    return;
  }

  const btn = $('btn-save-score');
  btn.textContent = 'Guardando…';
  btn.disabled    = true;

  const { correct, wrong, skipped, total, puntuacion, pct, abbr, tiempoSegundos } = state.compResult;
  try {
    const res = await sbFetch('/ranking', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        nombre:           name,
        asignatura:       abbr,
        correctas:        correct,
        total,
        porcentaje:       pct,
        tiempo_segundos:  tiempoSegundos,
        puntuacion,
      }),
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
    btn.disabled    = false;
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
  // Order: puntuacion desc → tiempo_segundos asc (desempate por rapidez) → fecha asc
  let url = '/ranking?order=puntuacion.desc,tiempo_segundos.asc,fecha.asc&limit=50';
  if (filter !== 'all') url += `&asignatura=eq.${encodeURIComponent(filter)}`;

  try {
    const res = await sbFetch(url, { headers: { 'Range': '0-49' } });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    $('ranking-loading').classList.add('hidden');

    if (!data.length) { $('ranking-empty').classList.remove('hidden'); return; }

    const tbody = $('ranking-tbody');
    tbody.innerHTML = '';
    const subjectColorByAbbr = SUBJECTS.reduce((acc, s) => {
      acc[s.abbr] = s.color;
      return acc;
    }, {});
    data.forEach((row, i) => {
      const pos      = i + 1;
      const posClass = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';
      const medal    = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '';
      const pctColor = (row.porcentaje ?? 0) >= 60 ? 'var(--correct)' : (row.porcentaje ?? 0) >= 40 ? 'var(--warning)' : 'var(--wrong)';
      const tiempoStr = row.tiempo_segundos != null ? formatTime(row.tiempo_segundos) : '—';
      const puntuacionStr = row.puntuacion != null ? `${row.puntuacion}` : `${row.correctas}`;
      const subjAbbr = String(row.asignatura ?? '');
      const subjColor = subjectColorByAbbr[subjAbbr];
      const subjStyle = subjColor
        ? `color:${subjColor};background:${hexToRgba(subjColor, 0.14)};border-color:${hexToRgba(subjColor, 0.38)};`
        : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="rank-pos ${posClass}">${medal || pos}</span></td>
        <td><span class="rank-name">${esc(row.nombre)}</span></td>
        <td><span class="rank-subj" style="${subjStyle}">${esc(row.asignatura)}</span></td>
        <td><span class="rank-score">${puntuacionStr}/${row.total}</span></td>
        <td><span class="rank-pct" style="color:${pctColor}">${row.porcentaje ?? '—'}%</span></td>
        <td><span class="rank-time">⏱ ${tiempoStr}</span></td>
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

// ── KEYBOARD NAVIGATION ──────────────────────────────────────────────────────
function getFocusableElements() {
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen) return [];

  switch (activeScreen.id) {
    case 'screen-subject':
      return Array.from(activeScreen.querySelectorAll('.subject-card'));
    case 'screen-count':
      return Array.from(activeScreen.querySelectorAll('.count-pill:not(.disabled), #btn-custom-start, .btn-back'));
    case 'screen-test':
      // Si ya se respondió, el foco solo puede ir al botón Siguiente o Salir
      if (state.answered) {
        return Array.from(activeScreen.querySelectorAll('#btn-next:not(.hidden), #back-to-count'));
      }
      return Array.from(activeScreen.querySelectorAll('.option-btn, #back-to-count'));
    case 'screen-results':
      return Array.from(activeScreen.querySelectorAll('.btn-primary, .btn-secondary'));
    case 'screen-competitive':
      return Array.from(activeScreen.querySelectorAll('.subject-card, #btn-view-ranking, .btn-back'));
    case 'screen-submit':
      return Array.from(activeScreen.querySelectorAll('#player-name, #btn-save-score, #btn-skip-save'));
    case 'screen-ranking':
      return Array.from(activeScreen.querySelectorAll('.ranking-select, .btn-back'));
    case 'screen-study-subjects':
      return Array.from(activeScreen.querySelectorAll('.subject-card, .btn-back'));
    case 'screen-study-session':
      return Array.from(activeScreen.querySelectorAll('.option-btn:not(.answered), #btn-study-prev, #btn-study-next, #btn-study-reset, #btn-study-reveal, #back-from-study-session'));
    default:
      return [];
  }
}

function updateKeyboardFocus() {
  // Limpiar focos anteriores
  document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));
  
  const elements = getFocusableElements();
  if (state.focusedElementIndex >= 0 && state.focusedElementIndex < elements.length) {
    const el = elements[state.focusedElementIndex];
    el.classList.add('focused');
    // Si es un input, le damos el foco real para que pueda escribir
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      el.focus();
    } else {
      // Para botones/cards, quitamos el foco real si lo tiene otro input para evitar problemas
      if (document.activeElement.tagName === 'INPUT') document.activeElement.blur();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

window.addEventListener('keydown', (e) => {
  const elements = getFocusableElements();
  if (!elements.length) return;

  if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    state.focusedElementIndex = (state.focusedElementIndex + 1) % elements.length;
    updateKeyboardFocus();
  } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault();
    state.focusedElementIndex = (state.focusedElementIndex - 1 + elements.length) % elements.length;
    updateKeyboardFocus();
  } else if (e.key === 'Enter') {
    const activeScreen = document.querySelector('.screen.active');
    
    // Comportamiento especial para el test: si ya se respondió, Enter siempre pasa de pregunta
    if (activeScreen && activeScreen.id === 'screen-test' && state.answered) {
      e.preventDefault();
      $('btn-next').click();
      return;
    }

    // Comportamiento especial para el modo estudio: si ya se respondió, Enter pasa de pregunta
    if (activeScreen && activeScreen.id === 'screen-study-session') {
      const origIdx = state.studyOrder[state.currentIndex];
      const isAnswered = state.studyAnswers[origIdx] && state.studyAnswers[origIdx].revealed;
      if (isAnswered) {
        e.preventDefault();
        $('btn-study-next').click();
        return;
      }
    }

    if (state.focusedElementIndex >= 0) {
      const el = elements[state.focusedElementIndex];
      // Si es un botón o card, hacemos click
      if (el.tagName === 'BUTTON' || el.classList.contains('subject-card') || el.classList.contains('option-btn')) {
        e.preventDefault();
        el.click();
      }
      // Si es el input de nombre, el Enter natural del formulario ya debería funcionar o podemos disparar el guardado
      if (el.id === 'player-name' && e.target === el) {
        // Dejamos que el Enter natural funcione
      }
    }
  }
});

// ── INIT ──────────────────────────────────────────────────────────────────────
renderSubjectGrid();
renderCompSubjectGrid();
showScreen('screen-subject');
