// ============================================================
// flood.js  (v2 — acumulación, no lluvia infinita)
// Las flores caen y se QUEDAN donde caen, apilándose hasta llenar la
// pantalla. Se dibujan una sola vez sobre una capa "suelo" (offscreen
// canvas) al aterrizar, así que el costo por frame no crece sin límite
// aunque haya cientos de flores ya asentadas.
//
// Fases:
//   startTrickle()  -> goteo lento de fondo (mientras el usuario aún
//                      hace clic en "+1 flor").
//   startFilling()  -> intensifica hasta llenar la pantalla y avisa
//                      con onFull() cuando la montaña está completa.
// ============================================================

import { CONFIG } from './config.js';
import { BRANCH_IMAGES, EMOJI_IMAGES } from './flowerAssets.js';

const BUCKET_COUNT = 48;
// Mezcla de la lluvia: por ahora, 1 foto real por cada 4 genéricas.
const REAL_PROBABILITY = 0.2;

function loadImages(urls) {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        })
    )
  );
}

export function createFloodController(canvas, seedName) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let ground = document.createElement('canvas');
  let groundCtx = ground.getContext('2d');
  let heightmap = new Array(BUCKET_COUNT).fill(0);
  let realSprites = [];
  let emojiSprites = [];
  let active = [];
  let spawnRatePerSec = 0; // partículas nuevas por segundo (0 = pausado)
  let running = false;
  let onFullCallback = null;
  let fullNotified = false;
  let lastTs = null;
  let spawnAccumulator = 0;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ground.width = w * dpr;
    ground.height = h * dpr;
    groundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    heightmap = new Array(BUCKET_COUNT).fill(0);
    active = [];
    fullNotified = false;
  }
  window.addEventListener('resize', resize);
  resize();

  const w = () => canvas.clientWidth;
  const h = () => canvas.clientHeight;
  const bucketWidth = () => w() / BUCKET_COUNT;

  function spawnParticle() {
    const pool = Math.random() < REAL_PROBABILITY ? realSprites : emojiSprites;
    if (!pool.length) return;
    const size = 46 + Math.random() * 40;
    const bucket = Math.floor(Math.random() * BUCKET_COUNT);
    const x = bucket * bucketWidth() + bucketWidth() / 2;
    active.push({
      x,
      y: -size,
      size,
      bucket,
      vy: 140 + Math.random() * 90,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 2,
      sway: Math.random() * Math.PI * 2,
      img: pool[Math.floor(Math.random() * pool.length)],
    });
  }

  function landParticle(p) {
    groundCtx.save();
    groundCtx.translate(p.x, h() - heightmap[p.bucket] - p.size * 0.4);
    groundCtx.rotate(p.rot);
    if (p.img) groundCtx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
    groundCtx.restore();
    heightmap[p.bucket] += p.size * 0.62;
  }

  function averageFillRatio() {
    const avg = heightmap.reduce((a, b) => a + b, 0) / heightmap.length;
    return avg / h();
  }

  function frame(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (spawnRatePerSec > 0) {
      spawnAccumulator += dt * spawnRatePerSec;
      while (spawnAccumulator >= 1) {
        spawnParticle();
        spawnAccumulator -= 1;
      }
    }

    ctx.clearRect(0, 0, w(), h());
    ctx.drawImage(ground, 0, 0, w(), h());

    active = active.filter((p) => {
      p.y += p.vy * dt;
      p.sway += dt * 1.4;
      p.x += Math.sin(p.sway) * 8 * dt;
      p.rot += p.vrot * dt;

      const groundY = h() - heightmap[p.bucket];
      if (p.y >= groundY - p.size * 0.1) {
        landParticle(p);
        return false; // se queda ya pintada en `ground`, sale de la lista activa
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.img) ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      return true;
    });

    if (!fullNotified && averageFillRatio() >= 0.9) {
      fullNotified = true;
      if (onFullCallback) onFullCallback();
    }

    requestAnimationFrame(frame);
  }

  async function ensureSprites() {
    if (!realSprites.length) {
      realSprites = await loadImages(BRANCH_IMAGES);
    }
    if (!emojiSprites.length) {
      emojiSprites = await loadImages(EMOJI_IMAGES);
    }
  }

  return {
    /** Goteo lento de fondo — se usa mientras el usuario aún hace clic. */
    async startTrickle() {
      await ensureSprites();
      spawnRatePerSec = CONFIG.PREFERS_REDUCED_MOTION ? 0 : 0.8;
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    },

    /** Intensifica hasta llenar la pantalla. Llama onFull() al completarse. */
    async startFilling(onFull) {
      await ensureSprites();
      onFullCallback = onFull;
      if (CONFIG.PREFERS_REDUCED_MOTION) {
        // Versión estática: pinta de una vez un piso lleno de flores.
        for (let i = 0; i < BUCKET_COUNT * 3; i++) spawnParticle();
        active.forEach(landParticle);
        active = [];
        onFull && onFull();
        return;
      }
      spawnRatePerSec = 100;
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    },

    destroy() {
      running = false;
      window.removeEventListener('resize', resize);
    },
  };
}
