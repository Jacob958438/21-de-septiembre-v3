// ============================================================
// visitCounter.js
// Contador local (sin backend) de cuántas personas han escrito
// "jacob". Persiste en localStorage, así que cuenta por DISPOSITIVO:
// se mantiene entre recargas, pero no se comparte entre teléfonos
// distintos. Para un total global haría falta una base de datos /
// servicio externo.
// ============================================================

const STORAGE_KEY = 'flores-amarillas:jacob-views';

function safeGet() {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const value = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Devuelve cuántas veces se ha escrito "jacob" en este dispositivo. */
export function getJacobViews() {
  return safeGet();
}

/**
 * Suma 1 al contador (se llama cuando alguien confirma el nombre
 * "jacob") y devuelve el nuevo total. Si el almacenamiento no está
 * disponible (modo privado, file://), falla en silencio y devuelve lo
 * que haya podido leer.
 */
export function registerJacobView() {
  const next = safeGet() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Sin persistencia disponible: el contador no sobrevive recargas.
  }
  return next;
}
