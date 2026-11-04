/* Main menu adaptation for the Android port. All game actions retain their existing nodes/listeners. */
(() => {
  if (window.__jayHomeLayout) return;
  window.__jayHomeLayout = true;
  const icons = {
    home: '<path d="M3 11 12 3l9 8v10h-6v-7H9v7H3Z" fill="#ffe43b"/><path d="m1 11 11-10 11 10-2 3L12 6 3 14Z" fill="#ff667f"/>',
    lab: '<path d="M8 2h8v3h-1v6l6 9a2 2 0 0 1-2 3H5a2 2 0 0 1-2-3l6-9V5H8Z" fill="#e1fcff"/><path d="m7 15-3 5h16l-4-5Z" fill="#75e5ab"/>',
    star: '<path d="m12 1 3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.6L5.2 22l1.3-7.5L1 9.1 8.6 8Z" fill="#ffda35"/>',
    gear: '<path d="m9 2-.6 3-2 .9-2.6-1.4L1 9.1l2.3 2v2L1 15.2l2.8 4.7 2.6-1.4 2 .9.6 3.1h5.5l.6-3.1 2-.9 2.6 1.4 2.8-4.7-2.3-2.1v-2l2.3-2-2.8-4.6-2.6 1.4-2-.9-.6-3Z" fill="#e7deff"/><circle cx="11.8" cy="12" r="4" fill="#382559"/>',
    tasks: '<path d="M5 4h15v19H3V4Z" fill="#fff4d2"/><path d="M8 1h7v5H8Z" fill="#ffe334"/><path d="M7 11h9M7 15h9M7 19h7" fill="none" stroke="#a05a95"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#2c1a4e" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
  const replaceIcon = (button, name) => {
    const target = button?.querySelector('.mm-ic');
    if (target) target.innerHTML = icon(name);
  };
  const apply = () => {
    for (const root of document.querySelectorAll('.screen.mm')) {
      const play = root.querySelector('.mm-modes>.play');
      const left = root.querySelector('.mm-left');
      if (!play || !left || root.dataset.jayLayout) continue;
      root.dataset.jayLayout = 'ready';
      root.classList.add('jay-home');
      const nav = left.querySelector('.mm-nav');
      const tiles = nav.querySelector('.mm-tiles');
      const small = nav.querySelector('.mm-small');
      const settings = small?.querySelector('.mm-item:not(.bug)');
      const tasks = nav.querySelector('.mm-item.tasks');
      const event = nav.querySelector('.mm-item.event');
      const side = document.createElement('aside');
      side.className = 'jay-sidebar';
      side.setAttribute('aria-label', (window.pbT||(k=>k))('nav'));
      const home = document.createElement('button');
      home.type = 'button';
      home.className = 'mm-item jay-home-button';
      home.setAttribute('aria-current', 'page');
      home.innerHTML = `<span class="mm-ic">${icon('home')}</span><span class="mm-tx"><b>${(window.pbT||(k=>k))('home')}</b></span>`;
      home.addEventListener('click', () => { play.focus({preventScroll:true}); });
      side.append(home);
      if (tiles) {
        for (const button of tiles.querySelectorAll('.clan, .mm-item:has(img[src*="ui/icons/gold.png"])')) button.hidden = true;
        const buttons = [...tiles.children].filter(button => !button.hidden && !button.classList.contains('tasks'));
        replaceIcon(buttons[1], 'lab');
        replaceIcon(buttons[2], 'star');
        buttons[2]?.classList.add('jay-achievements');
        side.append(tiles);
      }
      if (small) {
        for (const button of small.querySelectorAll('.bug')) button.hidden = true;
        replaceIcon(settings, 'gear');
        side.append(small);
      }
      const watermark = document.createElement('img');
      watermark.className = 'jay-watermark';
      watermark.src = './assets/items/poke-ball.png';
      watermark.alt = '';
      watermark.setAttribute('aria-hidden','true');
      side.append(watermark);
      nav.classList.add('jay-actions');
      if (tasks) { replaceIcon(tasks,'tasks'); nav.append(tasks); }
      root.classList.toggle('jay-no-event', !event);
      root.append(side, nav);
      if (settings) {
        const shortcut = document.createElement('button');
        shortcut.type='button';
        shortcut.className='jay-settings-shortcut';
        const label=settings.querySelector('b')?.textContent || 'Settings';
        shortcut.title=label;
        shortcut.setAttribute('aria-label',label);
        shortcut.innerHTML=icon('gear');
        shortcut.addEventListener('click',()=>settings.click());
        root.querySelector('.mm-top')?.append(shortcut);
      }
      const notice = root.querySelector('.mm-legal > p:first-child');
      if (notice) {
        notice.dataset.fullNotice = notice.textContent;
        notice.textContent = (window.pbT||(k=>k))('legal');
      }
      const author = root.querySelector('.mm-author');
      if (author) author.textContent = (window.pbT||(k=>k))('author');
    }
    document.documentElement.classList.toggle('jay-home-visible',!!document.querySelector('.screen.mm.jay-home'));
  };
  let queued=false;
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;apply()})}};
  apply();
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
