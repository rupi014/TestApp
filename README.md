# 🧪 AsirTestLab — Simulacros de Examen

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack: JS/HTML/CSS](https://img.shields.io/badge/Stack-Pure%20JS%20%7C%20HTML%20%7C%20CSS-blue)](https://developer.mozilla.org/es/docs/Web/JavaScript)

**AsirTestLab** es una plataforma web de alto rendimiento diseñada para la realización de simulacros de examen tipo test. Enfocada inicialmente en el ciclo de **ASIR (Administración de Sistemas Informáticos en Red)** y **Ciberseguridad**, la aplicación ofrece una experiencia de aprendizaje interactiva, dinámica y visualmente atractiva.



---

## 🚀 Características Principales

### 🎯 Gestión de Asignaturas
Acceso a un catálogo completo de módulos con bancos de preguntas actualizados:
- **IPEI**: Itinerario Personal de Empleabilidad I.
- **BBDD**: Administración de Bases de Datos.
- **SSOO**: Administración de Sistemas Operativos.
- **LM**: Lenguaje de Marcas.
- **IAW**: Implementación de Aplicaciones Web.
- **SRI**: Servicios de Red e Internet.
- **PUERTOS**: Diccionario de Puertos y Protocolos.

### 🎮 Modos de Juego

#### 🔹 Modo Práctica (Normal)
Ideal para el estudio diario y repaso de conceptos.
- **Configuración flexible**: Elige entre presets (5, 10, 15, 20, 30, 50) o un número personalizado de preguntas.
- **Feedback inmediato**: Corrección en tiempo real con explicaciones detalladas.
- **Repaso de errores**: Al finalizar, accede a un desglose completo de las preguntas falladas para reforzar conocimientos.

#### 📚 Modo Estudio (Estudiar)
Diseñado para el aprendizaje profundo y sistemático de los conceptos sin la presión de cronómetros, puntuaciones ni penalizaciones.
- **Acceso Completo**: Permite estudiar el banco de preguntas completo de la asignatura elegida.
- **Navegación Libre y Flexible**:
  - Avanza y retrocede por las preguntas con total libertad usando los botones **Anterior** y **Siguiente**.
  - Salta directamente a cualquier pregunta utilizando el **selector desplegable** inteligente.
- **Toggles de Aprendizaje Activo**:
  - **Mezclar preguntas**: Alterna entre el orden original del banco (ideal para estudio sistemático) y un orden aleatorio.
  - **Revelar al cargar**: Úsalo a modo de tarjeta de memoria (*flashcard*) para ver la respuesta correcta y justificación inmediatamente al cargar la pregunta.
- **Interactividad y Repaso**:
  - Haz clic en las opciones para recibir feedback instantáneo (verde para aciertos, rojo para fallos) junto con la explicación completa.
  - Botón **Revelar respuesta** para ver la solución en cualquier momento sin necesidad de equivocarte primero.
  - Botón **Reiniciar pregunta** para borrar tu selección activa y volver a intentar responderla las veces que quieras.

#### ⚡ Modo Competitivo
Pon a prueba tus conocimientos bajo presión y compite con otros estudiantes.
- **Reto Estándar**: 30 preguntas aleatorias de la asignatura seleccionada.
- **Sistema de Penalización**: Se aplica una penalización de **-0.33 puntos** por cada respuesta incorrecta (fórmula: `aciertos - (errores / 3)`).
- **Cronómetro**: El tiempo es un factor determinante para el desempate.
- **Ranking Global**: Guarda tu puntuación y escala posiciones en el leaderboard integrado con **Supabase**.

### 🎨 Experiencia de Usuario (UI/UX)
- **Diseño Moderno**: Interfaz basada en *glassmorphism* con efectos visuales dinámicos y transiciones suaves.
- **Tematización Dinámica**: La interfaz adapta sus colores de acento según la asignatura seleccionada.
- **Responsive Design**: Totalmente optimizado para dispositivos móviles y escritorio.
- **Aleatorización Avanzada**: Algoritmo de Fisher-Yates para barajar tanto el orden de las preguntas como el de las opciones de respuesta en cada intento.

---

## 🛠️ Stack Tecnológico

La aplicación ha sido desarrollada priorizando la ligereza y el rendimiento, sin dependencias pesadas ni procesos de compilación complejos:

- **Frontend**: HTML5 Semántico, CSS3 Moderno (Variables, Flexbox, Grid) y Vanilla JavaScript (ES6+).
- **Backend (BaaS)**: [Supabase](https://supabase.com/) para la persistencia del ranking global.
- **Base de Datos**: Archivos JSON estructurados para los bancos de preguntas.
- **Despliegue**: Optimizado para Netlify.

---

## 📂 Estructura del Proyecto

```text
├── index.html          # Estructura principal y contenedores de pantallas
├── style.css           # Sistema de diseño, animaciones y responsive
├── app.js              # Motor del test, gestión de estado e integración con Supabase
├── netlify.toml        # Configuración de despliegue
├── *_completo.json     # Bancos de preguntas por asignatura
└── ranking.json        # (Legacy/Mock) Datos de ranking
```

---

## 🔧 Instalación y Uso Local

Al ser una aplicación estática, no requiere instalación de dependencias.

1.  **Clona el repositorio**:
    ```bash
    git clone https://github.com/tu-usuario/TestApp.git
    ```
2.  **Abre el proyecto**:
    Simplemente abre `index.html` en tu navegador favorito.
    *Nota: Para que las peticiones `fetch` a los archivos JSON y Supabase funcionen correctamente, se recomienda usar un servidor local (ej: la extensión "Live Server" de VS Code).*

---

## 👤 Autor

Desarrollado con ❤️ por **Rubens Ballester**.

---

*Este proyecto es de código abierto. Si encuentras algún error en las preguntas o quieres añadir nuevas funcionalidades, ¡las contribuciones son bienvenidas!*
