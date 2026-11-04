/* Add an editable name to the existing local trainer profile. */
(() => {
  const add=()=>{
    for(const card of document.querySelectorAll('.pf-id')){
      if(card.querySelector('.jay-name-edit')||window.pbLocalTrainerName?.()==null)continue;
      const button=document.createElement('button');button.type='button';button.className='pill jay-name-edit';
      button.textContent=(window.pbT||(k=>k))('editName');
      button.addEventListener('click',()=>window.pbEditTrainerName?.());
      card.querySelector('h2')?.insertAdjacentElement('afterend',button);
    }
  };
  let queued=false;
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;add()})}};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});schedule();
})();
