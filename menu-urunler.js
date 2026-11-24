(()=>{const menu=document.querySelector('.menu-products-enhanced');document.querySelector('.mega-close').addEventListener('click',()=>{menu.open=false;menu.querySelector('summary').focus()});let timer;const fine=matchMedia('(hover:hover) and (pointer:fine)');menu.querySelector('summary').addEventListener('pointerenter',()=>{if(fine.matches){clearTimeout(timer);timer=setTimeout(()=>menu.open=true,200)}});function scheduleClose(event){if(event.pointerType==='touch'||!fine.matches)return;clearTimeout(timer);timer=setTimeout(()=>{menu.open=false},160)}
menu.addEventListener('pointerleave',scheduleClose);
menu.addEventListener('pointerenter',()=>clearTimeout(timer));
const panel=menu.querySelector('.mega-proposal');
panel.addEventListener('pointerenter',()=>clearTimeout(timer));
panel.addEventListener('pointerleave',event=>{if(event.relatedTarget&&menu.contains(event.relatedTarget))return;scheduleClose(event)});
menu.addEventListener('focusin',()=>clearTimeout(timer));})();