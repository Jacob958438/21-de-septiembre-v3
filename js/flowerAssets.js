// ============================================================
// flowerAssets.js
// Imágenes REALES de flores/ramas (provistas por el usuario), usadas
// directamente como elementos del ramo — nada de formas generadas por
// código. `BRANCH_IMAGES` son las ramas individuales que se combinan
// para armar el volumen (Escena 6+7+8), y `RAMO_BASE_IMAGE` /
// `RAMO_LAYER_IMAGES` son el ramo fijo por capas de la Escena 3+4+5.
// ============================================================

export const BRANCH_IMAGES = [
  'assets/images/flowers/rama-1-lluvia-oro.png',
  'assets/images/flowers/rama-2-botones.png',
  'assets/images/flowers/rama-3-pensamientos.png',
  'assets/images/flowers/rama-5-ciruelo.png',
  'assets/images/flowers/rama-6-tulipanes.png',
  'assets/images/flowers/rama-7-ranunculo.png',
];

// Flores genéricas tipo emoji (provistas por el usuario) — se usan como
// "relleno" mezcladas con las fotos reales, nunca solas, para dar
// variedad sin volver a las formas planas de antes.
export const EMOJI_IMAGES = [
  'assets/images/emoji-flowers/emoji-1-trompeta.png',
  'assets/images/emoji-flowers/emoji-2-margarita.png',
  'assets/images/emoji-flowers/emoji-3-boton-oro.png',
  'assets/images/emoji-flowers/emoji-4-remolino.png',
  'assets/images/emoji-flowers/emoji-5-tulipan.png',
];

// ============================================================
// Ramo FIJO por capas (nuevo sistema, reemplaza el layout algorítmico
// para la Escena 3+4+5). El usuario diseñó a mano una composición
// completa como 6 capas PNG (una flor/grupo de flores por capa) que
// se superponen EXACTAS sobre una base con tallos/envoltorio. Se
// revelan en orden: 1 letra escrita = 1 capa más, y al confirmar con
// "Listo" se completan las capas que falten.
// ============================================================
export const RAMO_BASE_IMAGE = 'assets/images/ramo-fijo/00_base_ramo.png';

export const RAMO_LAYER_IMAGES = [
  'assets/images/ramo-fijo/01_flores.png',
  'assets/images/ramo-fijo/02_flores.png',
  'assets/images/ramo-fijo/03_flores.png',
  'assets/images/ramo-fijo/04_flores.png',
  'assets/images/ramo-fijo/05_flores.png',
  'assets/images/ramo-fijo/06_flores.png',
];

/**
 * Elige, de forma determinística (usando `rng`), una imagen real o una
 * genérica según una probabilidad de "real" (0-1). `pReal` = probabilidad
 * de que salga una foto real; el resto sale de EMOJI_IMAGES.
 */
export function pickMixedImage(rng, pReal) {
  return rng() < pReal
    ? BRANCH_IMAGES[Math.floor(rng() * BRANCH_IMAGES.length)]
    : EMOJI_IMAGES[Math.floor(rng() * EMOJI_IMAGES.length)];
}
