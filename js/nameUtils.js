// ============================================================
// nameUtils.js
// Normalización de nombres + generador pseudoaleatorio con semilla.
//
// Reglas de identidad (ver PROYECTO §8 y §34):
//   "Ana", "ANA", "ana", "Áña" -> deben tratarse como la MISMA persona
//   para efectos de cálculo (seed, conteo de letras, flores especiales).
//   El nombre tal como el usuario lo escribió se sigue mostrando igual
//   en la interfaz; solo la versión normalizada se usa "por dentro".
// ============================================================

/**
 * Normaliza un nombre para uso interno (seed, búsqueda en data/people.js).
 * - quita espacios al inicio/fin
 * - colapsa espacios múltiples
 * - quita tildes/diacríticos (María -> maria)
 * - pasa todo a minúsculas
 */
export function normalizeName(raw) {
  if (!raw) return '';
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita marcas diacríticas (tildes, diéresis)
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Cuenta solo letras (a-z) para el cálculo de "1 letra = 2 flores".
 * Se ignoran espacios, números y símbolos. Como el input pide el
 * primer nombre, en la práctica casi nunca habrá espacios, pero
 * la función es robusta igual por si acaso.
 */
export function countLetters(normalized) {
  const matches = normalized.match(/[a-z]/g);
  return matches ? matches.length : 0;
}

/**
 * Genera una función semilla de 32 bits a partir de un string.
 * (variante de xfnv1a, determinística y rápida)
 */
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * Generador pseudoaleatorio mulberry32, sembrado con un entero.
 * Devuelve una función rng() => número en [0, 1).
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crea un generador pseudoaleatorio determinístico a partir de un nombre
 * (ya normalizado o no — esta función normaliza internamente).
 * Mismo nombre -> misma secuencia de números siempre.
 * Se puede pasar un "namespace" opcional para obtener una secuencia
 * distinta pero igual de determinística para otro propósito
 * (por ejemplo, "posiciones" vs "flores-especiales") sin que interfieran
 * entre sí.
 */
export function createRng(name, namespace = '') {
  const seedSource = normalizeName(name) + '::' + namespace;
  const seedFn = xfnv1a(seedSource);
  const seedInt = Math.floor(seedFn() * 4294967296);
  return mulberry32(seedInt);
}

/**
 * Entero aleatorio determinístico en [min, max] (ambos inclusive).
 */
export function rngInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Elige `count` elementos únicos de un array arbitrario, con un shuffle
 * parcial (Fisher-Yates) sembrado con `rng` — determinístico para el
 * mismo nombre. Útil para elegir, por ejemplo, qué flores del ramo serán
 * "especiales".
 */
export function pickUniqueFromArray(rng, array, count) {
  const pool = array.slice();
  const picked = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picked.push(pool[i]);
  }
  return picked;
}
