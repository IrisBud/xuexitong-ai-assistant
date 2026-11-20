(() => {
  'use strict';
  const fan=document.querySelector('[data-fan]');
  if(fan){
    const cards=[...fan.querySelectorAll('.fan-card')],caption=document.querySelector('[data-fan-caption]');
    const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)'),narrow=matchMedia('(max-width: 680px)');
    let keyboard=false;
    const select=(card,active=true)=>{
      cards.forEach((item,index)=>{
        item.classList.toggle('is-active',active&&item===card);
        const angle=Number(item.dataset.angle);
        item.style.transform=`rotate(${angle}deg)${active&&item===card&&!reduce.matches&&!narrow.matches?' translateY(-44px) scale(1.045)':''}`;
        item.style.zIndex=active&&item===card?'20':!active&&item.classList.contains('is-selected')?'10':String(index+1);
      });
      if(caption)caption.textContent=active&&card?card.getAttribute('aria-label'):'选一张卡片，打开对应教程。';
    };
    document.addEventListener('keydown',event=>{if(event.key==='Tab'){keyboard=true;fan.dataset.keyboard='true';}});
    document.addEventListener('pointerdown',()=>{keyboard=false;fan.dataset.keyboard='false';});
    cards.forEach(card=>{
      card.addEventListener('pointerenter',()=>{if(fine.matches&&!keyboard)select(card);});
      card.addEventListener('focus',()=>select(card));
      card.addEventListener('blur',()=>{if(!fan.contains(document.activeElement))select(null,false);});
    });
    fan.addEventListener('pointerleave',()=>{if(!fan.contains(document.activeElement))select(null,false);});
    fan.addEventListener('focusout',event=>{if(!fan.contains(event.relatedTarget))select(null,false);});
    reduce.addEventListener('change',()=>select(null,false));
    narrow.addEventListener('change',()=>select(null,false));
  }
  const input=document.querySelector('#guide-search'),form=document.querySelector('.search-form');
  if(input&&form){
    const results=document.querySelector('[data-search-results]'),status=document.querySelector('[data-search-status]'),index=document.querySelector('[data-guide-index]');
    let entries=null,pending=null,serial=0;
    const normalize=value=>value.toLowerCase().replace(/\s+/g,'');
    const load=()=>pending||(pending=fetch('assets/search-index.json').then(response=>{if(!response.ok)throw Error('Search index unavailable');return response.json();}).then(value=>entries=value));
    const search=async()=>{
      const own=++serial,query=input.value.trim();results.replaceChildren();
      if(!query){results.hidden=true;index.hidden=false;status.textContent='';return;}
      status.textContent='正在查找教程…';
      try{
        const data=entries||await load();if(own!==serial)return;
        const terms=query.split(/\s+/).filter(Boolean),matches=data.filter(entry=>terms.every(term=>normalize(entry.title+' '+entry.summary+' '+entry.keywords.join(' ')+' '+entry.text).includes(normalize(term))));
        index.hidden=matches.length>0;results.hidden=false;status.textContent=matches.length?`找到 ${matches.length} 篇相关教程`:'没有找到匹配的教程，下面的目录仍可直接打开。';
        for(const entry of matches){const link=document.createElement('a');link.className='search-result';link.href=`guides/${entry.id}.html`;const title=document.createElement('strong');title.textContent=entry.title;const summary=document.createElement('p');summary.textContent=entry.summary;link.append(title,summary);results.append(link);}
      }catch{if(own!==serial)return;results.hidden=true;index.hidden=false;status.textContent='搜索暂时加载失败。可以直接打开下面的教程，或刷新后重试。';pending=null;}
    };
    input.addEventListener('input',search);
    form.addEventListener('submit',event=>{event.preventDefault();search();});
    document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,[contenteditable]')){event.preventDefault();input.focus({preventScroll:true});input.scrollIntoView({block:'center',behavior:'instant'});}});
    const query=new URLSearchParams(location.search).get('q');if(query){input.value=query;search();}
  }
  const toc=[...document.querySelectorAll('.article-toc a')];
  if(toc.length&&typeof IntersectionObserver==='function'){
    const observer=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting)for(const link of toc)link.setAttribute('aria-current',String(link.hash==='#'+item.target.id));},{rootMargin:'-15% 0px -65% 0px'});
    document.querySelectorAll('.article-body section[id]').forEach(section=>observer.observe(section));
  }
})();
