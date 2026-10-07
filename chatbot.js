(() => {
  'use strict';
  const API_BASE=(localStorage.getItem('fixit_api_base')||'https://fixit-salone-api.onrender.com').replace(/\/$/,'');
  const messages=[];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const send=async()=>{
    const input=document.getElementById('fixitChatInput');
    const sendBtn=document.getElementById('fixitChatSend');
    const text=input.value.trim();
    if(!text||sendBtn.disabled)return;
    addMessage('user',text);
    input.value=''; sendBtn.disabled=true; input.focus();
    const typing=addMessage('assistant','Thinking…',true);
    try{
      const response=await fetch(API_BASE+'/api/support/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:text,history:messages.slice(-10).map(x=>({role:x.role,content:x.content}))})
      });
      const data=await response.json().catch(()=>({}));
      typing.remove();
      if(!response.ok) throw new Error(data.error||'Unable to contact support assistant.');
      addMessage('assistant',data.reply);
    }catch(e){
      typing.remove();
      addMessage('assistant','I’m sorry, I could not connect right now. Please email <a href="mailto:kamarajoseph247@gmail.com">kamarajoseph247@gmail.com</a> or call/WhatsApp <a href="tel:+23231864040">+232 31 864040</a>.');
    }finally{sendBtn.disabled=false;}
  };
  const addMessage=(role,text,temporary=false)=>{
    const box=document.getElementById('fixitChatMessages');
    const item=document.createElement('div');
    item.className='fixit-chat-message '+role+(temporary?' typing':'');
    item.innerHTML=role==='assistant'?text:esc(text);
    box.appendChild(item); box.scrollTop=box.scrollHeight;
    if(!temporary)messages.push({role,content:String(text).replace(/<[^>]+>/g,'')});
    return item;
  };
  const open=()=>{
    document.getElementById('fixitChatWindow').hidden=false;
    document.getElementById('fixitChatButton').setAttribute('aria-expanded','true');
    document.getElementById('fixitChatInput').focus();
  };
  const close=()=>{
    document.getElementById('fixitChatWindow').hidden=true;
    document.getElementById('fixitChatButton').setAttribute('aria-expanded','false');
  };
  window.fixitSupportChat=()=>{const w=document.getElementById('fixitChatWindow'); w.hidden?open():close();};
  document.addEventListener('DOMContentLoaded',()=>{
    const sendBtn=document.getElementById('fixitChatSend'),input=document.getElementById('fixitChatInput');
    if(!sendBtn||!input)return;
    document.getElementById('fixitChatButton').onclick=window.fixitSupportChat;
    document.getElementById('fixitChatClose').onclick=close;
    sendBtn.onclick=send;
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    document.querySelectorAll('[data-support-question]').forEach(btn=>btn.onclick=()=>{input.value=btn.dataset.supportQuestion;send();});
    addMessage('assistant','Hi! 👋 I’m the <strong>FixIt Salone Support Assistant</strong>.<br>How can I help you today?');
  });
})();