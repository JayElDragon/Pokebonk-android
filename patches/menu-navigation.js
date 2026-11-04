// Menu input only. Game simulation and performance preferences remain unchanged.
// Android menu navigation and rendering budget for the JayElDragon port.
let pbMenuApp = null;
let pbNativeMenu = null;
let pbNativeBindings = ``;

function pbMenuEditing() {
  const target = document.activeElement;
  return !!target && (target.isContentEditable || target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && /^(text|search|email|password|url|tel|number)$/.test(target.type)));
}
function pbInMenu(app) { return !app.run || app.run.state !== `play`; }
function pbAndroidSyncMenu(app) {
  const menu = pbInMenu(app) && !pbMenuEditing() && !ss;
  if (menu !== pbNativeMenu) {
    pbNativeMenu = menu;
    try { window.AndroidMenu?.setMenuMode(menu); } catch {}
  }
  const bindings = [oo(`confirm`), oo(`back`)];
  const key = bindings.join(`,`);
  if (key !== pbNativeBindings) {
    pbNativeBindings = key;
    try { window.AndroidMenu?.setMenuBindings?.(...bindings); } catch {}
  }
  document.documentElement.classList.toggle(`pad-menu`, menu && Vo);
}
function pbMenuTarget() {
  if (Os?.isConnected && Fs(Os)) return Os;
  const active = document.activeElement;
  if (active?.matches?.(Ms) && Fs(active)) return active;
  const selected = document.querySelector(`.jay-home .play, .sp-card.on, .cards .card.on`);
  return selected && Fs(selected) ? selected : Ls();
}
function pbInstallAndroidControls(app) {
  pbMenuApp = app;
  pbInstallLocalPreferences(app);
  window.pbActiveMenuBackground=()=>app.menuScene?.kind??null;
  // Expose only the menu's selected Pokémon and a small read-only local summary.
  window.pbMenuCompanionData = () => {
    const profile = app.meta?.profile;
    if (!profile) return null;
    const id = profile.lastSpecies || profile.starter;
    const pokemon = j.get(id);
    if (!pokemon) return null;
    const runs = profile.runs ?? [];
    const last = runs.length ? runs[runs.length - 1] : null;
    const totals = app.backend.kind === `local` && typeof app.backend.lifeStats === `function`
      ? app.backend.lifeStats() : null;
    return {
      id, name: pokemon.name, lang: document.documentElement.lang,
      types: pokemon.types.map(key => ({key, name: ne[key], color: xO(Ua[key])})),
      last: last ? {time: last.time || 0, kills: last.kills || 0, level: last.level || 0} : null,
      runs: totals?.runs ?? runs.length,
      wins: totals?.wins ?? runs.filter(run => run.victory).length
    };
  };
  window.pbCreateMenuCompanion = () => {
    const data = window.pbMenuCompanionData();
    if (!data) return null;
    const look = rO(app.meta.profile.skins, data.id);
    const sprite=look ? vO(data.id, look.look, 4, `idle`, look.member) : jO(data.id, 4, `idle`);
    sprite.__pbGround=true;
    return sprite;
  };

  window.pbAndroidMenuKey = command => {
    if (!pbInMenu(app) || pbMenuEditing() || ss) return false;
    ts(true);
    document.documentElement.classList.add(`pad-menu`);
    if ([`up`, `down`, `left`, `right`].includes(command)) {
      const target = pbMenuTarget();
      if (target) { js(target); Ds(command); }
    } else if (command === `confirm`) {
      const target = pbMenuTarget();
      if (target) { js(target); Bs(target); }
    } else if (command === `back`) {
      Vs(`Escape`);
    } else if (command === `previousTab` || command === `nextTab`) {
      Hs(command === `nextTab` ? 1 : -1);
    } else return false;
    pbAndroidSyncMenu(app);
    return true;
  };
  window.addEventListener(`keydown`, event => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const command = {ArrowUp:`up`, ArrowDown:`down`, ArrowLeft:`left`, ArrowRight:`right`, Enter:`confirm`}[event.key];
    if (command && window.pbAndroidMenuKey(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  pbAndroidSyncMenu(app);
}
// Local trainer identity and the three original animated title scenes.
function pbReadMenuBackground() {
  try { const value=localStorage.getItem(`pb-menu-background`); return [`pond`,`halloween`,`johto`].includes(value)?value:`pond`; }
  catch { return `pond`; }
}
function pbSyncMenuBackground(app, settings) {
  if (!settings) return;
  const value=[`pond`,`halloween`,`johto`].includes(settings.menuBackground)?settings.menuBackground:`pond`;
  if (pbReadMenuBackground()!==value) {
    try { localStorage.setItem(`pb-menu-background`,value); } catch {}
    if(app.menuScene)app.menuScene.spookyT=0;
  }
}
function pbMenuBackgroundRow(app,onChange) {
  const es=document.documentElement.lang===`es`;
  const row=X(`div`,{class:`st-row segrow wide jay-background-row`});
  const label=X(`span`,{},(window.pbT||(k=>k))(`menuBg`),X(`small`,{},(window.pbT||(k=>k))(`menuBgSub`)));
  const choices=X(`div`,{class:`seg jay-background-choices`});
  const refresh=()=>{
    choices.replaceChildren(...[[`pond`,(window.pbT||(k=>k))(`pond`)],[`halloween`,`Halloween`],[`johto`,`Johto`]].map(([id,name])=>{
      const selected=(app.meta.profile.settings.menuBackground??`pond`)===id;
      return X(`button`,{class:`pill`+(selected?` on`:``),type:`button`,"aria-pressed":String(selected),"data-background":id,onclick:()=>{
        app.meta.profile.settings.menuBackground=id;
        pbSyncMenuBackground(app,app.meta.profile.settings);
        if(onChange)onChange();else app.meta.save();
        refresh();
      }},name);
    }));
  };
  refresh();row.append(label,choices,X(`span`));return row;
}
function pbInstallLocalPreferences(app) {
  window.pbLocalTrainerName=()=>app.meta?.profile?.name??null;
  window.pbSaveTrainerName=async value=>{
    if(app.backend.kind!==`local`||!app.meta?.profile)return false;
    const name=String(value??``).normalize(`NFC`).trim().replace(/\s+/g,` `);
    const es=document.documentElement.lang===`es`;
    if(!name||Array.from(name).length>24){app.notice((window.pbT||(k=>k))(`nameLength`));return false;}
    try {
      const account=await app.backend.renameAccount(app.meta.account,name);
      app.meta.account=account;app.meta.profile.name=name;
      for(const heading of document.querySelectorAll(`.pf-id>h2`))heading.textContent=name;
      for(const heading of document.querySelectorAll(`.tr-tx>b`))heading.textContent=name;
      window.dispatchEvent(new Event(`pb-trainer-renamed`));
      app.notice((window.pbT||(k=>k))(`nameSaved`,{name}));
      return true;
    } catch(error) {app.notice(String(error.message??error));return false;}
  };
  window.pbEditTrainerName=()=>{
    const current=window.pbLocalTrainerName();if(current==null)return;
    const es=document.documentElement.lang===`es`;
    if(typeof window.AndroidMenu?.editTrainerNameText===`function`)window.AndroidMenu.editTrainerNameText(current,(window.pbT||(k=>k))(`trainerName`),(window.pbT||(k=>k))(`save`),(window.pbT||(k=>k))(`cancel`),(window.pbT||(k=>k))(`enterName`));
    else if(typeof window.AndroidMenu?.editTrainerName===`function`)window.AndroidMenu.editTrainerName(current,es);
    else {const name=window.prompt((window.pbT||(k=>k))(`trainerName`),current);if(name!==null)window.pbSaveTrainerName(name);}
  };
}
function pbReadMenuMusic() {
  try {const value=localStorage.getItem(`pb-menu-music`);return [`auto`,`menu`,`halloween-menu`].includes(value)?value:`auto`;}catch{return `auto`;}
}
function pbSyncMenuMusic(app,settings) {
  if(!settings)return;
  const value=[`auto`,`menu`,`halloween-menu`].includes(settings.menuMusic)?settings.menuMusic:`auto`;
  if(pbReadMenuMusic()!==value){
    try{localStorage.setItem(`pb-menu-music`,value);}catch{}
    if(!app.run&&N.running)N.playTrack(yq());
  }
}
function pbMenuMusicRow(app,onChange) {
  const es=document.documentElement.lang===`es`;
  const row=X(`div`,{class:`st-row segrow wide jay-music-row`});
  const label=X(`span`,{},(window.pbT||(k=>k))(`menuMusic`),X(`small`,{},(window.pbT||(k=>k))(`menuMusicSub`)));
  const choices=X(`div`,{class:`seg jay-music-choices`});
  const refresh=()=>choices.replaceChildren(...[[`auto`,(window.pbT||(k=>k))(`auto`)],[`menu`,(window.pbT||(k=>k))(`normal`)],[`halloween-menu`,`Halloween`]].map(([id,name])=>X(`button`,{type:`button`,class:`pill`+((app.meta.profile.settings.menuMusic??`auto`)===id?` on`:``),"aria-pressed":String((app.meta.profile.settings.menuMusic??`auto`)===id),"data-menu-music":id,onclick:()=>{app.meta.profile.settings.menuMusic=id;pbSyncMenuMusic(app,app.meta.profile.settings);if(onChange)onChange();else app.meta.save();refresh();}},name)));
  refresh();row.append(label,choices,X(`span`));return row;
}
