// ============================================================
// specialFlowers.js
// Elige qué flores son "especiales" (determinístico por nombre),
// las asocia al contenido de data/people.js, y maneja la apertura/
// cierre del modal + el estado de "descubierta" durante la sesión.
// ============================================================

import { CONFIG } from './config.js';
import { createRng, rngInt, pickUniqueFromArray, normalizeName } from './nameUtils.js';
import { getPersonContent } from '../data/people.js';

/**
 * Decide cuántas flores especiales le tocan a este nombre (4 por
 * defecto — ver CONFIG.SPECIAL_FLOWERS_MIN/MAX — salvo excepciones
 * por nombre en CONFIG.SPECIAL_FLOWERS_OVERRIDES, ej. jacob: 5) y
 * cuáles de los hotspots clickeables del ramo son (ver bouquet.js ->
 * getAllHotspotIndices). Mismo nombre -> mismo resultado siempre.
 */
export function selectSpecialIndices(rawName, hotspotIndices) {
  const key = normalizeName(rawName);
  const override = CONFIG.SPECIAL_FLOWERS_OVERRIDES[key];
  const count =
    override != null
      ? override
      : rngInt(createRng(rawName, 'special-count'), CONFIG.SPECIAL_FLOWERS_MIN, CONFIG.SPECIAL_FLOWERS_MAX);

  const posRng = createRng(rawName, 'special-positions');
  const indices = pickUniqueFromArray(posRng, hotspotIndices, count);
  return new Set(indices);
}

/**
 * Construye el contenido a mostrar para la N-ésima flor especial
 * (0-indexed, en el orden en que aparecen dentro del ramo) de una
 * persona dada. Si no hay contenido definido en data/people.js para
 * ese nombre/posición, devuelve un placeholder claro para que el
 * responsable de contenido sepa exactamente qué falta por llenar.
 */
export function getSpecialFlowerContent(rawName, specialOrderIndex) {
  const key = normalizeName(rawName);
  const content = getPersonContent(key, specialOrderIndex);
  if (content) return content;

  return {
    tipo: 'texto',
    contenido: `#CONTENIDO FLOR ESPECIAL ${specialOrderIndex + 1} — sin definir para "${rawName}"`,
  };
}

/**
 * Abre el modal de una flor especial y renderiza el contenido según tipo.
 * `onClose` se llama cuando el usuario cierra el modal (para que quien
 * llame pueda, por ejemplo, marcarla como descubierta).
 */
export function openFlowerModal(modalRoot, content, onClose) {
  modalRoot.innerHTML = '';
  modalRoot.classList.add('modal--open');
  modalRoot.setAttribute('aria-hidden', 'false');

  const card = document.createElement('div');
  card.className = 'modal__card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal__close';
  closeBtn.setAttribute('aria-label', 'Cerrar y volver al ramo');
  closeBtn.textContent = '×';

  const body = document.createElement('div');
  body.className = 'modal__body';

  switch (content.tipo) {
    case 'img': {
      const img = document.createElement('img');
      img.src = content.contenido || 'assets/images/placeholder.svg';
      img.alt = content.alt || 'Imagen asociada a una de las flores especiales.';
      body.appendChild(img);
      break;
    }
    case 'audio': {
      const label = document.createElement('p');
      label.className = 'modal__hint';
      label.textContent = 'Escucha esto.';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = content.contenido || '';
      // Nunca autoplay: el usuario debe presionar play (política de
      // autoplay del navegador + buena práctica de accesibilidad).
      body.appendChild(label);
      body.appendChild(audio);
      break;
    }
    case 'video': {
      const video = document.createElement('video');
      video.controls = true;
      video.src = content.contenido || '';
      body.appendChild(video);
      break;
    }
    case 'texto':
    default: {
      const p = document.createElement('p');
      p.className = 'modal__text';
      // textContent, nunca innerHTML con datos externos/placeholder crudo.
      p.textContent = content.contenido;
      body.appendChild(p);
      break;
    }
  }

  card.appendChild(closeBtn);
  card.appendChild(body);
  modalRoot.appendChild(card);

  const close = () => {
    modalRoot.classList.remove('modal--open');
    modalRoot.setAttribute('aria-hidden', 'true');
    modalRoot.innerHTML = '';
    if (onClose) onClose();
  };

  closeBtn.addEventListener('click', close);
  modalRoot.addEventListener(
    'click',
    (e) => {
      if (e.target === modalRoot) close();
    },
    { once: true }
  );

  // Escape para cerrar (accesibilidad de teclado).
  const onKey = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  closeBtn.focus();
}
