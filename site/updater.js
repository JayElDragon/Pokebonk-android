/* Port Android de JayElDragon: aviso de actualización (como el de Pokémon Survivors).
   MainActivity consulta la última release de GitHub; si es más nueva llama a window.pbUpdateFound(info).
   El aviso sale en el menú principal una sola vez por versión, con «Descargar actualización» y «Más tarde». */
(() => {
  if (window.__jayUpdater) return;
  window.__jayUpdater = true;
  const SEEN = 'pb-update-seen';
  const t = (k, v) => (window.pbT ? window.pbT(k, v) : k);
  let info = null, shown = false;

  const show = () => {
    if (shown || !info || !document.querySelector('.screen.mm.jay-home')) return;
    try { if (localStorage.getItem(SEEN) === info.tag) return; } catch {}
    if (document.querySelector('.jay-donate-modal, .modal')) return;
    shown = true;
    try { localStorage.setItem(SEEN, info.tag); } catch {}
    const m = document.createElement('div');
    m.className = 'jay-donate-modal jay-update-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    const card = document.createElement('div');
    card.className = 'jd-card';
    const h = document.createElement('h2');
    h.className = 'ju-title';
    h.textContent = t('updTitle');
    const v = document.createElement('p');
    v.className = 'jd-msg ju-version';
    v.textContent = t('updVersion', { tag: info.tag, cur: info.cur });
    const p = document.createElement('div');
    p.className = 'jd-note';
    p.textContent = t('updText');
    const actions = document.createElement('div');
    actions.className = 'jd-actions';
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn big green jd-go';
    go.textContent = t('updDownload');
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'btn ghost jd-close';
    later.textContent = t('updLater');
    actions.append(go, later);
    card.append(h, v, p, actions);
    m.append(card);
    const close = () => { m.remove(); removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); close(); } };
    go.addEventListener('click', () => { window.AndroidMenu?.openUpdate?.(info.url); close(); });
    later.addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });
    document.body.append(m);
    addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => go.focus({ preventScroll: true }));
  };

  window.pbUpdateFound = data => { if (data && data.tag && data.url) { info = data; show(); } };
  try { const pending = window.AndroidMenu?.updateInfo?.(); if (pending) info = JSON.parse(pending); } catch {}
  // Espera a que el menú principal esté a la vista (no interrumpe partidas ni otras ventanas).
  setInterval(show, 1500);
})();
