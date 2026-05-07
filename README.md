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

## Uso en local

Como el proyecto hace `fetch()` de ficheros `.json`, lo ideal es servirlo con un servidor local (no abriendo el HTML con `file://`).

- Opción 1 (recomendado): extensión “Live Server” en VS Code/Cursor y abrir `index.html`.
- Opción 2: cualquier servidor estático (por ejemplo, `python -m http.server`).

## Despliegue en Netlify

Este repo ya incluye `netlify.toml` con la configuración mínima:

- **Publish directory**: `.`
- **Build command**: ninguno (sitio estático)
- Redirect SPA: `/* → /index.html` (evita 404 en recargas)

En Netlify:

1. “Add new site” → “Import an existing project”.
2. Conecta el repositorio.
3. Deja la configuración por defecto (Netlify leerá `netlify.toml`).
4. Deploy.

