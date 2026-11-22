/**
 * TestLab — Backend del ranking competitivo en Google Sheets.
 *
 * Pegar en Extensiones → Apps Script de la hoja de cálculo y desplegar como
 * "Aplicación web" (Ejecutar como: yo · Quién tiene acceso: cualquier usuario).
 * La URL /exec resultante va en SHEETS_URL dentro de app.js.
 */
const SHEET_NAME = 'ranking';
const HEADERS = ['nombre', 'asignatura', 'correctas', 'total', 'porcentaje', 'tiempo_segundos', 'puntuacion', 'fecha'];
const MAX_RESULTS = 50;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const num_ = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Guardar un resultado
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const nombre = String(d.nombre || '').trim().slice(0, 40);
    const asignatura = String(d.asignatura || '').trim().slice(0, 20);
    if (!nombre || !asignatura) return json_({ ok: false, error: 'Datos incompletos' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet_().appendRow([
        nombre,
        asignatura,
        num_(d.correctas),
        num_(d.total),
        num_(d.porcentaje),
        num_(d.tiempo_segundos),
        num_(d.puntuacion),
        new Date(),
      ]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Leer el ranking (?asignatura=XXX opcional)
function doGet(e) {
  const values = getSheet_().getDataRange().getValues();
  const rows = values.slice(1).filter(r => r[0] !== '');
  let data = rows.map(r => ({
    nombre: String(r[0]),
    asignatura: String(r[1]),
    correctas: num_(r[2]),
    total: num_(r[3]),
    porcentaje: num_(r[4]),
    tiempo_segundos: num_(r[5]),
    puntuacion: num_(r[6]),
    fecha: r[7] instanceof Date ? r[7].toISOString() : String(r[7]),
  }));

  const filtro = e && e.parameter && e.parameter.asignatura;
  if (filtro && filtro !== 'all') data = data.filter(r => r.asignatura === filtro);

  // Puntuación desc → tiempo asc → fecha asc
  data.sort((a, b) =>
    b.puntuacion - a.puntuacion ||
    a.tiempo_segundos - b.tiempo_segundos ||
    new Date(a.fecha) - new Date(b.fecha));

  return json_(data.slice(0, MAX_RESULTS));
}
