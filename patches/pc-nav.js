// Navegación con mando por zonas en el PC de Bill (port de JayElDragon). port099.py lo añade al chunk `menus`
// (vs = enfocar, hs = foco actual, Cs = candidatos del mando).
// Dentro de una zona (pestañas, ranuras de equipo, mochila, bolsillo, filtros, cuadrícula del PC...) el cursor se
// mueve en línea recta por filas y columnas; solo al llegar al borde pasa a la zona contigua en esa dirección.
(() => {
  const ZONES = `.ex-grid, .ex-doll, .ex-pocket, .ex-tabs, nav, .ex-cap, .ex-filters, .seg, .ex-bar, .ex-foot, .ex-carry, header`;
  const root = () => {
    const b = document.querySelector(`.ex-body`);
    if (!b || !b.offsetParent || document.querySelector(`.modal, .season-modal`)) return null;
    return b.closest(`.screen`) ?? b.parentElement;
  };
  const zone = (e) => e.closest(ZONES) ?? e;
  const box = (e) => e.getBoundingClientRect();
  // p: distancia en la dirección; s: desviación lateral; o: solape lateral (misma fila/columna)
  const geo = (a, b, d) => {
    const A = box(a), B = box(b), ax = A.left + A.width / 2, ay = A.top + A.height / 2, bx = B.left + B.width / 2, by = B.top + B.height / 2;
    const h = d === `left` || d === `right`;
    const p = d === `right` ? bx - ax : d === `left` ? ax - bx : d === `down` ? by - ay : ay - by;
    const s = Math.abs(h ? by - ay : bx - ax);
    const o = h ? Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) : Math.min(A.right, B.right) - Math.max(A.left, B.left);
    return { p, s, o };
  };
  const best = (cur, list, d, strict) => {
    let t = null, sc = Infinity;
    for (const c of list) {
      if (c === cur) continue;
      const { p, s, o } = geo(cur, c, d);
      if (p <= 4 || (strict && o <= 2)) continue;
      const v = p + s * (o > 2 ? 0.3 : 2.5);
      if (v < sc) { sc = v; t = c; }
    }
    return t;
  };
  window.__pbPcNav = (d) => {
    const r = root();
    if (!r) return false;
    const C = Cs().filter((c) => r.contains(c) && !c.closest(`.ex-help`)); // la ayuda de rarezas no es un objeto
    const cur = hs && C.includes(hs) ? hs : null;
    if (!cur) { const first = r.querySelector(`.ex-tab.on`) ?? C[0]; if (first) vs(first); return true; }
    const z = zone(cur), same = C.filter((c) => zone(c) === z), other = C.filter((c) => zone(c) !== z);
    let t = best(cur, same, d, true);
    // Cuadrícula con más filas ocultas en esa dirección: se desplaza una fila y el cursor la sigue
    if (!t && (d === `up` || d === `down`)) {
      const sc = cur.closest(`.ex-grid`);
      if (sc && sc.scrollHeight > sc.clientHeight + 2 && (d === `down` ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2 : sc.scrollTop > 2)) {
        sc.scrollBy({ top: (d === `down` ? 1 : -1) * (box(cur).height + 4), behavior: `auto` });
        const again = Cs().filter((c) => r.contains(c) && zone(c) === z);
        t = best(cur, again, d, true);
        if (!t) return true;
      }
    }
    t = t ?? best(cur, other, d, true) ?? best(cur, other, d, false);
    if (t) vs(t);
    return true;
  };
})();
