// ============================================================
// interactions.js
// Pequeños helpers de feedback táctil compartidos entre escenas.
// (La generación de flores del "gran final" vive en bouquet.js
// -renderSimpleCluster/revealFlowersUpTo- para reusar el mismo
// look de ramo denso en toda la experiencia.)
// ============================================================

import { CONFIG } from './config.js';

/**
 * Da feedback visual inmediato a un botón al presionarlo (además del
 * estado :active de CSS) — útil en touch, donde a veces conviene una
 * confirmación extra de que el tap sí registró.
 */
export function pulseElement(el) {
  const gsap = typeof window !== 'undefined' ? window.gsap : null;
  if (gsap && !CONFIG.PREFERS_REDUCED_MOTION) {
    gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.25, ease: 'elastic.out(1, 0.5)' });
  }
}
