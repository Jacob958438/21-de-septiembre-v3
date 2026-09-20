// ============================================================
// bouquet.js  (v3 — ramo FIJO por capas)
// El ramo de la Escena 3+4+5 ya NO se genera con un algoritmo de
// posiciones: el usuario diseñó a mano una composición completa como
// una base (tallos/envoltorio) + 6 capas PNG (una flor o grupo de
// flores cada una), todas del mismo tamaño exacto de lienzo, pensadas
// para superponerse EXACTAS unas sobre otras.
//
// Mecánica: 1 letra escrita = 1 capa más revelada (hasta 6). Al
// confirmar con "Listo" se completan las capas que falten. Encima se
// agregan algunos emojis de relleno (en zonas donde NINGUNA capa de
// flores tiene contenido — ver emojiSafeZones.js, calculado analizando
// los PNG reales) y "hotspots" invisibles clickeables sobre las flores
// individuales detectadas dentro de las capas (ver flowerHotspots.js).
//
// La Escena 6+7+8 (ramo de clics + lluvia) sigue usando el sistema
// algorítmico anterior — no se tocó, ver renderSimpleCluster más abajo.
// ============================================================

import { CONFIG } from './config.js';
import { createRng, countLetters, normalizeName, pickUniqueFromArray } from './nameUtils.js';
import { RAMO_BASE_IMAGE, RAMO_LAYER_IMAGES, EMOJI_IMAGES, pickMixedImage } from './flowerAssets.js';
import { FLOWER_HOTSPOTS } from './flowerHotspots.js';
import { EMOJI_SAFE_POINTS } from './emojiSafeZones.js';

export const TOTAL_LAYERS = RAMO_LAYER_IMAGES.length;

/** Todos los índices de flores individuales detectadas (0..17). */
export function getAllHotspotIndices() {
  return FLOWER_HOTSPOTS.map((_, i) => i);
}

/**
 * Cuántas capas corresponden al nombre mientras se escribe: 1 letra =
 * 1 capa, con tope en TOTAL_LAYERS (no hay más capas que esas).
 */
export function computeNameLayerCount(rawName) {
  const letters = countLetters(normalizeName(rawName));
  return Math.min(letters, TOTAL_LAYERS);
}

/**
 * Construye el ramo BASE dentro de `container`: la imagen de fondo
 * (tallos/envoltorio) + las 6 capas de flores (ocultas, se revelan con
 * revealLayersUpTo) + emojis de relleno en zonas seguras. NO incluye
 * los hotspots clickeables todavía (eso es addRamoHotspots, se llama
 * aparte una vez se confirma el nombre — ver app.js).
 *
 * Devuelve `layerRefs` (array de 6 <img>, en orden) para poder
 * revelarlas progresivamente.
 */
export function renderRamoBase(container, rawName) {
  container.innerHTML = '';

  const base = document.createElement('img');
  base.className = 'ramo__base';
  base.src = RAMO_BASE_IMAGE;
  base.alt = '';
  base.setAttribute('aria-hidden', 'true');
  container.appendChild(base);

  const layerRefs = RAMO_LAYER_IMAGES.map((src) => {
    const img = document.createElement('img');
    img.className = 'ramo__layer';
    img.src = src;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    container.appendChild(img);
    return img;
  });

  // Emojis de relleno: SOLO en puntos donde ninguna capa de flores
  // tiene contenido (calculado de antemano analizando los PNG reales),
  // así nunca se sobreponen a una flor — tapar tallo/envoltorio no
  // importa, eso vive en `base`, no en las capas de flores.
  const emojiRng = createRng(rawName, 'emoji-filler');

  // La mayoría se concentra en la parte baja del ramo (de las flores hacia
  // abajo) y unos pocos "outliers" se reparten más arriba para que no se
  // vea como un bloque recortado. Franjas y cantidades en config.js.
  const bottomIdx = [];
  const upperIdx = [];
  EMOJI_SAFE_POINTS.forEach(([, top], i) => {
    if (top >= CONFIG.EMOJI_FILLER_BOTTOM_START && top <= CONFIG.EMOJI_FILLER_BOTTOM_END) {
      bottomIdx.push(i);
    } else if (top < CONFIG.EMOJI_FILLER_BOTTOM_START) {
      // Solo lo que está por encima de la franja cuenta como "outlier".
      upperIdx.push(i);
    }
  });

  const outliers = pickUniqueFromArray(
    emojiRng,
    upperIdx,
    Math.min(CONFIG.EMOJI_FILLER_OUTLIERS, upperIdx.length)
  );
  const mainCount = Math.max(0, CONFIG.EMOJI_FILLER_COUNT - outliers.length);
  const mainIdx = pickUniqueFromArray(emojiRng, bottomIdx, Math.min(mainCount, bottomIdx.length));

  mainIdx.concat(outliers).forEach((idx) => {
    const [left, top] = EMOJI_SAFE_POINTS[idx];
    const el = document.createElement('div');
    el.className = 'ramo__emoji';
    el.style.left = left + '%';
    el.style.top = top + '%';
    el.setAttribute('aria-hidden', 'true');
    // Tamaño aleatorio (determinístico por nombre) para dar volumen.
    const scale =
      CONFIG.EMOJI_FILLER_SCALE_MIN +
      emojiRng() * (CONFIG.EMOJI_FILLER_SCALE_MAX - CONFIG.EMOJI_FILLER_SCALE_MIN);
    el.style.setProperty('--emoji-scale', scale.toFixed(3));
    const img = document.createElement('img');
    img.src = EMOJI_IMAGES[Math.floor(emojiRng() * EMOJI_IMAGES.length)];
    img.alt = '';
    el.appendChild(img);
    container.appendChild(el);
  });

  return layerRefs;
}

/**
 * Agrega los "hotspots" clickeables (invisibles) sobre las flores
 * individuales elegidas como especiales. Se llama recién al confirmar
 * el nombre — antes de eso no existe el concepto de "especial".
 */
export function addRamoHotspots(container, specialIndices) {
  const hotspotRefs = [];
  FLOWER_HOTSPOTS.forEach((spot, i) => {
    if (!specialIndices.has(i)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ramo__hotspot';
    btn.style.left = spot.left - spot.w / 2 + '%';
    btn.style.top = spot.top - spot.h / 2 + '%';
    btn.style.width = spot.w + '%';
    btn.style.height = spot.h + '%';
    btn.setAttribute('aria-label', 'Flor especial, toca para descubrir');
    container.appendChild(btn);
    hotspotRefs.push({ el: btn, index: i });
  });
  return hotspotRefs;
}

/** Revela las capas 0..count-1 (fade-in vía CSS, ver bouquet.css). */
export function revealLayersUpTo(layerRefs, count) {
  layerRefs.forEach((img, i) => {
    if (i < count) img.classList.add('ramo__layer--visible');
  });
}

/**
 * Layout tipo "montón desordenado" (para el ramo de 6 clics): las
 * flores se reparten alrededor del centro con una espiral de ángulo
 * áureo y radios variables — quedan todas en el medio (nada de filas ni
 * anillos perfectos) pero en puntos distintos, superponiéndose solo en
 * parte, no apiladas en el mismo sitio.
 */
function generateScatterClusterLayout(rng, count) {
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const positions = [];
  for (let i = 0; i < count; i++) {
    // Ángulo áureo reparte sin repetir eje; jitter para que se vea orgánico.
    const angle = i * GOLDEN_ANGLE + (rng() - 0.5) * 0.7;
    // El radio crece con el índice: las primeras al centro, las
    // siguientes abren el ramo. Con una sola flor, queda centrada.
    const radius = count <= 1 ? 0 : 7 + Math.sqrt(i + 0.5) * 7 + rng() * 5;
    const left = 50 + Math.cos(angle) * radius;
    const top = 50 + Math.sin(angle) * radius * 0.9;

    positions.push({
      left: Math.min(90, Math.max(10, left)),
      top: Math.min(92, Math.max(8, top)),
      rotation: (rng() - 0.5) * 50,
      scale: 0.85 + rng() * 0.35,
      z: 10 + Math.round(rng() * 20),
    });
  }
  return positions;
}

/**
 * Versión con IMÁGENES REALES (igual que renderBouquet) para el ramo
 * que se arma a punta de clics en la Escena 6+7+8 fusionada. Sin
 * flores especiales ni interacción — solo visual.
 */
export function renderSimpleCluster(container, seedName, count) {
  const rng = createRng(seedName, 'finale-layout');
  const layout = generateScatterClusterLayout(rng, count);
  const pickRng = createRng(seedName, 'finale-branch-pick');

  container.innerHTML = '';
  const refs = [];

  layout.forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'flower';
    el.style.left = pos.left + '%';
    el.style.top = pos.top + '%';
    const flip = pickRng() > 0.5 ? -1 : 1;
    el.style.setProperty('--rot', pos.rotation + 'deg');
    el.style.setProperty('--scale', pos.scale.toFixed(3));
    el.style.setProperty('--flip', String(flip));
    el.style.zIndex = pos.z;

    const img = document.createElement('img');
    // Mezcla del ramo de clics: ~1 foto real por cada 3 genéricas
    // (más emoji que en la Escena 3, a propósito — ver nota del usuario).
    img.src = pickMixedImage(pickRng, 1 / 4);
    img.alt = '';
    el.appendChild(img);

    container.appendChild(el);
    refs.push({ el, index: i });
  });

  return refs;
}

export function revealFlowersUpTo(refs, upToCount) {
  // Nota: la transición se hace con CSS (transform+opacity), no GSAP,
  // para evitar que GSAP pise el transform que ya viene de --rot/--scale.
  refs.forEach(({ el, index }) => {
    if (index < upToCount && !el.classList.contains('flower--visible')) {
      el.style.transitionDelay = (index % 8) * 0.035 + 's';
      el.classList.add('flower--visible');
    }
  });
}
