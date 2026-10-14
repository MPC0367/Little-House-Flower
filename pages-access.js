(function(){
  'use strict';
  const BASE='/Little-House-Flower/',SW=new URL(BASE+'pages-sw.js',location.origin).href;
  window.LHF_PAGES_APP=true;
  window.LHF_SHARE_CONTEXT={customerURL:BASE,studioURL:BASE+'studio/'};
  document.documentElement.classList.add('pages-locked');
  const text={
    preparing:['Preparing your demo…','กำลังเตรียมเดโม กรุณารอสักครู่'],
    checking:['Checking access…','กำลังตรวจสอบสิทธิ์เข้าใช้งาน'],
    wrong:['The password is incorrect. Please try again.','รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง'],
    network:['We could not reach the demo. Check your connection and try again.','เชื่อมต่อเดโมไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'],
    busy:['Too many attempts. Please wait a minute and try again.','ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'],
    browser:['This browser could not prepare the demo. Try refreshing or opening a regular Safari or Chrome window.','เบราว์เซอร์ยังไม่พร้อมใช้งานเดโม ลองรีเฟรช หรือเปิดด้วย Safari หรือ Chrome ในหน้าต่างปกติ'],
    loading:['Opening your demo…','กำลังเปิดเดโม']
  };
  let panel,form,input,button,status,retry,controlled=false,loaded=false,busy=false;
  function element(tag,className,content){const node=document.createElement(tag);if(className)node.className=className;if(content)node.textContent=content;return node;}
  function statusMessage(key,isError=false){status.replaceChildren();if(key)for(const [index,message]of text[key].entries()){const line=element('span','',message);if(index)line.lang='th';status.append(line);}status.classList.toggle('is-error',isError);}
  function setBusy(value){busy=value;button.disabled=value||!controlled;input.disabled=value;form.setAttribute('aria-busy',String(value));retry.disabled=value;}
  function mount(){
    panel=element('section','pages-access');panel.id='pages-access';panel.setAttribute('aria-labelledby','pages-access-title');
    const card=element('div','pages-access-card'),logo=element('img','pages-access-logo');logo.src=BASE+'img/original-logo.jpg';logo.alt='';logo.width=80;logo.height=80;
    const eyebrow=element('p','pages-access-eyebrow','CLIENT DEMO · เดโมสำหรับลูกค้า'),title=element('h1','','Little House Flower');title.id='pages-access-title';
    const intro=element('p','pages-access-intro'),english=element('span','','A little preview of the shop and studio.'),thai=element('span','','ทดลองใช้งานหน้าร้านและระบบหลังบ้านได้ที่นี่');thai.lang='th';intro.append(english,thai);
    form=element('form','pages-access-form');form.autocomplete='on';
    const label=element('label','pages-access-label');label.htmlFor='pages-demo-password';label.append(element('span','','Demo password'));
    const labelThai=element('span','','รหัสผ่านสำหรับเดโม');labelThai.lang='th';label.append(labelThai);
    input=element('input','pages-access-input');input.id='pages-demo-password';input.name='demo-password';input.type='password';input.autocomplete='current-password';input.required=true;input.maxLength=256;input.setAttribute('aria-label','Demo password');input.setAttribute('aria-describedby','pages-access-status');
    button=element('button','pages-access-submit');button.type='submit';button.setAttribute('aria-label','Open demo');button.append(element('span','','Open demo'));const buttonThai=element('span','','เข้าสู่เดโม');buttonThai.lang='th';buttonThai.setAttribute('aria-hidden','true');button.append(buttonThai);
    status=element('p','pages-access-status');status.id='pages-access-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    retry=element('button','pages-access-retry','Try again · ลองอีกครั้ง');retry.type='button';retry.hidden=true;retry.addEventListener('click',()=>void initialize());
    const note=element('p','pages-access-note');note.append(element('span','','Sample orders only. Nothing is sent to the shop.'));const noteThai=element('span','','ออเดอร์ในเดโมเป็นข้อมูลตัวอย่าง ไม่มีการส่งคำสั่งซื้อถึงร้าน');noteThai.lang='th';note.append(noteThai);
    form.append(label,input,button);card.append(logo,eyebrow,title,intro,form,status,retry,note);panel.append(card);document.body.append(panel);
    form.addEventListener('submit',event=>{event.preventDefault();if(!busy&&controlled)void signIn();});
    form.hidden=true;setBusy(true);statusMessage('preparing');
  }
  function isControlled(){return navigator.serviceWorker.controller?.scriptURL===SW;}
  async function prepareWorker(){
    if(!('serviceWorker'in navigator)||!window.isSecureContext)throw new Error('Service workers unavailable');
    const baseURL=new URL(BASE,location.origin).href;
    for(const registration of await navigator.serviceWorker.getRegistrations()){
      if(registration.scope===baseURL+'studio/'&&registration.active?.scriptURL!==SW)await registration.unregister();
    }
    const registration=await navigator.serviceWorker.register(SW,{scope:BASE,updateViaCache:'none'});
    if(isControlled())return;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(new Error('Service worker did not take control'));},20000);
      const cleanup=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);};
      const changed=()=>{if(isControlled()){cleanup();resolve();}};
      navigator.serviceWorker.addEventListener('controllerchange',changed);
      const claim=()=>{registration.active?.postMessage({type:'LHF_PAGES_CLAIM'});changed();};
      if(registration.installing)registration.installing.addEventListener('statechange',claim);
      if(registration.waiting)registration.waiting.addEventListener('statechange',claim);
      claim();
    });
  }
  async function api(path,body){
    return fetch(BASE+'api/'+path,{method:body?'POST':'GET',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json','X-CSRF':'local-preview'},...(body?{body:JSON.stringify(body)}:{})});
  }
  function loadScript(path,type){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=BASE+path;if(type)script.type=type;script.onload=resolve;script.onerror=()=>reject(new Error('App script unavailable'));document.head.append(script);});}
  async function openApp(){
    statusMessage('loading');setBusy(true);
    try{
      if(!loaded){
        if(location.pathname.startsWith(BASE+'studio/')){await loadScript('studio/admin.mjs','module');await loadScript('studio/app-shell.mjs','module');}
        else await loadScript('storefront.js');
        loaded=true;
      }
      document.documentElement.classList.remove('pages-locked');panel.remove();
    }catch{statusMessage('network',true);retry.hidden=false;setBusy(false);}
  }
  async function signIn(){
    const password=input.value;if(!password)return;
    retry.hidden=true;statusMessage('checking');setBusy(true);
    try{
      const response=await api('demo-login',{password});input.value='';
      if(response.ok){await openApp();return;}
      statusMessage(response.status===401||response.status===403?'wrong':response.status===429?'busy':'network',true);
    }catch{statusMessage('network',true);}finally{if(!loaded){setBusy(false);input.focus();}}
  }
  async function initialize(){
    retry.hidden=true;form.hidden=true;statusMessage('preparing');setBusy(true);
    try{await prepareWorker();controlled=true;}catch{statusMessage('browser',true);retry.hidden=false;setBusy(false);return;}
    try{
      const response=await api('health');
      if(response.ok){await openApp();return;}
      form.hidden=false;statusMessage(response.status===401||response.status===403?null:response.status===429?'busy':'network',response.status!==401);
    }catch{form.hidden=false;statusMessage('network',true);}
    setBusy(false);input.focus();
  }
  const start=()=>{mount();void initialize();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
