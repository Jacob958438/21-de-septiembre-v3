// ============================================================
// CONFIG.js — Todos los valores ajustables del proyecto viven aquí.
// Cambia estos números para afinar el "feeling" de la experiencia
// sin tocar el resto del código.
// ============================================================

export const CONFIG = {
  // Emojis de relleno del ramo fijo (Escena 3+4+5). Se colocan solo en
  // zonas sin flores reales — ver js/emojiSafeZones.js (calculado
  // analizando los PNG del ramo). Se concentran en la parte baja del
  // ramo (de las flores hacia abajo) para dar volumen en la base.
  EMOJI_FILLER_COUNT: 28,

  // Cuántos de esos emojis se dejan "fuera" de la zona baja (repartidos
  // más arriba, entre las flores) para que no se vea como un bloque.
  EMOJI_FILLER_OUTLIERS: 3,

  // Franja vertical (en % del lienzo: 0 = arriba, 100 = abajo) que se
  // considera "parte baja" del ramo para el relleno principal.
  EMOJI_FILLER_BOTTOM_START: 40,
  EMOJI_FILLER_BOTTOM_END: 92,

  // Rango de tamaño aleatorio (multiplicador sobre el tamaño base) para
  // dar sensación de volumen/profundidad.
  EMOJI_FILLER_SCALE_MIN: 0.7,
  EMOJI_FILLER_SCALE_MAX: 1.7,

  // Cantidad de flores especiales (clickeables) por persona: FIJA en 4
  // para todos los nombres. Se eligen entre las flores individuales
  // detectadas en el ramo fijo (ver js/flowerHotspots.js), de forma
  // determinística según el nombre (mismo nombre = mismas 4 flores).
  SPECIAL_FLOWERS_MIN: 4,
  SPECIAL_FLOWERS_MAX: 4,

  // Excepciones por nombre: cantidad FIJA de flores especiales que pisa
  // el valor de arriba. La clave es el nombre normalizado (minúsculas,
  // sin tildes). Ej: jacob tiene 5 en vez de 4.
  SPECIAL_FLOWERS_OVERRIDES: {
    jacob: 5,
  },

  // Cuántos clics en "+1 flor" (Escena 6) se necesitan antes de
  // disparar la inundación final (Escena 7).
  FLOWERS_BEFORE_EXPLOSION: 6,

  // Duración de la pausa antes de que arranque la inundación (ms).
  FLOOD_PRE_PAUSE_MS: 700,

  // Tiempo que se muestra la transición "Escena 2" antes de avanzar
  // sola a la Escena 3 (ms). El usuario también puede tocar para saltarla.
  TRANSITION_AUTO_ADVANCE_MS: 3200,

  // Duración de la "pantalla de carga" que se muestra al confirmar el
  // nombre SOLO para JACOB, antes de revelar el botón "Explorar" como
  // al resto (ms). Es más larga que una carga normal porque el texto
  // que muestra es un mensaje para leer. Ver js/app.js -> initRamo.
  JACOB_LOADING_MS: 9000,

  // Si el navegador/usuario pide "reducir movimiento", usamos versiones
  // más suaves y estáticas de las animaciones pesadas (sobre todo la
  // inundación final).
  PREFERS_REDUCED_MOTION:
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
