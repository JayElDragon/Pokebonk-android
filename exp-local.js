// La Gran Expedición 100 % local (port Android de JayElDragon).
// El juego web guarda el inventario de la Expedición en el servidor de Charcher; aquí lo hace el backend local.
// Las fórmulas (valor, reparación, seguro, reforja, botín...) son las del propio juego: la parte A las expone
// desde el chunk `menus` y port099.py cambia los $NOMBRES$ por los minificados de cada versión.
// Lo que en la web depende de otros jugadores (mercado entre entrenadores y ecos) no está disponible.

/* ==== PARTE A (chunk menus) ==== */
window.__pbExpH = {
  gen: $qW$,          // (semilla, claim, find, mew) -> objeto del botín
  find: $jW$,         // bonus de hallazgo del equipo
  value: $NW$,        // valor de venta
  salvage: $FW$,      // esquirlas al reciclar
  repair: $IW$,       // coste de reparación
  reforge: $LW$,      // coste de reforja {shards, coins}
  buyPrice: $RW$,     // precio en la tienda
  insureCost: $cG$,   // coste del seguro de un objeto
  insureTotal: $uG$,  // seguro de todo lo asegurado
  overMsg: $oG$,      // aviso de PC desbordado (o null)
  repLevel: $QW$, repSteps: $ZW$, shopSize: $tG$, expandCost: $eG$, stashCfg: $$W$,
  isGear: $dW$, slotOf: $fW$, base: $lW$, slots: $qU$,
  legends: $aW$, uses: $oW$, loots: $sW$, gears: $iW$,
  cfg: $YW$, aid: $XW$, ins: $sG$, market: $dG$,
};
/* ==== FIN PARTE A ==== */

/* ==== PARTE B (backend local) ==== */
var PB_EXP = (() => {
  const H = () => window.__pbExpH;
  const DAY = 864e5;
  const day = (t = Date.now()) => Math.floor(t / DAY);
  const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
  const fail = (m) => { throw Object.assign(Error(m), { status: 400 }); };
  const T = (s, v) => (__PB.c ? __PB.c(s, v) : s);

  function blank() {
    return {
      coins: H().aid.start, shards: 0, rep: 0, slots: H().stashCfg.base,
      gear: {}, bag: [], pocket: null, stash: [], over: [], ins: [],
      con: { day: -1, list: [] }, shop: { day: -1, items: [], sold: [], rolls: 0 },
      codex: [], stats: { raids: 0, out: 0, dead: 0, best: 0, value: 0, shiny: 0 },
      last: null, raid: false, aid: -1, nextId: 1,
    };
  }
  function state(p) {
    if (!p.exp || typeof p.exp !== `object`) p.exp = blank();
    let e = p.exp, b = blank();
    for (let k of Object.keys(b)) if (e[k] === undefined) e[k] = b[k];
    refreshDaily(e);
    return e;
  }
  const newItem = (e, it) => ({ ...it, id: e.nextId++ });
  const all = (e) => [...e.stash, ...e.over, ...H().slots.map((s) => e.gear[s]).filter(Boolean), ...e.bag, ...(e.pocket ? [e.pocket] : [])];
  const byId = (e, id) => all(e).find((x) => x.id === id) ?? fail(T(`Ese objeto ya no está.`));
  // Saca un objeto de donde esté y lo devuelve.
  function take(e, id) {
    for (let s of H().slots) if (e.gear[s]?.id === id) { let x = e.gear[s]; delete e.gear[s]; return x; }
    for (let k of [`stash`, `over`, `bag`]) { let i = e[k].findIndex((x) => x.id === id); if (i >= 0) return e[k].splice(i, 1)[0]; }
    if (e.pocket?.id === id) { let x = e.pocket; e.pocket = null; return x; }
    fail(T(`Ese objeto ya no está.`));
  }
  function toStash(e, it) {
    if (!H().isGear(it)) { // consumibles y tesoros se apilan
      let base = H().base.get(it.b), same = e.stash.find((x) => x.b === it.b && !H().isGear(x) && (x.q ?? 1) < (base?.stack ?? 1));
      if (same) {
        let room = (base?.stack ?? 1) - (same.q ?? 1), n = Math.min(room, it.q ?? 1);
        same.q = (same.q ?? 1) + n;
        if ((it.q ?? 1) - n <= 0) return;
        it = { ...it, q: (it.q ?? 1) - n };
      }
    }
    (e.stash.length < e.slots ? e.stash : e.over).push(it);
  }
  const noRaid = (e) => { if (e.raid) fail(T(`Estás en una expedición.`)); };

  // ---------- contratos y tienda del día ----------
  const KINDS = [
    [`extract`, (l) => 1 + (l > 4 ? 1 : 0) + (l > 7 ? 1 : 0)],
    [`rare`, (l) => 2 + Math.floor(l / 3)],
    [`crates`, (l) => 4 + l],
    [`boss`, (l) => 1 + Math.floor(l / 4)],
    [`value`, (l) => 150 + l * 120],
    [`deep`, (l) => 1 + Math.floor(l / 3)],
    [`level`, (l) => Math.min(30, 8 + l * 2)],
  ];
  function contracts(e) {
    let lv = H().repLevel(e.rep), pool = KINDS.slice();
    let list = [];
    for (let i = 0; i < 3; i++) {
      let [k, f] = pool.splice(rnd() % pool.length, 1)[0], n = f(lv);
      list.push({ k, n, got: 0, done: false, paid: false, coins: 40 + lv * 25, shards: 2 + lv, rep: 30 + lv * 10 });
    }
    return list;
  }
  function shopItems(e) {
    let lv = H().repLevel(e.rep), n = H().shopSize(e.rep), seed = (day() * 7919 + (e.shop.rolls ?? 0) * 104729 + rnd()) >>> 0, out = [];
    for (let i = 0; i < n; i++) {
      let claim = { k: i % 3 === 0 ? `elite` : `crate`, i: i + 1, t: Math.min(3, 1 + Math.floor(lv / 3)), m: Math.min(25, 4 + lv * 2) };
      let it = H().gen(seed, claim, lv * 4, 0);
      if (it) out.push({ ...it, id: 0 });
    }
    return out;
  }
  function refreshDaily(e) {
    let d = day();
    if (e.con.day !== d || !e.con.list.length || e.con.list.every((c) => c.paid)) e.con = { day: d, list: contracts(e) };
    if (e.shop.day !== d) e.shop = { day: d, items: shopItems(e), sold: [], rolls: 0 };
  }

  // ---------- acciones del PC de Bill ----------
  const ACT = {
    seen(e) { for (let x of all(e)) delete x.n; },
    lock(e, a) { let x = byId(e, a.id); x.lk = !x.lk || undefined; },
    pack(e, a) {
      if (e.bag.length >= H().cfg.bag) fail(T(`La mochila está llena.`));
      e.bag.push(take(e, a.id));
    },
    unpack(e, a) { toStash(e, take(e, a.id)); },
    store(e, a) { toStash(e, take(e, a.id)); },
    equip(e, a) {
      let x = byId(e, a.id), s = H().slotOf(x);
      if (!s) fail(T(`Eso no se puede equipar.`));
      take(e, a.id);
      if (e.gear[s]) toStash(e, e.gear[s]);
      e.gear[s] = x;
    },
    unequip(e, a) { let x = e.gear[a.slot]; if (x) { delete e.gear[a.slot]; toStash(e, x); } },
    pocket(e, a) { let x = take(e, a.id); if (e.pocket) toStash(e, e.pocket); e.pocket = x; },
    unpocket(e) { if (e.pocket) { toStash(e, e.pocket); e.pocket = null; } },
    insure(e, a) {
      let i = e.ins.indexOf(a.id);
      if (i >= 0) e.ins.splice(i, 1);
      else { byId(e, a.id); e.ins.push(a.id); }
    },
    sell(e, a) {
      for (let id of a.ids ?? []) {
        let x = byId(e, id);
        if (x.lk) continue;
        take(e, id);
        e.coins += H().value(x);
        e.ins = e.ins.filter((k) => k !== id);
      }
    },
    salvage(e, a) {
      for (let id of a.ids ?? []) {
        let x = byId(e, id);
        if (x.lk || !H().isGear(x)) continue;
        take(e, id);
        e.shards += H().salvage(x);
        e.ins = e.ins.filter((k) => k !== id);
      }
    },
    repair(e, a) {
      let x = byId(e, a.id), c = H().repair(x);
      if (!c) return;
      if (e.coins < c) fail(T(`No tienes Fichas suficientes.`));
      e.coins -= c; x.d = 100; x.rp = (x.rp ?? 0) + 1;
    },
    repairAll(e) {
      let list = [...e.stash, ...H().slots.map((s) => e.gear[s]).filter(Boolean)].filter((x) => H().isGear(x) && (x.d ?? 100) < 100);
      let c = list.reduce((s, x) => s + H().repair(x), 0);
      if (!c) return;
      if (e.coins < c) fail(T(`No tienes Fichas suficientes.`));
      e.coins -= c;
      for (let x of list) { x.d = 100; x.rp = (x.rp ?? 0) + 1; }
    },
    expand(e) {
      if (e.slots >= H().stashCfg.max) return;
      let c = H().expandCost(e.slots);
      if (e.coins < c) fail(T(`No tienes Fichas suficientes.`));
      e.coins -= c; e.slots += H().stashCfg.step;
      while (e.over.length && e.stash.length < e.slots) e.stash.push(e.over.shift());
    },
    reforge(e, a) {
      let x = byId(e, a.id), c = H().reforge(x);
      if (!H().isGear(x) || x.r < 1) fail(T(`Elige un objeto Poco común o mejor.`));
      if (x.pf) return;
      if (e.shards < c.shards || e.coins < c.coins) fail(T(`No tienes suficientes Esquirlas o Fichas.`));
      e.shards -= c.shards; e.coins -= c.coins;
      x.pf = [a.i, rnd(), rnd()];
    },
    forge(e, a) {
      let x = byId(e, a.id);
      if (!x.pf) return;
      if (a.pick === 1 || a.pick === 2) {
        x.rf = (x.rf ?? []).filter(([i]) => i !== x.pf[0]);
        x.rf.push([x.pf[0], x.pf[a.pick]]);
      }
      delete x.pf;
    },
    buy(e, a) {
      let it = e.shop.items[a.k];
      if (!it || e.shop.sold.includes(a.k)) fail(T(`Ya se ha vendido.`));
      let c = H().buyPrice(it);
      if (e.coins < c) fail(T(`No tienes Fichas suficientes.`));
      e.coins -= c; e.shop.sold.push(a.k);
      toStash(e, newItem(e, { ...it, n: 1 }));
    },
    reroll(e) {
      let c = 60 * (1 + (e.shop.rolls ?? 0));
      if (e.coins < c) fail(T(`No tienes Fichas suficientes.`));
      e.coins -= c; e.shop.rolls = (e.shop.rolls ?? 0) + 1;
      e.shop.items = shopItems(e); e.shop.sold = [];
    },
    claim(e, a) {
      let c = e.con.list[a.k];
      if (!c || !c.done || c.paid) return;
      c.paid = true; e.coins += c.coins; e.shards += c.shards; e.rep += c.rep;
    },
    aid(e) {
      let d = day();
      if (e.aid === d) fail(T(`Bill ya te ayudó hoy.`));
      e.aid = d; e.coins += H().aid.aid;
      for (let k = 0; k < 2; k++) {
        let g = H().gears.filter((x) => (x.minLv ?? 1) <= 1);
        let b = g[rnd() % g.length];
        if (b) toStash(e, newItem(e, { b: b.key, lv: 1, r: 0, s: rnd(), d: 100, n: 1 }));
      }
    },
    echo(e, a) { e.echoOff = !!a.off; },
  };

  // ---------- inicio y final de una expedición ----------
  function start(p) {
    let e = state(p);
    let msg = H().overMsg(e);
    if (msg) fail(msg);
    let cost = H().insureTotal(e);
    if (cost > e.coins) fail(T(`No tienes Fichas para pagar el seguro ({n}).`, { n: cost }));
    e.coins -= cost;
    e.raid = true;
    e.raidLoad = { gear: { ...e.gear }, bag: e.bag.slice(), pocket: e.pocket, ins: e.ins.slice() };
    try { __PB.tH.set(`pb.offline.profile`, p); } catch {} // si la app se cierra a mitad, cuenta como caída
    return { gear: structuredClone(e.gear), bag: structuredClone(e.bag), pocket: structuredClone(e.pocket), echoes: [] };
  }
  // r: res.exp de la partida ({out, loot, gear, bag, pocket, q, crates, bosses}); seed: semilla del ticket.
  function finish(p, seed, r) {
    let e = state(p), load = e.raidLoad;
    if (!e.raid || !load) return null;
    e.raid = false; delete e.raidLoad;
    r = r ?? { out: false, loot: [], gear: {}, bag: [], pocket: null, q: {} };
    let carriedIn = [...H().slots.map((s) => load.gear[s]).filter(Boolean), ...load.bag, ...(load.pocket ? [load.pocket] : [])];
    let byRef = new Map(carriedIn.map((x) => [`e` + x.id, x]));
    let find = H().find([...H().slots.map((s) => load.gear[s]), load.pocket]);
    let mew = [...H().slots.map((s) => load.gear[s]), load.pocket].some((x) => x?.b === `leg-mew` && (x.d ?? 100) > 0) ? 3 : 0;
    let loot = (r.loot ?? []).map((c) => H().gen(seed, c, find, mew));
    const resolve = (ref) => {
      if (!ref) return null;
      if (byRef.has(ref)) return byRef.get(ref);
      let i = /^l(\d+)$/.exec(ref)?.[1];
      if (i == null || !loot[+i]) return null;
      let x = newItem(e, { ...loot[+i], n: 1 });
      Object.defineProperty(x, `_li`, { value: +i, enumerable: false });
      return x;
    };
    const qty = (x, ref) => {
      if (H().isGear(x)) return x;
      let q = r.q?.[ref];
      if (q === undefined) return x;
      return q > 0 ? { ...x, q } : null;
    };
    // Quita de la base todo lo que entró (vuelve según el resultado)
    for (let x of carriedIn) { try { take(e, x.id); } catch {} }
    let got = [], lost = [], back = [], value = 0;
    let endGear = {}, endBag = [], endPocket = null;
    for (let s of H().slots) { let ref = r.gear?.[s], x = ref && qty(resolve(ref), ref); if (x) endGear[s] = x; }
    for (let ref of r.bag ?? []) { let x = qty(resolve(ref), ref); if (x) endBag.push(x); }
    if (r.pocket) endPocket = qty(resolve(r.pocket), r.pocket);
    const isLoot = (x) => !carriedIn.some((c) => c.id === x.id);
    if (r.out) {
      for (let s of H().slots) if (endGear[s]) { let x = endGear[s]; if (H().isGear(x)) x.d = Math.max(0, (x.d ?? 100) - 8); }
      for (let s of H().slots) if (endGear[s]) e.gear[s] = endGear[s];
      for (let x of endBag) (isLoot(x) ? toStash : (ee, it) => (ee.bag.length < H().cfg.bag ? ee.bag.push(it) : toStash(ee, it)))(e, x);
      if (endPocket) { if (isLoot(endPocket)) toStash(e, endPocket); else e.pocket = endPocket; }
      for (let x of [...Object.values(endGear), ...endBag, ...(endPocket ? [endPocket] : [])]) if (isLoot(x)) { got.push(x); value += H().value(x); }
      e.stats.out++;
    } else {
      let insured = new Set(load.ins);
      for (let x of [...Object.values(endGear), ...endBag]) {
        if (!isLoot(x) && insured.has(x.id) && H().isGear(x)) { x.d = Math.max(0, (x.d ?? 100) - H().ins.wear); back.push(x); toStash(e, x); }
        else lost.push(x);
      }
      if (endPocket) { if (isLoot(endPocket)) { got.push(endPocket); value += H().value(endPocket); } toStash(e, endPocket); }
      e.stats.dead++;
    }
    e.ins = e.ins.filter((id) => all(e).some((x) => x.id === id));
    e.stats.raids++;
    e.stats.value += value;
    e.stats.best = Math.max(e.stats.best, value);
    for (let x of got) {
      if (x.sh) e.stats.shiny++;
      if (x.r === 4 && !e.codex.includes(x.b)) e.codex.push(x.b);
    }
    if (r.out) {
      e.rep += Math.round(value / 8) + 5;
      for (let c of e.con.list) {
        if (c.done) continue;
        let add = c.k === `extract` ? 1 : c.k === `rare` ? got.filter((x) => H().isGear(x) && x.r >= 2).length
          : c.k === `crates` ? (r.crates ?? 0) : c.k === `boss` ? (r.bosses ?? 0) : c.k === `value` ? value
          : c.k === `deep` ? got.filter((x) => r.loot?.[x._li]?.t === 3).length : 0;
        if (c.k === `level`) c.got = Math.max(c.got, ...got.map((x) => x.lv ?? 0), 0);
        else c.got += add;
        if (c.got >= c.n) c.done = true;
      }
    }
    e.last = { out: !!r.out, value, got, lost, ins: back };
    return e.last;
  }
  // Una expedición que quedó abierta (la app se cerró en mitad): cuenta como caída.
  function abandon(p) { let e = state(p); if (e.raid) finish(p, 0, null); }
  return { state, act: ACT, start, finish, abandon };
})();

Object.assign(PBLocal.prototype, {
  async expState() {
    let p = this.meta.profile;
    if (!this.meta.ticket) PB_EXP.abandon(p);
    PB_EXP.state(p);
    this.persist();
    return { profile: structuredClone(p), now: Date.now(), sales: null };
  },
  async expAction(a, actions) {
    let p = this.meta.profile, e = PB_EXP.state(p);
    for (let x of actions ?? []) {
      let f = PB_EXP.act[x.a];
      if (!f) throw Error(__PB.c(`Esto necesita conexión con el servidor.`));
      if (x.a !== `seen` && x.a !== `lock` && x.a !== `echo` && e.raid) throw Error(__PB.c(`Estás en una expedición.`));
      f(e, x);
    }
    this.persist();
    return structuredClone(p);
  },
  // Lo que en la web es entre jugadores: sin conexión no hay nadie con quien comerciar.
  async expMarket() { throw Error(__PB.c(`El comercio con otros entrenadores necesita conexión.`)); },
  async expMine() { throw Error(__PB.c(`El comercio con otros entrenadores necesita conexión.`)); },
  async expTrade() { throw Error(__PB.c(`El comercio con otros entrenadores necesita conexión.`)); },
  async expEchoes() { throw Error(__PB.c(`Los rivales necesitan conexión.`)); },
});
/* ==== FIN PARTE B ==== */
