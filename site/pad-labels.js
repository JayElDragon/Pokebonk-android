/* Port Android de JayElDragon: con mando, las teclas de teclado que aparecen en textos (Esc, Space, Shift, «Press E»…)
   se muestran como los botones del mando (A, B, X, Y, RB, Start…) según la configuración de botones del juego.
   Solo actúa en modo mando (html.pad); con teclado o pantalla táctil no cambia nada. */
(() => {
  if (window.__jayPadLabels) return;
  window.__jayPadLabels = true;
  const action = { E: 'interact', R: 'ult', Q: 'aim', M: 'map', F: 'reroll', X: 'skip', Z: 'banish', Space: 'jump', Espacio: 'jump', Shift: 'dash', ShiftLeft: 'dash', 'Mayús': 'dash', Enter: 'confirm', Intro: 'confirm' };
  const fixed = { Esc: 9, P: 9, Tab: 8 };            // Start / Select del mando
  const stick = { WASD: 'L', Mouse: 'R', 'Ratón': 'R', Rat: 'R' };
  const label = key => {
    if (action[key]) return window.pbPadLabel?.(action[key]) || null;
    if (fixed[key] != null) return window.pbPadName?.(fixed[key]) || null;
    if (stick[key]) return stick[key] === 'L' ? 'L-Stick' : 'R-Stick';
    return null;
  };
  const keys = 'E|R|Q|M|F|X|Z|P|Esc|Enter|Intro|Space|Espacio|Shift|Mayús|Tab';
  const verbs = 'Press|Hold|Tap|Pulsa|Mantén pulsado|Mantén|Pressione|Aperte|Segure|Appuie sur|Maintiens|Drück|Halte';
  const reVerb = new RegExp('(' + verbs + ')(\\s+)(' + keys + ')(?![\\p{L}\\p{N}])', 'gu');
  const reParen = new RegExp('\\((Shift|Mayús|Tab|Space|Espacio|Esc)(?![\\p{L}\\p{N}])', 'gu');
  const reBracket = new RegExp('\\[(' + keys + ')\\]', 'gu');
  const reBare = new RegExp('(^|[^\\p{L}\\p{N}])(Esc|Shift|Mayús|Tab)(?![\\p{L}\\p{N}])', 'gu');
  const done = new WeakMap();                        // nodo → texto ya convertido (evita convertir dos veces)

  const convertText = text => text
    .replace(reVerb, (m, v, sp, k) => { const l = label(k); return l ? v + sp + l : m; })
    .replace(reParen, (m, k) => { const l = label(k); return l ? '(' + l : m; })
    .replace(reBracket, (m, k) => { const l = label(k); return l ? '[' + l + ']' : m; })
    .replace(reBare, (m, pre, k) => { const l = label(k); return l ? pre + l : m; });

  const convertKbd = el => {
    if (el.dataset.nokbd || done.get(el) === el.textContent) return;
    const l = label(el.textContent.trim());
    if (l) el.textContent = l;
    done.set(el, el.textContent);
  };
  const walk = root => {
    for (const k of root.querySelectorAll ? root.querySelectorAll('kbd') : []) convertKbd(k);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && !n.parentElement.closest('input, textarea, script, style, kbd, .jay-donate-modal')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (done.get(n) === n.data) continue;
      const out = convertText(n.data);
      if (out !== n.data) n.data = out;
      done.set(n, n.data);
    }
  };
  let queued = false;
  const run = () => {
    queued = false;
    if (!document.documentElement.classList.contains('pad') || !window.pbPadLabel) return;
    walk(document.body);
  };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
})();
