(() => {
'use strict';
const API_BASE=(localStorage.getItem('fixit_api_base')||'https://fixit-salone-api.onrender.com').replace(/\/$/,'');
const AUTH_TOKEN_KEY='fixit_access_token';
function authToken(){return sessionStorage.getItem(AUTH_TOKEN_KEY)||'';}
async function api(path,options={}){
  const headers=Object.assign({},options.headers||{});
  if(options.body && !headers['Content-Type']) headers['Content-Type']='application/json';
  if(authToken()) headers.Authorization='Bearer '+authToken();
  const res=await fetch(API_BASE+path,Object.assign({},options,{headers}));
  let data={}; try{data=await res.json()}catch{}
  if(!res.ok) throw new Error(data.error||'Something went wrong. Please try again.');
  return data;
}
function saveAuth(data){
  sessionStorage.setItem(AUTH_TOKEN_KEY,data.token);
  localStorage.setItem('fixit_customer',JSON.stringify({id:data.user.id,name:data.user.full_name,phone:data.user.phone,role:data.user.role}));
}
function clearAuth(){
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('fixit_customer');
  localStorage.removeItem('fixit_phone_verified');
}
const providers=[
{name:'Kamara Electricals',service:'Electrical',region:'Western Area',district:'Western Area Urban',area:'Lumley',address:'Lumley, Freetown',price:'From SLE 250',rating:'4.9',reviews:28,initials:'KE',plan:'Pro',featured:true,completed:127,completion:'98%',verified:true,desc:'Wiring, installations, repairs and troubleshooting.'},
{name:"Joe's Plumbing",service:'Plumbing',region:'Western Area',district:'Western Area Urban',area:'Aberdeen',address:'Aberdeen, Freetown',price:'From SLE 200',rating:'4.8',reviews:19,initials:'JP',plan:'Free',featured:false,completed:43,completion:'96%',verified:true,desc:'Leaks, pipes, bathroom fittings and emergency plumbing.'},
{name:'AM Tech Solutions',service:'IT & Computer',region:'Western Area',district:'Western Area Rural',area:'Hill Station',address:'Hill Station, Freetown',price:'From SLE 300',rating:'4.9',reviews:34,initials:'AT',plan:'Business',featured:true,completed:214,completion:'99%',verified:true,desc:'Computer repair, networking, software and technology support.'},
{name:'Clean Salone',service:'Cleaning',region:'Western Area',district:'Western Area Urban',area:'Central Freetown',address:'Freetown',price:'From SLE 180',rating:'4.7',reviews:16,initials:'CS',plan:'Free',featured:false,completed:31,completion:'94%',verified:false,desc:'Home, office and move-in cleaning services.'},
{name:'Mobile Doctor SL',service:'Phone Repair',region:'Western Area',district:'Western Area Urban',area:'Congo Town',address:'Congo Town, Freetown',price:'From SLE 150',rating:'4.8',reviews:22,initials:'MD',plan:'Pro',featured:false,completed:89,completion:'97%',verified:true,desc:'Screen, battery, charging-port and software repairs.'},
{name:'Bai Motors',service:'Auto Repair',region:'Southern',district:'Bo',area:'Bo Town',address:'Bo, Sierra Leone',price:'From SLE 350',rating:'4.6',reviews:13,initials:'BM',plan:'Free',featured:false,completed:27,completion:'92%',verified:false,desc:'Diagnostics, servicing, brakes and general vehicle repairs.'}
];
const categories=[['🔧','Plumbing','Leaks & pipes'],['⚡','Electrical','Wiring & installs'],['🧹','Cleaning','Home & office'],['📱','Phone Repair','Devices & screens'],['💻','IT & Computer','Tech support'],['🚗','Auto Repair','Mechanics'],['💇','Beauty','Barbers & stylists'],['🏠','Construction','Building & painting']];
const districts={'Western Area':['Western Area Urban','Western Area Rural'],'Eastern':['Kailahun','Kenema','Kono'],'Northern':['Bombali','Falaba','Koinadugu','Tonkolili'],'North West':['Kambia','Karene','Port Loko'],'Southern':['Bo','Bonthe','Moyamba','Pujehun']};
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const modal=$('modal'),body=$('modalBody');
let liveProviders=[];
let visibleProviders=[];
async function loadLiveProviders(){
  try{
    const params=new URLSearchParams();
    const q=$('search').value.trim();
    const r=$('region').value;
    const d=$('district').value;
    if(q)params.set('service',q);
    if(r&&r!=='All regions')params.set('region',r);
    if(d)params.set('district',d);
    const rows=await api('/api/providers?'+params.toString());
    liveProviders=rows.map(x=>({
      id:x.id,userId:x.user_id,name:x.business_name||x.full_name,service:x.service_name,serviceId:x.service_id,
      region:x.region,district:x.district,area:x.area,address:x.service_address,
      price:x.price_sle!=null?('SLE '+Number(x.price_sle).toLocaleString()):'Quote required',
      rating:'—',reviews:0,initials:(x.business_name||x.full_name||'FI').split(/\\s+/).map(v=>v[0]).slice(0,2).join('').toUpperCase(),
      plan:'Free',featured:false,completed:0,completion:'—',verified:x.verification_status==='verified',
      desc:x.service_description||'Local FixIt Salone service provider.',pricingType:x.pricing_type
    }));
    return true;
  }catch(e){
    liveProviders=[];
    return false;
  }
}
function activeProviders(){return liveProviders.length?liveProviders:providers}
function openModal(html){body.innerHTML=html;modal.hidden=false} function closeModal(){modal.hidden=true} window.closeModal=closeModal;
function updateDistricts(){const r=$('region').value,d=$('district'),list=districts[r]||[];d.innerHTML='<option value="">All districts</option>'+list.map(x=>'<option>'+esc(x)+'</option>').join('');d.disabled=!list.length;render()}window.updateDistricts=updateDistricts;
async function render(){
  const ok=await loadLiveProviders();
  const source=activeProviders();
  const q=$('search').value.trim().toLowerCase(),r=$('region').value,d=$('district').value;
  const list=source.filter(p=>(!q||Object.values(p).join(' ').toLowerCase().includes(q))&&(r==='All regions'||p.region===r)&&(!d||p.district===d));
  visibleProviders=list;
  $('count').textContent=list.length+' provider'+(list.length===1?'':'s')+' found'+(ok?'':' · demo data');
  $('providerGrid').innerHTML=list.map((p,i)=>'<article class="card">'+(p.featured?'<div class="featured-badge">⭐ Featured</div>':'')+'<div class="top"><div class="avatar">'+esc(p.initials)+'</div><div><h3>'+esc(p.name)+'</h3><div class="meta">'+esc(p.service)+' · '+esc(p.region)+' · '+esc(p.district)+'</div><div class="stars">'+(p.rating==='—'?'':'★★★★★ ')+'<span class="meta">'+esc(p.rating)+(p.reviews?' ('+p.reviews+')':'')+'</span></div></div></div><div class="price">'+esc(p.price)+'</div><div class="desc">'+esc(p.desc)+'</div><div class="meta">📍 '+esc(p.address||p.area)+'</div><div class="trust-line">'+(p.verified?'<span class="verified-badge" title="Verified provider"><span class="verified-check">✓</span> Verified</span>':'')+' · '+esc(String(p.completed))+' jobs · '+esc(p.completion)+' completion</div><div class="actions"><button class="profile-btn" data-index="'+i+'">View profile</button><button class="request-btn" data-index="'+i+'">Request</button></div></article>').join('')||'<div class="card"><h3>No providers found</h3><p class="desc">'+(ok?'No live providers match your search yet.':'The live marketplace could not be reached. Demo providers are available when no live data is returned.')+'</p></div>';
}
function renderCategories(){$('categories').innerHTML=categories.map(c=>'<button class="category-btn" data-service="'+esc(c[1])+'">'+c[0]+'<b>'+esc(c[1])+'</b><small>'+esc(c[2])+'</small></button>').join('')}
async function showProfile(i){
  const p=visibleProviders[i]||activeProviders()[i];
  if(!p)return;
  if(p.id){
    try{
      const data=await api('/api/providers/'+encodeURIComponent(p.id));
      const profile=data.profile;
      const services=data.services||[];
      openModal('<p class="eyebrow">'+esc(services[0]?.name||p.service)+'</p><h2>'+esc(profile.business_name)+'</h2><p>'+(profile.verification_status==='verified'?'<span class="verified-badge"><span class="verified-check">✓</span> Verified provider</span>':'Verification pending')+'</p><p>'+esc(services[0]?.description||'Local FixIt Salone provider.')+'</p><div class="address-box"><b>📍 Service location</b><br>'+esc(profile.service_address)+'<br><small>'+esc(profile.region)+' · '+esc(profile.district)+' · '+esc(profile.area)+'</small></div><p><b>Services:</b> '+services.map(s=>esc(s.name)).join(', ')+'</p><p><b>Pricing:</b> '+services.map(s=>esc(s.pricing_type.replaceAll('_',' '))+(s.price_sle!=null?' — SLE '+Number(s.price_sle).toLocaleString():'')).join('<br>')+'</p><h3>My Work</h3><p class="quote-note">Portfolio uploads will appear here when this provider adds them.</p><div class="profile-safety"><button class="btn" id="modalRequest">Request this provider</button><button class="btn outline" id="modalReport">⚠️ Report</button></div>');
      $('modalRequest').onclick=()=>showRequest(i);$('modalReport').onclick=()=>reportProvider(i);
      return;
    }catch(e){alert(e.message);return}
  }
  openModal('<p class="eyebrow">'+esc(p.service)+'</p><h2>'+esc(p.name)+'</h2><p>'+esc(p.desc)+'</p><p class="quote-note">Demo provider profile.</p><div class="profile-safety"><button class="btn" id="modalRequest">Request this provider</button><button class="btn outline" id="modalReport">⚠️ Report</button></div>');
  $('modalRequest').onclick=()=>showRequest(i);$('modalReport').onclick=()=>reportProvider(i);
}
function customerLogin(mode='login',role='customer'){
  const saved=localStorage.getItem('fixit_customer');
  if(authToken()&&saved){
    const u=JSON.parse(saved);
    openModal('<p class="eyebrow">'+(u.role==='provider'?'PROVIDER':'CUSTOMER')+' ACCOUNT</p><h2>Welcome back, '+esc(u.name)+'</h2><p>'+esc(u.phone)+'</p><button class="btn" id="accountContinue">Continue</button>'+(u.role==='customer'?'<button class="btn outline" id="myRequests">My requests</button>':'<button class="btn outline" id="providerJobsBtn">Incoming jobs</button>')+'<button class="btn outline" id="accountSignOut">Sign out</button>');
    $('accountContinue').onclick=closeModal;
    if(u.role==='customer')$('myRequests').onclick=customerRequests; else $('providerJobsBtn').onclick=providerJobs;
    $('accountSignOut').onclick=()=>{clearAuth();customerLogin('login',role)};
    return;
  }
  const isProvider=role==='provider';
  const title=isProvider?'Provider':'Customer';
  const action=mode==='register'?'Create account':'Sign in';
  openModal('<p class="eyebrow">'+title.toUpperCase()+' ACCOUNT</p><h2>'+action+'</h2>'+
    (mode==='register'?'<label class="form-label">Full name</label><input id="authName" class="form-control" placeholder="Your full name">':'')+
    '<label class="form-label">Phone number</label><input id="authPhone" class="form-control" placeholder="+232 76 000 000" autocomplete="tel">'+
    '<label class="form-label">Password</label><input id="authPassword" type="password" class="form-control" placeholder="At least 8 characters" autocomplete="'+(mode==='register'?'new-password':'current-password')+'">'+
    '<button class="btn" id="authSubmit">'+action+'</button>'+
    (mode==='login'?'<button class="btn outline" id="forgotPassword">Forgot password?</button>':'')+
    '<button class="btn outline" id="authSwitch">'+(mode==='register'?'Already have an account? Sign in':'New here? Create an account')+'</button>'+
    '<p id="authMessage" class="form-message"></p>'+
    '<p class="quote-note">Your password is securely stored on the FixIt backend and is never saved in your browser.</p>');
  $('authSubmit').onclick=async()=>{
    const phone=$('authPhone').value.trim(),password=$('authPassword').value;
    const name=mode==='register'?$('authName').value.trim():'';
    if(!phone||!password||(mode==='register'&&!name)){ $('authMessage').textContent='Please complete all fields.';return; }
    $('authSubmit').disabled=true;$('authMessage').textContent=mode==='register'?'Creating account…':'Signing in…';
    try{
      const data=await api(mode==='register'?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify(mode==='register'?{full_name:name,phone,password,role:isProvider?'provider':'customer'}:{phone,password})});
      saveAuth(data);
      $('authMessage').textContent='Account authenticated successfully.';
      setTimeout(()=>{closeModal();if(isProvider)providerPortal();},250);
    }catch(e){$('authMessage').textContent=e.message;$('authSubmit').disabled=false;}
  };
  $('authSwitch').onclick=()=>customerLogin(mode==='register'?'login':'register',role);
  if(mode==='login')$('forgotPassword').onclick=forgotPassword;
}
async function forgotPassword(){
  openModal('<p class="eyebrow">ACCOUNT RECOVERY</p><h2>Forgot password?</h2><p>Enter the phone number linked to your FixIt account.</p><label class="form-label">Phone number</label><input id="resetPhone" class="form-control" placeholder="+232 76 000 000" autocomplete="tel"><button class="btn" id="sendReset">Continue</button><button class="btn outline" id="backToLogin">Back to sign in</button><p id="resetMessage" class="form-message"></p>');
  $('sendReset').onclick=async()=>{
    const phone=$('resetPhone').value.trim();
    if(!phone){$('resetMessage').textContent='Please enter your phone number.';return}
    $('sendReset').disabled=true;$('resetMessage').textContent='Preparing password reset…';
    try{
      const data=await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({phone})});
      if(!data.reset_id){$('resetMessage').textContent=data.message||'If an account exists, reset instructions have been prepared.';return}
      openModal('<p class="eyebrow">VERIFY</p><h2>Reset your password</h2><p>Enter the verification code, then choose a new password.</p><p class="quote-note"><b>Beta mode:</b> real SMS is not connected yet. Use demo code <b>123456</b>.</p><label class="form-label">Verification code</label><input id="resetOtp" class="form-control" inputmode="numeric" maxlength="6" placeholder="123456"><label class="form-label">New password</label><input id="resetNewPassword" type="password" class="form-control" placeholder="At least 8 characters" autocomplete="new-password"><label class="form-label">Confirm new password</label><input id="resetConfirmPassword" type="password" class="form-control" placeholder="Repeat new password" autocomplete="new-password"><button class="btn" id="resetSubmit">Reset password</button><p id="resetFormMessage" class="form-message"></p>');
      $('resetSubmit').onclick=async()=>{
        const otp=$('resetOtp').value.trim(),pw=$('resetNewPassword').value,confirm=$('resetConfirmPassword').value;
        if(!otp||!pw||!confirm){$('resetFormMessage').textContent='Please complete all fields.';return}
        if(pw!==confirm){$('resetFormMessage').textContent='Passwords do not match.';return}
        $('resetSubmit').disabled=true;$('resetFormMessage').textContent='Updating password…';
        try{
          const result=await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({reset_id:data.reset_id,otp,password:pw})});
          openModal('<p class="eyebrow">PASSWORD UPDATED</p><h2>Password reset successful</h2><p>'+esc(result.message)+'</p><button class="btn" id="resetDone">Sign in</button>');
          $('resetDone').onclick=()=>customerLogin('login',role);
        }catch(e){$('resetFormMessage').textContent=e.message;$('resetSubmit').disabled=false}
      };
    }catch(e){$('resetMessage').textContent=e.message;$('sendReset').disabled=false}
  };
  $('backToLogin').onclick=()=>customerLogin('login','customer');
}

window.customerLogin=customerLogin;
window.customerRequests=customerRequests;
window.providerJobs=providerJobs;
function saveCustomer(){customerLogin('register','customer')}
function locationFields(prefix){return '<label class="form-label">Region</label><select id="'+prefix+'Region" class="form-control"><option value="">Select region</option>'+Object.keys(districts).map(r=>'<option>'+esc(r)+'</option>').join('')+'</select><label class="form-label">District</label><select id="'+prefix+'District" class="form-control" disabled><option>Select district</option></select><label class="form-label">Community / Area</label><input id="'+prefix+'Area" class="form-control" placeholder="e.g. Lumley, Aberdeen, Hill Station"><label class="form-label">Street / Landmark / Address</label><input id="'+prefix+'Address" class="form-control" placeholder="e.g. Near ..."><label class="form-label">Additional directions (optional)</label><input id="'+prefix+'Directions" class="form-control" placeholder="Helpful directions for finding the location">'}
function wireLocation(prefix){$(prefix+'Region').onchange=()=>{const r=$(prefix+'Region').value,d=$(prefix+'District'),list=districts[r]||[];d.innerHTML='<option value="">Select district</option>'+list.map(x=>'<option>'+esc(x)+'</option>').join('');d.disabled=!list.length}}
async function showRequest(i){
  if(!authToken()||!localStorage.getItem('fixit_customer')){customerLogin('login','customer');return}
  const p=visibleProviders[i]||activeProviders()[i];
  if(!p)return;
  try{
    const services=await api('/api/services');
    const match=services.find(s=>s.name.toLowerCase()===p.service.toLowerCase());
    if(!match){alert('This service is not yet available in the live marketplace.');return}
    openModal('<p class="eyebrow">SERVICE REQUEST</p><h2>Request '+esc(p.service)+'</h2><p>Provider: <b>'+esc(p.name)+'</b></p>'+locationFields('request')+
      '<label class="form-label">Pricing type</label><select id="quoteType" class="form-control"><option value="starting_price">Starting price</option><option value="fixed_price">Fixed price</option><option value="quote_required">Quote required</option></select>'+
      '<label class="form-label">Job details</label><textarea id="jobDetails" class="form-control" placeholder="Describe the work you need..."></textarea>'+
      '<label class="form-label">Photos (optional, up to 5)</label><input id="jobPhotos" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" multiple>'+
      '<p class="quote-note">Final price must be approved before payment. FixIt fee: 1%.</p><button class="btn" id="submitRequest">Send request</button>');
    wireLocation('request');
    $('submitRequest').onclick=()=>submitRequest(p,match.id);
  }catch(e){alert(e.message)}
}
async function submitRequest(provider,serviceId){
  const r=$('requestRegion').value,d=$('requestDistrict').value,a=$('requestArea').value.trim(),addr=$('requestAddress').value.trim(),directions=$('requestDirections').value.trim(),details=$('jobDetails').value.trim(),files=$('jobPhotos').files;
  if(!r||!d||!a||!addr||!details){alert('Please complete your region, district, area, address and job details.');return}
  if(files.length>5){alert('Maximum 5 photos.');return}
  for(const f of files)if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024){alert('Each photo must be JPG, PNG or WEBP and 3 MB or less.');return}
  $('submitRequest').disabled=true;
  try{
    const profile=await api('/api/providers');
    const live=profile.find(x=>x.business_name===provider.name);
    const providerId=live?live.id:null;
    if(!providerId)throw new Error('This provider is not yet connected to the live marketplace.');
    const created=await api('/api/service-requests',{method:'POST',body:JSON.stringify({provider_id:providerId,service_id:serviceId,region:r,district:d,area:a,service_address:addr,directions,pricing_type:$('quoteType').value,job_details:details})});
    if(files.length){
      const form=new FormData();
      for(const file of files)form.append('photos',file);
      const uploadRes=await fetch(API_BASE+'/api/service-requests/'+encodeURIComponent(created.id)+'/photos',{method:'POST',headers:{Authorization:'Bearer '+authToken()},body:form});
      let uploadData={};try{uploadData=await uploadRes.json()}catch{}
      if(!uploadRes.ok)throw new Error(uploadData.error||'Request was created, but the photos could not be uploaded.');
    }
    openModal('<p class="eyebrow">REQUEST SUBMITTED</p><h2>Your request is live</h2><p>Request ID: <b>'+esc(created.id)+'</b></p><p>📍 '+esc(a)+', '+esc(addr)+'</p><p>'+(files.length?files.length+' photo'+(files.length===1?'':'s')+' attached. ':'')+'The provider can now review the job and respond.</p><button class="btn" id="closeRequest">Done</button>');
    $('closeRequest').onclick=closeModal;
  }catch(e){alert(e.message);$('submitRequest').disabled=false}
}

async function customerRequests(){
  if(!authToken()){customerLogin('login','customer');return}
  try{
    const me=await api('/api/auth/me');
    if(me.user.role!=='customer')throw new Error('Please sign in with a customer account to view your requests.');
    const requests=await api('/api/service-requests/mine');
    const cards=requests.length?requests.map(r=>{
      const quote=r.quoted_amount!=null?'SLE '+Number(r.quoted_amount).toLocaleString():'Awaiting provider quote';
      const actions=[];
      if(r.status==='quoted')actions.push('<button class="btn" data-customer-job="'+esc(r.id)+'" data-customer-action="approve">Approve quote</button>');
      if(r.status==='approved')actions.push('<button class="btn" data-customer-job="'+esc(r.id)+'" data-customer-action="pay">Prepare payment</button>');
      if(['requested','quoted','approved','in_progress'].includes(r.status))actions.push('<button class="btn outline" data-customer-job="'+esc(r.id)+'" data-customer-action="cancel">Cancel</button>');
      return '<article class="job-card"><div class="job-head"><div><b>'+esc(r.service_name||'Service')+'</b><small>'+esc(r.created_at?new Date(r.created_at).toLocaleString():'')+'</small></div><span class="status-pill">'+esc(r.status.replaceAll('_',' '))+'</span></div><p><b>Provider:</b> '+esc(r.business_name||r.provider_name||'Provider')+'</p><p><b>Location:</b> '+esc(r.area)+', '+esc(r.district)+', '+esc(r.region)+'<br>'+esc(r.service_address)+'</p><p><b>Job:</b> '+esc(r.job_details)+'</p><p><b>Quote:</b> '+esc(quote)+'</p><button class="btn outline" data-customer-job="'+esc(r.id)+'" data-customer-action="photos">View job photos</button>'+actions.join('')+'</article>';
    }).join(''):'<div class="card"><h3>No requests yet</h3><p class="desc">Your service requests will appear here.</p></div>';
    openModal('<p class="eyebrow">MY REQUESTS</p><h2>Your FixIt jobs</h2><p class="quote-note">Review provider quotes here. Payment will only be requested after you approve the final quote.</p><div class="job-list">'+cards+'</div><button class="btn outline" id="closeCustomerRequests">Done</button>');
    document.querySelectorAll('[data-customer-action]').forEach(btn=>btn.onclick=async()=>{
      try{
        if(btn.dataset.customerAction==='photos'){
          const photos=await api('/api/service-requests/'+encodeURIComponent(btn.dataset.customerJob)+'/photos');
          openModal('<p class="eyebrow">JOB PHOTOS</p><h2>Photos for this request</h2>'+(photos.length?'<div class="photo-grid">'+photos.map(p=>'<a href="'+esc(API_BASE+p.file_url)+'" target="_blank" rel="noopener"><img src="'+esc(API_BASE+p.file_url)+'" alt="Job photo"></a>').join('')+'</div>':'<p>No photos attached to this request.</p>')+'<button class="btn outline" id="closePhotos">Done</button>');$('closePhotos').onclick=()=>customerRequests();return;
        }
        if(btn.dataset.customerAction==='pay'){
          const result=await api('/api/payments/intent',{method:'POST',body:JSON.stringify({service_request_id:btn.dataset.customerJob})});
          const p=result.payment;
          openModal('<p class="eyebrow">PAYMENT READY</p><h2>Payment prepared</h2><div class="address-box"><b>Job amount</b><br>SLE '+Number(p.amount_sle).toLocaleString()+'<br><small>FixIt fee: SLE '+Number(p.platform_fee).toLocaleString()+' · Provider earnings: SLE '+Number(p.provider_earnings).toLocaleString()+'</small></div><p>'+esc(result.message)+'</p><p class="quote-note">No money has been collected. A live payment gateway must be configured before customers can actually pay.</p><button class="btn" onclick="closeModal()">Done</button>');
          return;
        }
        const map={approve:'approved',cancel:'cancelled'};
        await api('/api/service-requests/'+encodeURIComponent(btn.dataset.customerJob)+'/status',{method:'PATCH',body:JSON.stringify({status:map[btn.dataset.customerAction]})});
        customerRequests();
      }catch(e){alert(e.message)}
    });
    $('closeCustomerRequests').onclick=closeModal;
  }catch(e){alert(e.message)}
}
async function providerPortal(){
  if(!authToken()){
    openModal('<p class="eyebrow">PROVIDER PORTAL</p><h2>Join FixIt as a professional</h2><p>Create or sign in to your provider account first.</p><button class="btn" id="providerCreate">Create provider account</button><button class="btn outline" id="providerSignIn">Provider sign in</button>');
    $('providerCreate').onclick=()=>customerLogin('register','provider');
    $('providerSignIn').onclick=()=>customerLogin('login','provider');
    return;
  }
  try{
    const me=await api('/api/auth/me');
    if(me.user.role!=='provider'){
      openModal('<p class="eyebrow">PROVIDER PORTAL</p><h2>You are signed in as a customer</h2><p>Your current account is a customer account. To use the Provider Portal, create a separate provider account or sign in with an existing provider account.</p><button class="btn" id="providerCreate">Create provider account</button><button class="btn outline" id="providerSignIn">Sign in as provider</button><button class="btn outline" id="providerStay">Stay as customer</button>');
      $('providerCreate').onclick=()=>customerLogin('register','provider');
      $('providerSignIn').onclick=()=>customerLogin('login','provider');
      $('providerStay').onclick=closeModal;
      return;
    }
    const profile=await api('/api/providers/me/profile');
    const jobData=await api('/api/provider/requests');
    const requests=jobData.requests||[];
    const notifications=await api('/api/provider/notifications');
    const unread=notifications.filter(n=>!n.is_read).length;
    const pending=requests.filter(r=>['requested','quoted','approved','in_progress'].includes(r.status)).length;
    openModal('<p class="eyebrow">PROVIDER DASHBOARD</p><h2>Welcome, '+esc(me.user.full_name)+'</h2>'+
      '<div class="stats-row"><span><b>'+requests.length+'</b><small>Visible jobs</small></span><span><b>'+pending+'</b><small>Active jobs</small></span><span><b>'+esc(profile.profile?.verification_status||'unverified')+'</b><small>Trust status</small></span></div>'+
      '<div class="card"><b>Referral access</b><p class="desc">Free referrals used: '+esc(String(Math.min(jobData.referral_count||0,3)))+' / 3'+(jobData.subscription?' · Subscription active until '+esc(new Date(jobData.subscription.expires_at).toLocaleDateString()):'')+'</p>'+(jobData.can_receive_requests?'':'<p class="quote-note">You have reached 3 free referrals. You will still receive notifications, but new request details are locked until you subscribe.</p><button class="btn" id="subscribeProvider">Subscribe to receive requests</button>')+'</div>'+
      '<button class="btn outline" id="providerNotifications">Notifications'+(unread?' ('+unread+')':'')+'</button>'+
      '<div class="plan-grid"><div><b>Profile</b><strong>'+(profile.profile?'Live':'Not set')+'</strong><small>Business information</small></div><div><b>Services</b><strong>'+((profile.services||[]).length)+'</strong><small>Services listed</small></div><div><b>Jobs</b><strong>'+requests.filter(r=>r.status==='completed').length+'</strong><small>Completed requests</small></div></div>'+
      '<button class="btn" id="manageJobs">Manage incoming jobs</button><button class="btn outline" id="editProviderProfile">Edit profile & services</button><button class="btn outline" id="refreshProvider">Refresh dashboard</button>');
    $('manageJobs').onclick=()=>providerJobs();
    $('editProviderProfile').onclick=()=>providerProfile();
    $('refreshProvider').onclick=()=>providerPortal();
    $('providerNotifications').onclick=()=>providerNotificationsCenter();
    if($('subscribeProvider'))$('subscribeProvider').onclick=()=>subscriptionCenter();
  }catch(e){
    if(/invalid or expired session/i.test(e.message||'')){
      clearAuth();
      openModal('<p class="eyebrow">PROVIDER PORTAL</p><h2>Join FixIt as a professional</h2><p>Your previous sign-in session has expired. Please sign in again or create a provider account.</p><button class="btn" id="providerCreate">Create provider account</button><button class="btn outline" id="providerSignIn">Provider sign in</button>');
      $('providerCreate').onclick=()=>customerLogin('register','provider');
      $('providerSignIn').onclick=()=>customerLogin('login','provider');
      return;
    }
    alert(e.message)
  }
}
async function providerNotificationsCenter(){
  try{
    const notes=await api('/api/provider/notifications');
    openModal('<p class="eyebrow">PROVIDER NOTIFICATIONS</p><h2>Notifications</h2>'+(notes.length?notes.map(n=>'<article class="job-card"><div class="job-head"><b>'+esc(n.title)+'</b><small>'+esc(new Date(n.created_at).toLocaleString())+'</small></div><p>'+esc(n.message)+'</p>'+(!n.is_read?'<button class="btn outline" data-note="'+esc(n.id)+'">Mark read</button>':'<small>Read</small>')+'</article>').join(''):'<p>No notifications yet.</p>')+'<button class="btn outline" id="closeProviderNotes">Done</button>');
    document.querySelectorAll('[data-note]').forEach(b=>b.onclick=async()=>{await api('/api/provider/notifications/'+encodeURIComponent(b.dataset.note)+'/read',{method:'PATCH'});providerNotificationsCenter()});
    $('closeProviderNotes').onclick=providerPortal;
  }catch(e){alert(e.message)}
}
function subscriptionCenter(){
  openModal('<p class="eyebrow">PROVIDER SUBSCRIPTION</p><h2>Choose your FixIt plan</h2><p>Your first <b>3 customer referrals are free</b>. After that, request details stay locked until you activate a paid plan.</p><div class="plan-grid">'+
    '<div><b>FREE</b><strong>SLE 0 / month</strong><small>3 referrals · 1% FixIt fee</small></div>'+
    '<div><b>PRO</b><strong>SLE 20 / month</strong><small>Unlimited referrals · 0% fee</small><button class="btn" id="subscribePro">Choose Pro</button></div>'+
    '<div><b>BUSINESS</b><strong>SLE 40 / month</strong><small>Unlimited referrals · 0% fee</small><button class="btn" id="subscribeBusiness">Choose Business</button></div>'+
    '<div><b>PREMIUM</b><strong>SLE 60 / month</strong><small>Unlimited referrals · 0% fee</small><button class="btn" id="subscribePremium">Choose Premium</button></div>'+
  '</div><p class="quote-note">Subscription payment is not connected yet. These plan prices are the current beta pricing. We can connect Orange Money when you are ready.</p><button class="btn outline" id="subscriptionBack">Back</button>');
  const choose=plan=>alert(plan+' subscription payment is coming next. No payment has been collected.');
  $('subscribePro').onclick=()=>choose('Pro');
  $('subscribeBusiness').onclick=()=>choose('Business');
  $('subscribePremium').onclick=()=>choose('Premium');
  $('subscriptionBack').onclick=providerPortal;
}
async function providerJobs(){
  try{
    const jobData=await api('/api/provider/requests');
    const requests=jobData.requests||[];
    const cards=requests.length?requests.map(r=>{
      const status=r.status.replaceAll('_',' ');
      const quote=r.quoted_amount!=null?'SLE '+Number(r.quoted_amount).toLocaleString():'No quote yet';
      const actions=[];
      if(r.status==='requested')actions.push('<button class="btn" data-job="'+esc(r.id)+'" data-action="quote">Send quote</button>','<button class="btn outline" data-job="'+esc(r.id)+'" data-action="decline">Decline</button>');
      if(r.status==='approved')actions.push('<button class="btn" data-job="'+esc(r.id)+'" data-action="start">Start job</button>');
      if(r.status==='in_progress')actions.push('<button class="btn" data-job="'+esc(r.id)+'" data-action="complete">Mark completed</button>');
      if(['requested','quoted','approved','in_progress'].includes(r.status))actions.push('<button class="btn outline" data-job="'+esc(r.id)+'" data-action="cancel">Cancel</button>');
      return '<article class="job-card"><div class="job-head"><div><b>'+esc(r.service_name||'Service request')+'</b><small>'+esc(r.created_at?new Date(r.created_at).toLocaleString():'')+'</small></div><span class="status-pill">'+esc(status)+'</span></div><p><b>Customer:</b> '+esc(r.customer_name||'Customer')+' · '+esc(r.customer_phone||'')+'</p><p><b>Location:</b> '+esc(r.area)+', '+esc(r.district)+', '+esc(r.region)+'<br>'+esc(r.service_address)+(r.directions?'<br><small>Directions: '+esc(r.directions)+'</small>':'')+'</p><p><b>Job:</b> '+esc(r.job_details)+'</p><p><b>Quote:</b> '+esc(quote)+'</p><div class="job-actions"><button class="btn outline" data-job="'+esc(r.id)+'" data-action="photos">View job photos</button>'+actions.join('')+'</div></article>';
    }).join(''):'<div class="card"><h3>No incoming requests</h3><p class="desc">New customer requests will appear here.</p></div>';
    openModal('<p class="eyebrow">INCOMING JOBS</p><h2>Manage customer requests</h2><p class="quote-note">Send a final quote before work starts. FixIt fee is 1% of the approved job value.</p><div class="job-list">'+cards+'</div><button class="btn outline" id="backProvider">Back to dashboard</button>');
    document.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>handleProviderJob(btn.dataset.job,btn.dataset.action));
    $('backProvider').onclick=providerPortal;
  }catch(e){alert(e.message)}
}
async function handleProviderJob(id,action){
  try{
    if(action==='photos'){
      const photos=await api('/api/service-requests/'+encodeURIComponent(id)+'/photos');
      openModal('<p class="eyebrow">JOB PHOTOS</p><h2>Customer job photos</h2>'+(photos.length?'<div class="photo-grid">'+photos.map(p=>'<a href="'+esc(API_BASE+p.file_url)+'" target="_blank" rel="noopener"><img src="'+esc(API_BASE+p.file_url)+'" alt="Customer job photo"></a>').join(''):'<p>No photos attached.</p>')+'<button class="btn outline" id="closeJobPhotos">Back to jobs</button>');$('closeJobPhotos').onclick=providerJobs;return;
    }
    if(action==='quote'){
      const amount=prompt('Enter your final quote in SLE:');
      if(amount===null)return;
      const n=Number(amount);
      if(!Number.isFinite(n)||n<=0){alert('Enter a valid positive amount.');return}
      await api('/api/service-requests/'+encodeURIComponent(id)+'/quote',{method:'PATCH',body:JSON.stringify({quoted_amount:n})});
    }else{
      const map={decline:'declined',start:'in_progress',complete:'completed',cancel:'cancelled'};
      await api('/api/service-requests/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status:map[action]})});
    }
    providerJobs();
  }catch(e){alert(e.message)}
}
async function providerProfile(){
  try{
    const services=await api('/api/services');
    const existing=await api('/api/providers/me/profile');
    const p=existing.profile||{};
    openModal('<p class="eyebrow">PROVIDER PROFILE</p><h2>Your live business profile</h2>'+
      '<label class="form-label">Business name</label><input id="providerBusiness" class="form-control" value="'+esc(p.business_name||'')+'" placeholder="e.g. Joe Electrical Services">'+
      locationFields('provider')+
      '<label class="form-label">Main service</label><select id="providerService" class="form-control"><option value="">Select service</option>'+services.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('')+'</select>'+
      '<label class="form-label">Pricing type</label><select id="providerPricing" class="form-control"><option value="starting_price">Starting price</option><option value="fixed_price">Fixed price</option><option value="quote_required">Quote required</option></select>'+
      '<label class="form-label">Starting / fixed price (SLE)</label><input id="providerPrice" class="form-control" type="number" min="0" step="0.01" placeholder="Optional">'+
      '<label class="form-label">Service description</label><textarea id="providerDesc" class="form-control" placeholder="Tell customers what you do"></textarea>'+
      '<button class="btn" id="saveProvider">Save live profile</button>');
    wireLocation('provider');
    if(p.region){$('providerRegion').value=p.region;wireLocation('provider');$('providerDistrict').value=p.district||'';$('providerArea').value=p.area||'';$('providerAddress').value=p.service_address||''}
    if(existing.services&&existing.services[0]){
      const s=existing.services[0];$('providerService').value=s.service_id;$('providerPricing').value=s.pricing_type;$('providerPrice').value=s.price_sle??'';$('providerDesc').value=s.description||'';
    }
    $('saveProvider').onclick=saveProvider;
  }catch(e){alert(e.message)}
}
async function saveProvider(){
  const business=$('providerBusiness').value.trim(),r=$('providerRegion').value,d=$('providerDistrict').value,a=$('providerArea').value.trim(),addr=$('providerAddress').value.trim(),serviceId=$('providerService').value;
  if(!business||!r||!d||!a||!addr||!serviceId){alert('Please complete your business name, location and main service.');return}
  $('saveProvider').disabled=true;
  try{
    const profile=await api('/api/providers/me/profile',{method:'PUT',body:JSON.stringify({business_name:business,region:r,district:d,area:a,service_address:addr})});
    await api('/api/providers/me/services',{method:'POST',body:JSON.stringify({service_id:serviceId,pricing_type:$('providerPricing').value,price_sle:$('providerPrice').value||null,description:$('providerDesc').value.trim()})});
    localStorage.setItem('fixit_provider_profile',JSON.stringify({business_name:business,region:r,district:d,area:a,address:addr,description:$('providerDesc').value.trim(),provider_id:profile.profile.id}));
    openModal('<p class="eyebrow">PROFILE LIVE</p><h2>Your provider profile is saved</h2><p>Your business details are now stored in the FixIt database.</p><p>Provider profile ID: <b>'+esc(profile.profile.id)+'</b></p><button class="btn" id="profileDone">Done</button>');
    $('profileDone').onclick=closeModal;
  }catch(e){alert(e.message);$('saveProvider').disabled=false}
}

async function verificationCenter(){
  const saved=localStorage.getItem('fixit_customer');const user=saved?JSON.parse(saved):null;
  if(!user||!authToken()){openModal('<p class="eyebrow">ACCOUNT VERIFICATION</p><h2>Sign in first</h2><p>Create or sign in to your FixIt account before verifying your phone number.</p><button class="btn" id="verificationLogin">Sign in</button><button class="btn outline" id="verificationDone">Done</button>');$('verificationLogin').onclick=()=>{closeModal();customerLogin('login','customer')};$('verificationDone').onclick=closeModal;return}
  openModal('<p class="eyebrow">ACCOUNT VERIFICATION</p><h2>Loading verification…</h2><p>Please wait.</p>');
  let status={phone_status:'unverified',identity:{status:'unverified'}};
  try{status=await api('/api/verification/'+encodeURIComponent(user.id||''))}catch{}
  const phoneVerified=status.phone_status==='verified';
  openModal('<p class="eyebrow">ACCOUNT VERIFICATION</p><h2>Build trust on FixIt</h2><div class="verification-steps"><div class="verification-step done"><b>01</b><span><strong>Account</strong><small>Account created</small></span></div><div class="verification-step '+(phoneVerified?'done':'')+'"><b>02</b><span><strong>Phone</strong><small>'+(phoneVerified?'Phone verified':'Verify your phone number')+'</small></span></div><div class="verification-step"><b>03</b><span><strong>Identity</strong><small>Secure KYC will be added before launch</small></span></div></div><p class="quote-note">'+(phoneVerified?'Your phone number has been verified successfully.':'We will send a real one-time code by SMS. Your code expires after a short period. SMS charges apply.')+'</p>'+(phoneVerified?'<button class="btn" disabled>Phone verified ✓</button>':'<button class="btn" id="phoneVerifyBtn">Send verification code</button>')+'<button class="btn outline" id="verificationDone">Done</button>');
  if(!phoneVerified)$('phoneVerifyBtn').onclick=phoneVerification;
  $('verificationDone').onclick=closeModal;
}
window.verificationCenter=verificationCenter;
async function phoneVerification(){
  const saved=localStorage.getItem('fixit_customer');if(!saved||!authToken()){customerLogin('login','customer');return}
  const u=JSON.parse(saved);
  openModal('<p class="eyebrow">PHONE VERIFICATION</p><h2>Sending code…</h2><p>Please wait while we send a verification SMS.</p>');
  try{
    const data=await api('/api/phone-verification/request',{method:'POST',body:JSON.stringify({})});
    const verificationId=data.verification.id;
    openModal('<p class="eyebrow">PHONE VERIFICATION</p><h2>Check your phone</h2><p>Enter the 6-digit code sent to <b>'+esc(u.phone)+'</b>.</p><p class="quote-note">The code is sent by FixIt Salone SMS verification and is valid for a limited time. Never share your verification code with anyone.</p><label class="form-label">6-digit OTP</label><input id="otpCode" class="form-control" inputmode="numeric" maxlength="8" placeholder="Enter code" autocomplete="one-time-code"><button class="btn" id="checkOtp">Verify phone</button><button class="btn outline" id="backVerification">Back</button><p id="otpMessage" class="form-message"></p>');
    $('checkOtp').onclick=async()=>{
      const code=$('otpCode').value.trim();if(!code){$('otpMessage').textContent='Enter the code sent to your phone.';return}
      $('checkOtp').disabled=true;$('otpMessage').textContent='Checking code…';
      try{const result=await api('/api/phone-verification/verify',{method:'POST',body:JSON.stringify({verification_id:verificationId,otp:code})});localStorage.setItem('fixit_phone_verified','true');openModal('<p class="eyebrow">VERIFIED</p><h2>Phone verified ✓</h2><p>'+esc(result.message)+'</p><button class="btn" id="verifiedDone">Continue</button>');$('verifiedDone').onclick=verificationCenter}
      catch(e){$('otpMessage').textContent=e.message;$('checkOtp').disabled=false}
    };
    $('backVerification').onclick=verificationCenter;
  }catch(e){
    openModal('<p class="eyebrow">PHONE VERIFICATION</p><h2>Could not send code</h2><p>'+esc(e.message)+'</p><p class="quote-note">The SMS service must be configured on the FixIt backend before real messages can be sent.</p><button class="btn" id="verificationRetry">Try again</button><button class="btn outline" id="verificationBack">Back</button>');
    $('verificationRetry').onclick=phoneVerification;$('verificationBack').onclick=verificationCenter;
  }
}
window.phoneVerification=phoneVerification;
function safetyCenter(){openModal('<p class="eyebrow">TRUST & SAFETY</p><h2>Safety Center</h2><p>FixIt is designed to keep a private identity record while showing only trust signals publicly.</p><div class="safety-list"><div><b>🔵 Verification</b><small>Identity verification status can be stored securely.</small></div><div><b>⚠️ Report an issue</b><small>Use the report button on a provider profile or contact support.</small></div><div><b>🧾 Job history</b><small>Important job activity can be linked to the customer and provider accounts.</small></div></div><p class="quote-note">Beta note: secure ID upload and live admin investigation are not connected to the public beta yet. Phone verification uses real SMS when the configured provider is active; identity KYC is still pending.</p><button class="btn" onclick="verificationCenter()">Verify my account</button><button class="btn outline" onclick="closeModal()">Done</button>')}window.safetyCenter=safetyCenter;
function reportProvider(i){
  const p=visibleProviders[i]||activeProviders()[i];
  if(!p)return;
  if(!authToken()){customerLogin('login','customer');return}
  openModal('<p class="eyebrow">SAFETY REPORT</p><h2>Report '+esc(p.name)+'</h2><p>Your report is submitted to the protected FixIt Trust & Safety system.</p><label class="form-label">Reason</label><select id="reportReason" class="form-control"><option>Fraud or scam</option><option>Threatening behaviour</option><option>Harassment</option><option>Fake identity</option><option>Property damage</option><option>Payment dispute</option><option>Other safety concern</option></select><label class="form-label">What happened?</label><textarea id="reportDetails" class="form-control" placeholder="Describe what happened..."></textarea><button class="btn" id="submitReport">Submit report</button>');
  $('submitReport').onclick=async()=>{
    const d=$('reportDetails').value.trim();
    if(!d){alert('Please describe what happened.');return}
    $('submitReport').disabled=true;
    try{
      await api('/api/incidents',{method:'POST',body:JSON.stringify({reported_user_id:p.userId||null,reason:$('#reportReason').value,details:d})});
      openModal('<p class="eyebrow">REPORT SUBMITTED</p><h2>Safety report recorded</h2><p>Your report has been stored securely for FixIt Trust & Safety review.</p><button class="btn" onclick="closeModal()">Done</button>');
    }catch(e){alert(e.message);$('submitReport').disabled=false}
  }
}
window.reportProvider=reportProvider;
function featuredListing(){openModal('<p class="eyebrow">FEATURED LISTING</p><h2>Get more visibility</h2><p>Featured providers appear prominently in relevant searches.</p><div class="plan-grid"><div><b>7 days</b><strong>SLE 25</strong><small>Featured placement</small></div><div><b>30 days</b><strong>SLE 75</strong><small>Featured placement</small></div></div><p class="quote-note">This is a beta pricing model; no payment is collected yet.</p><button class="btn" onclick="closeModal()">Got it</button>')}
function joinProvider(){providerPortal()}window.providerPortal=providerPortal;window.joinProvider=joinProvider;window.featuredListing=featuredListing;window.render=render;
document.addEventListener('click',e=>{const p=e.target.closest('.profile-btn'),r=e.target.closest('.request-btn'),cat=e.target.closest('.category-btn');if(p){showProfile(+p.dataset.index);return}if(r){showRequest(+r.dataset.index);return}if(cat){$('search').value=cat.dataset.service;render();$('providers').scrollIntoView({behavior:'smooth'})}});
$('search').addEventListener('input',render);$('region').addEventListener('change',updateDistricts);$('district').addEventListener('change',render);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});renderCategories();updateDistricts();render();
})();