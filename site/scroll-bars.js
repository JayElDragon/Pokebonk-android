/* Barras de desplazamiento visibles (port Android de JayElDragon).
   Android dibuja las barras como superpuestas: solo aparecen un instante al desplazarse y no se pueden estilizar.
   Este script pone una barra fina y siempre visible a la derecha de cada zona desplazable de los menús; el
   pulgar se arrastra con el dedo y sigue al contenido cuando se desplaza con el mando o con el dedo. */
(() => {
  const bars = new Map(); // elemento desplazable -> {track, thumb}
  const MIN_THUMB = 26, W = 7;
  const root = document.createElement('div');
  root.id = 'pb-scrollbars';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
  const css = document.createElement('style');
  css.textContent =
    '#pb-scrollbars .pb-sb{position:fixed;width:' + W + 'px;border-radius:' + W + 'px;background:#2a1f4d33;box-shadow:inset 0 0 0 1px #2a1f4d40;pointer-events:auto;touch-action:none}' +
    '#pb-scrollbars .pb-sb i{position:absolute;left:0;right:0;border-radius:' + W + 'px;background:#7a52e0;box-shadow:0 0 0 1.5px #fff,0 1px 3px #0006}' +
    '#pb-scrollbars .pb-sb.drag i{background:#ffd84a}';

  const scrollable = (el) => {
    if (el.scrollHeight <= el.clientHeight + 8) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 60) return false;
    const oy = getComputedStyle(el).overflowY;
    return oy === 'auto' || oy === 'scroll';
  };
  // La barra solo se ve si la zona está realmente a la vista (no tapada por otro menú).
  const onTop = (el, r) => {
    const x = Math.min(innerWidth - 1, Math.max(0, r.right - W - 4)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.closest('#pb-scrollbars'));
  };

  function make(el) {
    const track = document.createElement('div'), thumb = document.createElement('i');
    track.className = 'pb-sb';
    track.append(thumb);
    root.append(track);
    let drag = null;
    track.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = thumb.getBoundingClientRect();
      if (e.clientY < t.top || e.clientY > t.bottom) { // toque fuera del pulgar: salta a esa altura
        const tr = track.getBoundingClientRect(), k = (e.clientY - tr.top - t.height / 2) / Math.max(1, tr.height - t.height);
        el.scrollTop = Math.max(0, Math.min(1, k)) * (el.scrollHeight - el.clientHeight);
      }
      drag = { id: e.pointerId, y: e.clientY, top: el.scrollTop };
      track.classList.add('drag');
      try { track.setPointerCapture(e.pointerId); } catch {}
    });
    track.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const tr = track.getBoundingClientRect(), th = thumb.getBoundingClientRect().height;
      const ratio = (el.scrollHeight - el.clientHeight) / Math.max(1, tr.height - th);
      el.scrollTop = drag.top + (e.clientY - drag.y) * ratio;
    });
    const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; track.classList.remove('drag'); } };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => e.stopPropagation());
    const bar = { track, thumb };
    el.addEventListener('scroll', () => place(el, bar), { passive: true });
    return bar;
  }

  function place(el, bar) {
    const r = el.getBoundingClientRect();
    if (!el.isConnected || !scrollable(el) || r.bottom < 0 || r.top > innerHeight || !onTop(el, r)) { bar.track.style.display = 'none'; return; }
    const top = Math.max(0, r.top) + 4, bottom = Math.min(innerHeight, r.bottom) - 4, h = bottom - top;
    if (h < 40) { bar.track.style.display = 'none'; return; }
    bar.track.style.display = '';
    bar.track.style.left = (Math.min(innerWidth, r.right) - W - 3) + 'px';
    bar.track.style.top = top + 'px';
    bar.track.style.height = h + 'px';
    const th = Math.max(MIN_THUMB, h * el.clientHeight / el.scrollHeight);
    const k = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    bar.thumb.style.height = th + 'px';
    bar.thumb.style.top = (Math.max(0, Math.min(1, k)) * (h - th)) + 'px';
  }

  function scan() {
    if (!root.isConnected && document.body) { document.head.append(css); document.body.append(root); }
    const ui = document.getElementById('ui') || document.body;
    for (const el of ui.querySelectorAll('div, section, main, ul, ol, aside, nav, article, form')) {
      if (!bars.has(el) && scrollable(el)) bars.set(el, make(el));
    }
    for (const [el, bar] of bars) {
      if (!el.isConnected) { bar.track.remove(); bars.delete(el); continue; }
      place(el, bar);
    }
  }
  // Paneles emergentes (subida de nivel, tiendas, premios...): si no caben por poco, se reducen lo justo para verse
  // enteros sin desplazarse (mínimo 62 %). Las listas que de verdad son largas (más de un 60 % de sobra) no se tocan.
  const fitModals = () => {
    for (const m of document.querySelectorAll('.modal')) {
      if (!m.offsetParent) continue;
      let z = parseFloat(m.style.zoom) || 1;
      const ratios = [m.scrollHeight / Math.max(1, m.clientHeight)];
      for (const c of m.querySelectorAll('.cards')) if (c.offsetParent) ratios.push(c.scrollWidth / Math.max(1, c.clientWidth));
      const over = Math.max(...ratios);
      if (over > 1.01 && over < 1.6 && z > 0.62) z = Math.max(0.62, z / over - 0.005);
      else if (z < 1 && over < 0.93) z = Math.min(1, z * Math.min(1.08, 0.98 / over));
      else continue;
      m.style.zoom = String(Math.round(z * 1000) / 1000);
    }
  };
  setInterval(fitModals, 120);
  // Las zonas aparecen y cambian de tamaño al abrir menús: se revisan a menudo (es barato) y en cada redimensión.
  setInterval(scan, 400);
  addEventListener('resize', scan);
  document.addEventListener('scroll', () => { for (const [el, bar] of bars) place(el, bar); }, { capture: true, passive: true });
})();
