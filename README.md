# TestLab — Simulacros de Examen

TestLab es una aplicación web estática para hacer **simulacros tipo test** a partir de bancos de preguntas en JSON. Permite elegir una asignatura, seleccionar cuántas preguntas quieres (con presets o número personalizado), realizar el test y ver un **resumen de resultados** con repaso de errores.

## Características

- Selección de **asignatura** (ASIR / Ciberseguridad).
- Selección de **número de preguntas** (presets y personalizado).
- Preguntas aleatorias a partir de ficheros `.json`.
- Corrección inmediata y **pantalla de resultados** con repaso de errores.
- Sin backend, sin build: funciona con **HTML + CSS + JavaScript**.

## Estructura del proyecto

- `index.html`: interfaz (pantallas y layout).
- `style.css`: estilos.
- `app.js`: lógica del test (carga de preguntas, aleatorización, progreso, resultados).
- `*_completo.json`: bancos de preguntas por asignatura.

