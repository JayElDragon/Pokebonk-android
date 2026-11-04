/* Read-only companion and last-run panel. Uses the game's own animated sprite renderer. */
(() => {
  if (window.__jayCompanion) return;
  window.__jayCompanion = true;
  const strings = () => Object.fromEntries(['companion','last','time','kills','level','empty','hint','runs','wins'].map(k => [k, (window.pbT||(k=>k))(k)]));
  const duration = seconds => {
    const n = Math.max(0,Math.floor(Number(seconds)||0));
    const m = Math.floor(n/60), s = String(n%60).padStart(2,'0');
    return `${m}:${s}`;
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag); node.className=className;
    if (text !== undefined) node.textContent=text;
    return node;
  };
  // Sprite sheets have transparent padding. Align the visible feet, not the canvas box.
  const groundSprite = (stage,sprite) => {
    const feetByFrame=new Map();
    let sizeKey='', floor=0, transform='';
    const align = () => {
      if(!stage.isConnected)return;
      try {
        const frame=sprite.__pbFrame??'fallback';
        let bottom=feetByFrame.get(frame);
        if(bottom===undefined){
          const pixels=sprite.getContext('2d').getImageData(0,0,sprite.width,sprite.height).data;
          bottom=-1;
          for(let y=sprite.height-1;y>=0&&bottom<0;y--)for(let x=0;x<sprite.width;x++)if(pixels[(y*sprite.width+x)*4+3]>32){bottom=y;break;}
          if(bottom>=0)feetByFrame.set(frame,bottom);
        }
        if(bottom>=0){
          const nextSize=stage.clientHeight+'|'+sprite.clientHeight;
          if(nextSize!==sizeKey){
            sizeKey=nextSize;
            const platform=getComputedStyle(stage,'::before');
            floor=stage.clientHeight-parseFloat(platform.bottom)-parseFloat(platform.height)/2;
          }
          const next=`translateX(-50%) translateY(${floor-(bottom+1)/sprite.height*sprite.clientHeight}px)`;
          if(next!==transform){
            transform=next;sprite.style.position='absolute';sprite.style.left='50%';sprite.style.top='0';sprite.style.transform=next;
          }
        }
      } catch {}
      requestAnimationFrame(align);
    };
    // Queue after the game's sprite loop; inspect alpha once per distinct frame, then reuse it.
    setTimeout(()=>requestAnimationFrame(align),0);
  };
  const update = () => {
    for (const root of document.querySelectorAll('.jay-home')) {
      const data=window.pbMenuCompanionData?.();
      if (!data) continue;
      const signature=JSON.stringify(data);
      let panel=root.querySelector('.jay-companion');
      if (panel?.dataset.snapshot === signature) continue;
      const t=strings();
      if (!panel) {
        panel=element('aside','jay-companion');
        panel.setAttribute('aria-label',t.companion);
        root.append(panel);
      }
      panel.dataset.snapshot=signature;
      // Replace only when the selected Pokémon or saved summary actually changes.
      panel.replaceChildren();
      const heading=element('div','jay-companion-heading');
      heading.append(element('span','jay-companion-eyebrow',t.companion),element('span','jay-companion-number',`#${String(data.id).padStart(3,'0')}`));
      const stage=element('div','jay-companion-stage');
      const sprite=window.pbCreateMenuCompanion?.();
      if (sprite) {
        sprite.classList.add('jay-companion-sprite');
        sprite.setAttribute('role','img');sprite.setAttribute('aria-label',data.name);
        stage.append(sprite);
      }
      const name=element('h2','jay-companion-name',data.name);
      const types=element('div','jay-companion-types');
      for (const type of data.types) {
        const badge=element('span','jay-companion-type',type.name||type.key);
        badge.style.setProperty('--type',type.color);types.append(badge);
      }
      const summary=element('section','jay-companion-summary');
      summary.append(element('h3','jay-companion-summary-title',t.last));
      if (data.last) {
        const stats=element('div','jay-companion-stats');
        for (const [label,value] of [[t.time,duration(data.last.time)],[t.kills,data.last.kills.toLocaleString(data.lang)],[t.level,data.last.level]]) {
          const stat=element('div','jay-companion-stat');
          stat.append(element('b','',value),element('span','',label));stats.append(stat);
        }
        summary.append(stats);
      } else {
        summary.append(element('b','jay-companion-empty',t.empty),element('span','jay-companion-empty-hint',t.hint));
      }
      const totals=element('div','jay-companion-totals',`${t.runs} ${data.runs.toLocaleString(data.lang)}   ·   ${t.wins} ${data.wins.toLocaleString(data.lang)}`);
      panel.append(heading,stage,name,types,summary,totals);
      if(sprite)groundSprite(stage,sprite);
    }
  };
  let queued=false;
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;update()})}};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  schedule();
})();
