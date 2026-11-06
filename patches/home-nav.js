// Mapa de mando del menú principal (diseño de JayElDragon). port099.py lo añade al chunk `menus`, donde
// vs(e) enfoca un elemento y hs es el foco actual del mando.
//  · Al entrar al menú el cursor empieza siempre en Jugar.
//  · Centro: Jugar → Supervivencia / Mutación → eventos → Encargos (arriba/abajo entre filas, izq./der. en la fila).
//  · Izquierda desde el centro → barra lateral; derecha desde la barra lateral → fila del centro más cercana.
//  · Totodile (avatar) ↔ Jugar ↔ Inicio: arriba o derecha desde Jugar → avatar; izquierda desde Jugar → Inicio; desde el avatar,
//    abajo o izquierda → Jugar; desde Inicio, derecha → Jugar.
(() => {
  const vis = (e) => { if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 2 && b.height > 2 && getComputedStyle(e).visibility !== `hidden`; };
  const home = () => { const h = document.querySelector(`.jay-home`); return h && vis(h) && !document.querySelector(`.modal, .season-modal`) ? h : null; };
  const cy = (e) => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; };
  const rows = (h) => {
    const g = [];
    for (const e of [...h.querySelectorAll(`.jay-actions .mm-item`)].filter(vis).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)) {
      const t = e.getBoundingClientRect().top, r = g.find((r) => Math.abs(r.t - t) < 12);
      r ? r.items.push(e) : g.push({ t, items: [e] });
    }
    for (const r of g) r.items.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    return g.map((r) => r.items);
  };
  const side = (h) => [...h.querySelectorAll(`.jay-sidebar .mm-item`)].filter(vis);
  const top = (h) => [...h.querySelectorAll(`.mm-top button, .mm-top .tr-av`)].filter(vis).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  const near = (list, y) => list.reduce((a, e) => (!a || Math.abs(cy(e) - y) < Math.abs(cy(a) - y) ? e : a), null);
  const play = (h) => h.querySelector(`.jay-actions .mm-item.play`);
  const avatar = (h) => { const a = h.querySelector(`.mm-top .tr-av`); return vis(a) ? a : null; };

  window.__pbHomeNav = (d) => {
    const h = home();
    if (!h) return false;
    const cur = hs && h.contains(hs) ? hs : null;
    let t = null;
    if (!cur) t = play(h);
    else {
      const R = rows(h), S = side(h), T = top(h), ri = R.findIndex((r) => r.includes(cur));
      if (ri >= 0) {
        const ci = R[ri].indexOf(cur);
        if (d === `up`) t = ri > 0 ? R[ri - 1][Math.min(ci, R[ri - 1].length - 1)] : avatar(h) ?? T[0] ?? null; // Jugar → avatar
        else if (d === `down`) t = ri < R.length - 1 ? R[ri + 1][Math.min(ci, R[ri + 1].length - 1)] : null;
        else if (d === `left`) t = ci > 0 ? R[ri][ci - 1] : ri === 0 ? S[0] ?? null : near(S, cy(cur)); // Jugar → Inicio
        else if (d === `right`) t = ci < R[ri].length - 1 ? R[ri][ci + 1] : ri === 0 ? avatar(h) ?? T[0] ?? null : null; // Jugar → avatar
      } else if (S.includes(cur)) {
        const i = S.indexOf(cur);
        if (d === `up`) t = S[i - 1] ?? null;
        else if (d === `down`) t = S[i + 1] ?? null;
        else if (d === `right`) { const r = i === 0 ? R[0] : R.find((r) => r.some((e) => Math.abs(cy(e) - cy(cur)) < 40)) ?? R[0]; t = r?.[0] ?? null; } // Inicio → Jugar
      } else if (T.includes(cur)) {
        const i = T.indexOf(cur);
        if (d === `left`) t = i > 0 ? T[i - 1] : play(h); // avatar → Jugar
        else if (d === `right`) t = T[i + 1] ?? null;
        else if (d === `down`) t = play(h);
      } else return false;
    }
    if (t) vs(t);
    return true;
  };
  // Al llegar al menú principal (al abrir la app o al volver de cualquier pantalla), el cursor va a Jugar.
  let wasHome = false;
  setInterval(() => { const h = home(); if (h && !wasHome) { const p = play(h); if (p) vs(p); } wasHome = !!h; }, 150);
})();
