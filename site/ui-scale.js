/* Port Android de JayElDragon: tamaño de textos y menús.
   Se carga en <head> antes que el juego: ajusta la escala del viewport, así todo (menús, textos, HUD)
   se ve más pequeño en pantallas bajas (móviles 20:9) sin tocar el código del juego.
   Opciones: auto (se ajusta a la altura de la pantalla), 1, 0.9, 0.8, 0.7. Se guarda en localStorage. */
(() => {
  const KEY = 'pb-ui-scale';
  const CHOICES = ['auto', '1', '0.9', '0.8', '0.7'];
  const read = () => {
    try { const v = localStorage.getItem(KEY); return CHOICES.includes(v) ? v : 'auto'; } catch { return 'auto'; }
  };
  // Altura útil de referencia: la de la Odin (480 px CSS). Pantallas más bajas se escalan hasta caber.
  const autoScale = () => {
    const h = Math.min(screen.width, screen.height) || 480;
    return Math.max(0.7, Math.min(1, h / 460));
  };
  const scale = () => { const v = read(); return v === 'auto' ? autoScale() : Number(v); };
  const apply = () => {
    const s = Math.round(scale() * 100) / 100;
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'viewport'; document.head.append(meta); }
    meta.content = `width=device-width, initial-scale=${s}, minimum-scale=${s}, maximum-scale=${s}, user-scalable=no, viewport-fit=cover`;
  };
  apply();

  // Fila en Ajustes, junto a «Fondo del menú».
  const t = k => (window.pbT ? window.pbT(k) : k);
  const row = () => {
    const r = document.createElement('div');
    r.className = 'st-row segrow wide jay-uiscale-row';
    const label = document.createElement('span');
    label.append(t('uiSize'));
    const small = document.createElement('small');
    small.textContent = t('uiSizeSub');
    label.append(small);
    const seg = document.createElement('div');
    seg.className = 'seg jay-uiscale-choices';
    const cur = read();
    for (const v of CHOICES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill' + (v === cur ? ' on' : '');
      b.setAttribute('aria-pressed', String(v === cur));
      b.textContent = v === 'auto' ? t('auto') : Math.round(Number(v) * 100) + '%';
      b.addEventListener('click', () => {
        if (v === read()) return;
        try { localStorage.setItem(KEY, v); } catch {}
        location.reload();
      });
      seg.append(b);
    }
    r.append(label, seg, document.createElement('span'));
    return r;
  };
  const place = () => {
    const anchor = document.querySelector('.jay-background-row') || document.querySelector('.jay-music-row');
    if (!anchor || anchor.parentElement.querySelector('.jay-uiscale-row')) return;
    anchor.before(row());
  };
  const start = () => {
    let queued = false;
    new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; place(); }); } })
      .observe(document.documentElement, { childList: true, subtree: true });
    place();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
