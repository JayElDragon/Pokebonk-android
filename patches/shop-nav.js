// Navegación con mando en las tiendas de la partida (Meowth, Hypno) — port de JayElDragon. port099.py lo añade al
// chunk `menus` (vs = enfocar, hs = foco actual, Cs = candidatos del mando).
// Zonas: Renovar · ofertas · vender tus objetos · pie (Salir). Izquierda/derecha recorren libremente la fila actual
// y nunca saltan a otra zona; arriba/abajo pasan a la zona de encima o de debajo.
(() => {
  const ZONES = `.cards, .shop-sell, .shop-foot, .actions, .row, .col`;
  const zone = (e) => e.closest(ZONES) ?? e;
  const box = (e) => e.getBoundingClientRect();
  const geo = (a, b, d) => {
    const A = box(a), B = box(b), ax = A.left + A.width / 2, ay = A.top + A.height / 2, bx = B.left + B.width / 2, by = B.top + B.height / 2;
    const h = d === `left` || d === `right`;
    const p = d === `right` ? bx - ax : d === `left` ? ax - bx : d === `down` ? by - ay : ay - by;
    const s = Math.abs(h ? by - ay : bx - ax);
    const o = h ? Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) : Math.min(A.right, B.right) - Math.max(A.left, B.left);
    return { p, s, o };
  };
  const best = (cur, list, d) => {
    let t = null, sc = Infinity;
    for (const c of list) {
      if (c === cur) continue;
      const { p, s, o } = geo(cur, c, d);
      if (p <= 4) continue;
      const v = p + s * (o > 2 ? 0.3 : 1.5);
      if (v < sc) { sc = v; t = c; }
    }
    return t;
  };
  window.__pbShopNav = (d) => {
    const m = document.querySelector(`.modal.shop-modal`);
    if (!m || !m.offsetParent) return false;
    const C = Cs().filter((c) => m.contains(c));
    const cur = hs && C.includes(hs) ? hs : null;
    if (!cur) { const first = m.querySelector(`.cards .card`) ?? C[0]; if (first) vs(first); return true; }
    const z = zone(cur);
    const same = C.filter((c) => zone(c) === z), other = C.filter((c) => zone(c) !== z);
    let t;
    if (d === `left` || d === `right`) t = best(cur, same, d); // nunca sale de la fila
    else t = best(cur, other, d) ?? best(cur, same, d);
    if (t) vs(t);
    else if (d === `up` || d === `down`) m.scrollBy({ top: (d === `down` ? 1 : -1) * 80, behavior: `smooth` });
    return true;
  };
})();
