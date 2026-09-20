// ============================================================
// app.js  (v2)
// Orquestador de la experiencia.
//
// CAMBIOS CLAVE respecto a v1 (ver CAMBIOS-PENDIENTES.md):
// 1) El ramo YA NO se genera en vivo mientras se escribe. Se genera
//    solo al confirmar, y solo si el nombre está en data/people.js.
//    Un nombre no reconocido nunca ve flores, ni siquiera el placeholder
//    genérico — se le muestra un rechazo claro.
// 2) Las Escenas 6+7+8 son ahora UNA sola sección con capas: el ramo
//    de clics, un canvas de fondo que gotea desde el inicio y luego se
//    convierte en una montaña de flores que se queda en pantalla
//    (no desaparece), y el mensaje final que aparece encima de esa
//    montaña sin cambiar de pantalla.
// ============================================================

import { CONFIG } from './config.js';
import { normalizeName } from './nameUtils.js';
import {
  computeNameLayerCount,
  TOTAL_LAYERS,
  getAllHotspotIndices,
  renderRamoBase,
  addRamoHotspots,
  revealLayersUpTo,
  renderSimpleCluster,
  revealFlowersUpTo,
} from './bouquet.js';
import { selectSpecialIndices, getSpecialFlowerContent, openFlowerModal } from './specialFlowers.js';
import { pulseElement } from './interactions.js';
import { createFloodController } from './flood.js';
import { isKnownPerson } from '../data/people.js';
import { registerJacobView, getJacobViews } from './visitCounter.js';

// ------------------------------------------------------------
// Estado global de la sesión (en memoria, no persiste — ver README).
// ------------------------------------------------------------
const state = {
  rawName: '',
  specialIndicesSorted: [],
  discovered: new Set(),
  generatedCount: 0,
  finaleRefs: [],
  floodController: null,
};

// ------------------------------------------------------------
// Audio de fondo: debe iniciar en la Escena 3, en bucle. Los
// navegadores solo permiten play() dentro de un gesto real del
// usuario, así que lo intentamos en CADA clic temprano de la
// experiencia (museo, salto de transición). Una vez suena, seguir
// sonando no requiere más gestos.
// ------------------------------------------------------------
const bgAudio = document.querySelector('.bg-audio');
let audioStarted = false;
// Empieza a descargar el audio desde ya (sin sonar), para que cuando el
// primer clic real lo desbloquee, arranque casi sin esperar el buffer.
if (bgAudio) bgAudio.load();

function tryStartAudio() {
  if (audioStarted || !bgAudio) return;
  bgAudio.volume = 0.55;
  bgAudio
    .play()
    .then(() => {
      audioStarted = true;
    })
    .catch(() => {
      // Falla silenciosa: normalmente porque falta el archivo real
      // todavía (ver assets/audio/flores-amarillas.mp3) o el navegador
      // bloqueó el autoplay. Se reintentará en el próximo gesto.
    });
}

// ------------------------------------------------------------
// Scene manager genérico
// ------------------------------------------------------------
const scenes = Array.from(document.querySelectorAll('[data-scene]'));
let currentScene = null;
let transitionTimer = null;

function getScene(id) {
  return scenes.find((s) => s.dataset.scene === id);
}

function goTo(id) {
  const next = getScene(id);
  if (!next || next === currentScene) return;

  const prev = currentScene;
  const gsap = window.gsap;

  if (prev) {
    if (gsap && !CONFIG.PREFERS_REDUCED_MOTION) {
      gsap.to(prev, {
        opacity: 0,
        duration: 0.45,
        onComplete: () => {
          prev.hidden = true;
          prev.classList.remove('scene--active');
        },
      });
    } else {
      prev.hidden = true;
      prev.classList.remove('scene--active');
    }
  }

  next.hidden = false;
  next.classList.add('scene--active');
  if (gsap && !CONFIG.PREFERS_REDUCED_MOTION) {
    gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: prev ? 0.15 : 0 });
  } else {
    next.style.opacity = '1';
  }

  currentScene = next;
  document.dispatchEvent(new CustomEvent('scene:enter', { detail: { id } }));
}

// ------------------------------------------------------------
// ESCENA 1 — Museo
// ------------------------------------------------------------
function initMuseum() {
  const scene = getScene('museum');
  const sticker = scene.querySelector('.museum__sticker');
  const btn = scene.querySelector('.museum__continue');

  document.addEventListener('scene:enter', (e) => {
    if (e.detail.id !== 'museum') return;
    const gsap = window.gsap;
    if (gsap && !CONFIG.PREFERS_REDUCED_MOTION) {
      gsap.fromTo(
        sticker,
        { scale: 0.02, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2.6, ease: 'power2.out' }
      );
    } else {
      sticker.style.transform = 'scale(1)';
      sticker.style.opacity = '1';
    }
  });

  btn.addEventListener('click', () => {
    tryStartAudio(); // primer gesto real posible
    goTo('transition');
  });
}

// ------------------------------------------------------------
// ESCENA 2 — Transición a 2026
// ------------------------------------------------------------
function initTransition() {
  const scene = getScene('transition');

  document.addEventListener('scene:enter', (e) => {
    if (e.detail.id !== 'transition') return;
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => goTo('ramo'), CONFIG.TRANSITION_AUTO_ADVANCE_MS);
  });

  // Tocar en cualquier parte de la escena la salta (y es, además, un
  // gesto real válido para desbloquear el audio si el clic anterior
  // no bastó en este navegador).
  scene.addEventListener('click', () => {
    tryStartAudio();
    clearTimeout(transitionTimer);
    goTo('ramo');
  });
}

// ------------------------------------------------------------
// ESCENAS 3+4+5 — Nombre, construcción y exploración del ramo
// ------------------------------------------------------------
function initRamo() {
  const scene = getScene('ramo');
  const intro = scene.querySelector('.ramo__intro');
  const input = scene.querySelector('.ramo__input');
  const listoBtn = scene.querySelector('.ramo__listo');
  const explorarBtn = scene.querySelector('.ramo__explorar');
  const continuarBtn = scene.querySelector('.ramo__continuar');
  const container = scene.querySelector('.ramo__container');
  const hint = scene.querySelector('.ramo__hint');
  const rejection = scene.querySelector('.ramo__rejection');
  const retryBtn = scene.querySelector('.ramo__retry');
  const loading = scene.querySelector('.ramo__loading');
  const modalRoot = document.querySelector('.modal-root');

  // Refs del ramo actual (no van en `state` porque son propias de esta
  // escena y se reconstruyen cada vez que se escribe un nombre nuevo).
  let layerRefs = [];
  let hotspotRefs = [];

  document.addEventListener('scene:enter', (e) => {
    if (e.detail.id !== 'ramo') return;
    tryStartAudio(); // último intento de arranque antes de que el nombre lo requiera
  });

  // Red de seguridad: CUALQUIER toque dentro de la Escena 3 (incluso
  // solo tocar el campo de texto, antes de escribir nada) también
  // intenta iniciar el audio. tryStartAudio() ya se protege a sí mismo
  // (no vuelve a sonar dos veces), así que esto es gratis si ya sonaba.
  scene.addEventListener('click', tryStartAudio);
  scene.addEventListener('focusin', tryStartAudio);

  function resetToInput() {
    rejection.hidden = true;
    intro.hidden = false;
    input.disabled = false;
    input.value = '';
    input.focus();
    container.innerHTML = '';
    layerRefs = [];
    hotspotRefs = [];
    listoBtn.hidden = true;
    explorarBtn.hidden = true;
    continuarBtn.hidden = true;
    hint.hidden = true;
    loading.hidden = true;
    loading.classList.remove('ramo__loading--visible');
  }

  input.addEventListener('input', () => {
    const rawName = input.value;
    const hasContent = !!normalizeName(rawName);
    listoBtn.hidden = !hasContent;

    if (!hasContent) {
      container.innerHTML = '';
      layerRefs = [];
      return;
    }

    // Vista previa EN VIVO mientras escribe (1 letra = 1 capa más, hasta
    // el máximo de TOTAL_LAYERS). Es solo el ramo fijo + emojis de
    // relleno — todavía sin hotspots clickeables (eso llega con "Listo").
    if (layerRefs.length === 0) {
      layerRefs = renderRamoBase(container, rawName);
    }
    revealLayersUpTo(layerRefs, computeNameLayerCount(rawName));
  });

  listoBtn.addEventListener('click', () => {
    const rawName = input.value;
    const key = normalizeName(rawName);
    if (!key) return;

    if (!isKnownPerson(key)) {
      // Un nombre no reconocido NUNCA continúa ni deja ver ramo alguno.
      container.innerHTML = '';
      layerRefs = [];
      intro.hidden = true;
      listoBtn.hidden = true;
      rejection.hidden = false;
      return;
    }

    state.rawName = rawName;
    state.specialIndicesSorted = Array.from(
      selectSpecialIndices(rawName, getAllHotspotIndices())
    ).sort((a, b) => a - b);

    input.disabled = true;
    listoBtn.hidden = true;

    // Se agregan los hotspots clickeables (recién ahora que el nombre
    // está confirmado) y se completan las capas que falten + la base
    // (la base -tallos/envoltorio- estaba oculta hasta este momento).
    hotspotRefs = addRamoHotspots(container, new Set(state.specialIndicesSorted));
    const baseEl = container.querySelector('.ramo__base');
    if (baseEl) baseEl.classList.add('ramo__base--visible');
    revealLayersUpTo(layerRefs, TOTAL_LAYERS);

    const revealExplorar = () => {
      explorarBtn.hidden = false;
    };

    if (key === 'jacob') {
      // Para JACOB: en vez de pasar directo a "Explorar", mostramos una
      // pantalla de carga con un mensaje (se puede tocar para seguir
      // antes de que termine el tiempo) y, al cerrarla, seguimos como
      // todos los demás. Además sumamos 1 al contador local de personas
      // que escribieron su nombre (ver visitCounter.js).
      registerJacobView();
      loading.hidden = false;
      requestAnimationFrame(() => loading.classList.add('ramo__loading--visible'));

      let loadingDone = false;
      const finishLoading = () => {
        if (loadingDone) return;
        loadingDone = true;
        clearTimeout(loadingTimer);
        loading.classList.remove('ramo__loading--visible');
        loading.hidden = true;
        revealExplorar();
      };
      const loadingTimer = setTimeout(finishLoading, CONFIG.JACOB_LOADING_MS);
      loading.addEventListener('click', finishLoading, { once: true });
    } else {
      setTimeout(revealExplorar, 1200);
    }
  });

  retryBtn.addEventListener('click', resetToInput);

  explorarBtn.addEventListener('click', () => {
    explorarBtn.hidden = true;
    hint.hidden = false;
    continuarBtn.hidden = false;
    enableHotspotClicks();
  });

  function enableHotspotClicks() {
    hotspotRefs.forEach(({ el, index }) => {
      el.addEventListener('click', () => onSpecialFlowerClick(index, el));
    });
  }

  function onSpecialFlowerClick(index, el) {
    const orderIndex = state.specialIndicesSorted.indexOf(index);
    const content = getSpecialFlowerContent(state.rawName, orderIndex);
    openFlowerModal(modalRoot, content, () => {
      state.discovered.add(index);
      el.classList.add('ramo__hotspot--discovered');
    });
  }

  continuarBtn.addEventListener('click', () => goTo('finale'));
}

// ------------------------------------------------------------
// ESCENAS 6+7+8 FUSIONADAS — "el gran final"
// ------------------------------------------------------------
function initFinale() {
  const scene = getScene('finale');
  const btn = scene.querySelector('.finale__button');
  const bouquetEl = scene.querySelector('.finale__bouquet');
  const counter = scene.querySelector('.finale__counter');
  const canvas = scene.querySelector('.finale__canvas');
  const message = scene.querySelector('.finale__message');
  const visitas = scene.querySelector('.finale__visitas');

  function updateVisitas() {
    if (!visitas) return;
    visitas.textContent = 'Vistas: ' + getJacobViews();
  }

  if (visitas) {
    visitas.addEventListener('click', updateVisitas);
  }

  document.addEventListener('scene:enter', (e) => {
    if (e.detail.id !== 'finale') return;

    state.generatedCount = 0;
    btn.disabled = false;
    message.hidden = true;
    message.classList.remove('finale__message--visible');
    updateCounter();
    updateVisitas();

    const seed = state.rawName || 'invitado';
    state.finaleRefs = renderSimpleCluster(bouquetEl, seed, CONFIG.FLOWERS_BEFORE_EXPLOSION);

    if (state.floodController) state.floodController.destroy();
    state.floodController = createFloodController(canvas, seed);
    // El goteo de fondo arranca YA, mientras el usuario todavía está
    // dando clic en "+1 flor" — es el anticipo de la inundación.
    state.floodController.startTrickle();
  });

  function updateCounter() {
    counter.textContent = `${state.generatedCount} / ${CONFIG.FLOWERS_BEFORE_EXPLOSION}`;
  }

  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    state.generatedCount++;
    revealFlowersUpTo(state.finaleRefs, state.generatedCount);
    pulseElement(btn);
    updateCounter();

    if (state.generatedCount >= CONFIG.FLOWERS_BEFORE_EXPLOSION) {
      btn.disabled = true;
      setTimeout(() => {
        // El ramo de 6 clics se queda visible de fondo mientras la
        // inundación se intensifica y llena la pantalla por completo.
        state.floodController.startFilling(() => {
          message.hidden = false;
          requestAnimationFrame(() => message.classList.add('finale__message--visible'));
        });
      }, CONFIG.FLOOD_PRE_PAUSE_MS);
    }
  });
}

// ------------------------------------------------------------
// Arranque
// ------------------------------------------------------------
function init() {
  initMuseum();
  initTransition();
  initRamo();
  initFinale();

  scenes.forEach((s) => {
    s.hidden = true;
    s.style.opacity = '0';
  });
  const first = getScene('museum');
  first.hidden = false;
  first.style.opacity = '1';
  first.classList.add('scene--active');
  currentScene = first;
  document.dispatchEvent(new CustomEvent('scene:enter', { detail: { id: 'museum' } }));
}

document.addEventListener('DOMContentLoaded', init);
