(()=>{'use strict';
const $=id=>document.getElementById(id);
const tokenKey='fixit_admin_token',apiKey='fixit_api_base';
let API=(localStorage.getItem(apiKey)||'https://fixit-salone-api.onrender.com').replace(/\\/$/,'');
const token=()=>sessionStorage.getItem(tokenKey);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function msg(t){$('loginMessage').textContent=t}
async function api(path,opts){
 const o=opts||{};o.headers=Object.assign({'Content-Type':'application/json'},o.headers||{});
 if(token())o.headers.Authorization='Bearer '+token();
 const r=await fetch(API+path,o);let d={};try{d=await r.json()}catch{}
 if(!r.ok)throw new Error(d.error||'Request failed');
 return d;
}
async function boot(){
 if(!token()){ $('loginPanel').hidden=false;$('dashboard').hidden=true;return }
 try{
  const me=await api('/api/auth/me');
  if(me.user.role!=='admin')throw new Error('This account is not an admin.');
  $('loginPanel').hidden=true;$('dashboard').hidden=false;
  $('sessionUser').textContent=me.user.full_name+' · ADMIN';
  await loadStats();
  render('incidents');
 }catch(e){sessionStorage.removeItem(tokenKey);$('loginPanel').hidden=false;$('dashboard').hidden=true;msg(e.message)}
}
async function loadStats(){
 const [inc,ver,users,subpay,payments]=await Promise.all([api('/api/admin/incidents'),api('/api/admin/verifications'),api('/api/admin/users'),api('/api/admin/subscription-payments'),api('/api/admin/payments')]);
 $('openReports').textContent=inc.filter(x=>x.status==='open').length;
 $('verificationQueue').textContent=ver.filter(x=>['pending','under_review'].includes(x.status)).length;
 $('activeUsers').textContent=users.filter(x=>x.status==='active').length;
 $('suspendedUsers').textContent=users.filter(x=>x.status==='suspended'||x.status==='banned').length;
 $('pendingSubscriptions').textContent=subpay.filter(x=>x.status==='pending'||x.status==='processing').length;
 $('paymentRecords').textContent=payments.length;
}
async function render(tab){
 const content=$('adminContent');content.innerHTML='<p>Loading…</p>';
 try{
  let rows=await api('/api/admin/'+(tab==='verification'?'verifications':tab));
  let head='',body='';
  if(tab==='incidents'){
   head='<th>ID</th><th>Reason</th><th>Details</th><th>Priority</th><th>Status</th><th>Action</th>';
   body=rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.reason)+'</td><td>'+esc(r.details)+'</td><td>'+esc(r.priority)+'</td><td>'+esc(r.status)+'</td><td><button class="table-btn" data-incident="'+esc(r.id)+'">Review</button></td></tr>').join('');
  }else if(tab==='verification'){
   head='<th>ID</th><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th>Document</th><th>Files</th><th>Action</th>';
   body=rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.full_name)+'</td><td>'+esc(r.role)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.document_type)+'</td><td>'+((r.document_available?'<button class="table-btn" data-ver-file="'+esc(r.id)+'" data-file-type="document">View ID</button> ':'')+(r.selfie_available?'<button class="table-btn" data-ver-file="'+esc(r.id)+'" data-file-type="selfie">View selfie</button>':''))+'</td><td><button class="table-btn" data-ver="'+esc(r.id)+'">Review</button></td></tr>').join('');
  }else if(tab==='users'){
   head='<th>ID</th><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th>';
   body=rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.full_name)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.role)+'</td><td>'+esc(r.status)+'</td><td><button class="table-btn" data-user="'+esc(r.id)+'">Change status</button></td></tr>').join('');
  }else if(tab==='subscriptions'){
   head='<th>Provider</th><th>Plan</th><th>Status</th><th>Starts</th><th>Expires</th>';
   body=rows.map(r=>'<tr><td><b>'+esc(r.business_name||'')+'</b><br><small>'+esc(r.provider_name||'')+' · '+esc(r.provider_phone||'')+'</small></td><td>'+esc(r.plan_name)+'</td><td>'+esc(r.status)+'</td><td>'+esc(new Date(r.starts_at).toLocaleDateString())+'</td><td>'+esc(new Date(r.expires_at).toLocaleDateString())+'</td></tr>').join('');
  }else if(tab==='subscription-payments'){
   head='<th>Provider</th><th>Plan</th><th>Amount</th><th>Status</th><th>Gateway</th><th>Reference</th><th>Action</th>';
   body=rows.map(r=>'<tr><td><b>'+esc(r.business_name||'')+'</b><br><small>'+esc(r.provider_name||'')+' · '+esc(r.provider_phone||'')+'</small></td><td>'+esc(r.plan_name)+'</td><td>SLE '+Number(r.amount_sle).toLocaleString()+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.gateway)+'</td><td>'+esc(r.provider_reference||'—')+'</td><td>'+((r.status==='pending'||r.status==='processing')?'<button class="table-btn" data-subpay="'+esc(r.id)+'">Review</button>':'—')+'</td></tr>').join('');
  }else if(tab==='payments'){
   head='<th>Customer</th><th>Provider</th><th>Amount</th><th>Fee</th><th>Earnings</th><th>Gateway</th><th>Status</th>';
   body=rows.map(r=>'<tr><td>'+esc(r.customer_name||'')+'<br><small>'+esc(r.customer_phone||'')+'</small></td><td>'+esc(r.business_name||'—')+'</td><td>SLE '+Number(r.amount_sle).toLocaleString()+'</td><td>SLE '+Number(r.platform_fee||0).toLocaleString()+'</td><td>SLE '+Number(r.provider_earnings||0).toLocaleString()+'</td><td>'+esc(r.gateway)+'</td><td>'+esc(r.status)+'</td></tr>').join('');
  }else{
   rows=await api('/api/admin/audit');head='<th>Time</th><th>Action</th><th>Actor</th><th>Entity</th><th>Metadata</th>';
   body=rows.map(r=>'<tr><td>'+esc(new Date(r.created_at).toLocaleString())+'</td><td>'+esc(r.action)+'</td><td>'+esc(r.actor_name||'System')+'</td><td>'+esc(r.entity_type)+' '+esc(r.entity_id||'')+'</td><td><code>'+esc(JSON.stringify(r.metadata))+'</code></td></tr>').join('');
  }
  content.innerHTML='<div class="admin-section-head"><div><h2>'+esc({incidents:'Incident reports',verification:'Verification queue',users:'User accounts',subscriptions:'Active subscriptions', 'subscription-payments':'Subscription payment requests',payments:'Job payment records',audit:'Audit history'}[tab])+'</h2><p>Protected live records.</p></div><span>'+rows.length+' records</span></div><div class="table-wrap"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  content.querySelectorAll('[data-incident]').forEach(b=>b.onclick=async()=>{const id=b.dataset.incident;const status=prompt('Status: open, under_review, resolved or dismissed');if(!status)return;try{await api('/api/admin/incidents/'+id,{method:'PATCH',body:JSON.stringify({status})});await loadStats();render('incidents')}catch(e){alert(e.message)}});
  content.querySelectorAll('[data-ver]').forEach(b=>b.onclick=async()=>{const status=prompt('Verification: pending, under_review, verified or rejected');if(!status)return;try{await api('/api/admin/verifications/'+b.dataset.ver,{method:'PATCH',body:JSON.stringify({status})});await loadStats();render('verification')}catch(e){alert(e.message)}});
  content.querySelectorAll('[data-ver-file]').forEach(b=>b.onclick=async()=>{
    try{
      const r=await fetch(API+'/api/admin/verifications/'+encodeURIComponent(b.dataset.verFile)+'/file?type='+encodeURIComponent(b.dataset.fileType),{headers:{Authorization:'Bearer '+token()}});
      if(!r.ok){let d={};try{d=await r.json()}catch{};throw new Error(d.error||'Unable to open file.')}
      const blob=await r.blob(),url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){alert(e.message)}
  });
  content.querySelectorAll('[data-user]').forEach(b=>b.onclick=async()=>{const status=prompt('Account status: active, under_review, suspended or banned');if(!status)return;try{await api('/api/admin/users/'+b.dataset.user+'/status',{method:'PATCH',body:JSON.stringify({status})});await loadStats();render('users')}catch(e){alert(e.message)}});
  content.querySelectorAll('[data-subpay]').forEach(b=>b.onclick=async()=>{
    const status=prompt('Status: paid, failed or cancelled');
    if(!status)return;
    if(status==='paid' && !confirm('Confirm that the provider payment was received outside FixIt Salone. This will activate the selected subscription.'))return;
    const reference=prompt('Payment reference (optional):')||'';
    const duration=status==='paid'?(prompt('Subscription duration in months (1-12):','1')||'1'):'1';
    try{
      await api('/api/admin/subscription-payments/'+encodeURIComponent(b.dataset.subpay),{method:'PATCH',body:JSON.stringify({status,provider_reference:reference,duration_months:Number(duration)})});
      await loadStats();render('subscription-payments');
    }catch(e){alert(e.message)}
  });
 }catch(e){content.innerHTML='<p class="form-message">'+esc(e.message)+'</p>'}
}
$('adminLoginForm').onsubmit=async e=>{e.preventDefault();API=($('apiBase').value.trim()||window.location.origin).replace(/\\/$/,'');localStorage.setItem(apiKey,API);msg('Signing in…');try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({phone:$('loginPhone').value.trim(),password:$('loginPassword').value})});if(d.user.role!=='admin')throw new Error('Login succeeded, but this account is not an admin.');sessionStorage.setItem(tokenKey,d.token);$('loginPassword').value='';msg('');boot()}catch(e){msg(e.message)}};
$('logoutBtn').onclick=()=>{sessionStorage.removeItem(tokenKey);boot()};
document.querySelectorAll('.admin-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.tab)});
boot();
})();