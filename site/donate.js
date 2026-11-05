/* Port Android de JayElDragon: botón «Donations» bajo Ajustes en la barra lateral del menú y su ventana.
   El enlace a Ko-fi lo abre MainActivity en el navegador del sistema (única web externa permitida). */
(() => {
  if (window.__jayDonate) return;
  window.__jayDonate = true;
  const URL = 'https://ko-fi.com/jayeldragon';

  const T = {
    es: { label: 'Donaciones', title: 'Apoya el proyecto', msg: 'Este port para Android de PokéBonk es un proyecto personal de JayElDragon, gratis y sin anuncios. Si quieres apoyar su trabajo, puedes hacer una donación voluntaria en Ko-fi.', note: 'Donar no da ninguna ventaja en el juego y ayuda al desarrollo de este proyecto.', btn: 'Donar en Ko-fi', close: 'Cerrar' },
    en: { label: 'Donations', title: 'Support The Project', msg: 'This Android port of PokéBonk is a personal project by JayElDragon, free and ad-free. If you\'d like to support the work, you can make a voluntary donation on Ko-fi.', note: 'Donations give no in-game advantage and help the development of this project.', btn: 'Donate on Ko-fi', close: 'Close' },
    pt: { label: 'Doações', title: 'Apoie o projeto', msg: 'Este port para Android do PokéBonk é um projeto pessoal de JayElDragon, gratuito e sem anúncios. Se quiser apoiar o trabalho, você pode fazer uma doação voluntária no Ko-fi.', note: 'Doar não dá nenhuma vantagem no jogo e ajuda no desenvolvimento deste projeto.', btn: 'Doar no Ko-fi', close: 'Fechar' },
    fr: { label: 'Dons', title: 'Soutenir le projet', msg: 'Ce portage Android de PokéBonk est un projet personnel de JayElDragon, gratuit et sans publicité. Si vous souhaitez soutenir ce travail, vous pouvez faire un don volontaire sur Ko-fi.', note: 'Les dons ne donnent aucun avantage en jeu et aident au développement de ce projet.', btn: 'Faire un don sur Ko-fi', close: 'Fermer' },
    ja: { label: '寄付', title: 'プロジェクトを応援', msg: 'このPokéBonkのAndroid移植版は、JayElDragonの個人プロジェクトです。無料で広告もありません。活動を応援していただける方は、Ko-fiで任意の寄付ができます。', note: '寄付によるゲーム内の特典はありませんが、このプロジェクトの開発の助けになります。', btn: 'Ko-fiで寄付', close: '閉じる' },
    zh: { label: '捐赠', title: '支持本项目', msg: '这个 PokéBonk 的 Android 移植版是 JayElDragon 的个人项目，免费且无广告。如果你想支持这项工作，可以在 Ko-fi 上自愿捐赠。', note: '捐赠不会带来任何游戏内优势，但会帮助这个项目的开发。', btn: '在 Ko-fi 上捐赠', close: '关闭' },
    zht: { label: '捐贈', title: '支持本專案', msg: '這個 PokéBonk 的 Android 移植版是 JayElDragon 的個人專案，免費且無廣告。如果你想支持這項工作，可以在 Ko-fi 上自願捐贈。', note: '捐贈不會帶來任何遊戲內優勢，但會幫助這個專案的開發。', btn: '在 Ko-fi 上捐贈', close: '關閉' },
    ko: { label: '후원', title: '프로젝트 응원하기', msg: '이 PokéBonk 안드로이드 포트는 JayElDragon의 개인 프로젝트로, 무료이며 광고가 없습니다. 작업을 응원하고 싶다면 Ko-fi에서 자발적으로 후원할 수 있습니다.', note: '후원해도 게임 내 혜택은 없지만, 이 프로젝트의 개발에 도움이 됩니다.', btn: 'Ko-fi에서 후원하기', close: '닫기' },
    ru: { label: 'Пожертвования', title: 'Поддержать проект', msg: 'Этот Android-порт PokéBonk — личный проект JayElDragon, бесплатный и без рекламы. Если хотите поддержать работу, можно сделать добровольное пожертвование на Ko-fi.', note: 'Пожертвования не дают преимуществ в игре и помогают развитию этого проекта.', btn: 'Пожертвовать на Ko-fi', close: 'Закрыть' },
  };
  T.de = { label: 'Spenden', title: 'Unterstütze das Projekt', msg: 'Dieser Android-Port von PokéBonk ist ein persönliches Projekt von JayElDragon, kostenlos und ohne Werbung. Wenn du die Arbeit unterstützen möchtest, kannst du auf Ko-fi freiwillig spenden.', note: 'Spenden bringen keinen Vorteil im Spiel und helfen bei der Entwicklung dieses Projekts.', btn: 'Auf Ko-fi spenden', close: 'Schließen' };
  const lang = () => {
    const l = (document.documentElement.lang || 'en').toLowerCase();
    if (l === 'zht' || l.startsWith('zh-tw') || l.startsWith('zh-hk') || l.includes('hant')) return 'zht';
    const k = l.split('-')[0];
    return T[k] ? k : 'en';
  };

  // Cafecito: taza con corazón, café, vapor y platito.
  const cup = `<svg class="jay-coffee" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#2c1a4e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 3.5c-1.6 1.5 1.4 2.6 0 4.6M15.5 2.5c-1.8 1.7 1.6 2.9 0 5.2M20 3.5c-1.6 1.5 1.4 2.6 0 4.6" stroke="#f4ecff" stroke-width="1.5"/>
    <ellipse cx="15.5" cy="27.3" rx="12" ry="2.6" fill="#ffc6d8"/>
    <path d="M24 14.2h1.6a3.4 3.4 0 0 1 0 6.8H23" stroke-width="2"/>
    <path d="M5.5 11.5h20v7a7.3 7.3 0 0 1-7.3 7.3h-5.4a7.3 7.3 0 0 1-7.3-7.3Z" fill="#fff6f9"/>
    <path d="M6 15.5h19" stroke="#ffb0c8" stroke-width="1.4"/>
    <ellipse cx="15.5" cy="11.6" rx="10" ry="2.3" fill="#9a5630"/>
    <ellipse cx="13.6" cy="11.2" rx="3.4" ry=".8" fill="#d79563" stroke="none"/>
    <path d="M15.5 23.2c-2.6-1.7-4-3-4-4.6a2 2 0 0 1 4-.6 2 2 0 0 1 4 .6c0 1.6-1.4 2.9-4 4.6Z" fill="#ff4f86" stroke-width="1.3"/>
  </svg>`;

  let modal = null;
  const close = () => {
    if (!modal) return;
    modal.remove();
    modal = null;
    removeEventListener('keydown', onKey, true);
    document.querySelector('.jay-donate')?.focus({ preventScroll: true });
  };
  const onKey = e => {
    if (modal && (e.key === 'Escape' || e.key === 'Backspace')) { e.preventDefault(); e.stopPropagation(); close(); }
  };
  const open = () => {
    if (modal) return;
    const t = T[lang()];
    modal = document.createElement('div');
    modal.className = 'jay-donate-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `<div class="jd-card">
        <div class="jd-head"><span class="jd-ic">${cup}</span><h2>${t.title}</h2></div>
        <p class="jd-msg">${t.msg}</p>
        <div class="jd-note"><span class="jd-heart">♥</span><span>${t.note}</span></div>
        <div class="jd-actions">
          <button type="button" class="btn big red jd-go"><span class="jd-btn-ic">${cup}</span>${t.btn}</button>
          <button type="button" class="btn ghost jd-close">${t.close}</button>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('.jd-close').addEventListener('click', close);
    modal.querySelector('.jd-go').addEventListener('click', () => { location.href = URL; });
    document.body.append(modal);
    addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => modal?.querySelector('.jd-go')?.focus({ preventScroll: true }));
  };

  const place = () => {
    const small = document.querySelector('.jay-sidebar .mm-small');
    if (!small || small.querySelector('.jay-donate')) return;
    const settings = small.querySelector('.mm-item:not(.bug)');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mm-item mini jay-donate';
    b.innerHTML = `<span class="mm-ic">${cup}</span><span class="mm-tx"><b>${T[lang()].label}</b></span>`;
    b.addEventListener('click', open);
    if (settings) settings.after(b); else small.append(b);
    document.documentElement.classList.add('jay-has-donate');
    // Las traducciones largas (ruso, español) se encogen hasta caber en el botón.
    requestAnimationFrame(() => {
      const label = b.querySelector('b'), box = b.querySelector('.mm-tx');
      if (!label || !box) return;
      let size = parseFloat(getComputedStyle(label).fontSize);
      while (label.scrollWidth > box.clientWidth + 1 && size > 8) {
        size -= 0.5;
        label.style.setProperty('font-size', size + 'px', 'important');
      }
    });
  };
  let queued = false;
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; place(); }); } })
    .observe(document.documentElement, { childList: true, subtree: true });
  place();
})();
