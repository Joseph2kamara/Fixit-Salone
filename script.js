(() => {
'use strict';
const API_BASE=(localStorage.getItem('fixit_api_base')||'https://fixit-salone-api.onrender.com').replace(/\/$/,'');
function mediaUrl(url){const value=String(url||'').trim();return /^https?:\/\//i.test(value)?value:API_BASE+(value.startsWith('/')?value:'/'+value);}
let siteImages={};
function siteImageKey(label){return 'service-'+String(label||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
async function loadPublicSiteImages(){
 try{const data=await api('/api/site-images');siteImages=Object.fromEntries((data.images||[]).map(item=>[item.image_key,item]))}
 catch(e){siteImages={}}
 applyHomepageHeroImage();
}
let homepageHeroIndex=0;
let homepageHeroTimer=null;
function applyHomepageHeroImage(){
 const host=$('homepageHeroCarousel');if(!host)return;
 const items=['homepage-hero','homepage-hero-2','homepage-hero-3','homepage-hero-4']
  .map(key=>siteImages[key]).filter(item=>item&&item.image_url);
 if(homepageHeroTimer){clearInterval(homepageHeroTimer);homepageHeroTimer=null}
 if(!items.length){host.hidden=true;host.innerHTML='';return}
 homepageHeroIndex=Math.min(homepageHeroIndex,items.length-1);
 host.hidden=false;
 host.innerHTML='<div class="homepage-hero-slides" aria-live="polite">'+items.map((item,i)=>
  '<img class="homepage-hero-slide'+(i===homepageHeroIndex?' is-active':'')+'" src="'+esc(mediaUrl(item.image_url))+'" alt="FixIt Salone service showcase" '+(i===homepageHeroIndex?'':'loading="lazy"')+' '+(i===homepageHeroIndex?'':'hidden')+'>'
 ).join('')+'</div>'+(items.length>1?'<div class="homepage-hero-controls" aria-label="Homepage picture controls"><button type="button" class="homepage-hero-arrow" data-hero-step="-1" aria-label="Previous picture">‹</button><div class="homepage-hero-dots">'+items.map((item,i)=>'<button type="button" class="homepage-hero-dot'+(i===homepageHeroIndex?' is-active':'')+'" data-hero-index="'+i+'" aria-label="Show picture '+(i+1)+'" aria-current="'+(i===homepageHeroIndex?'true':'false')+'"></button>').join('')+'</div><button type="button" class="homepage-hero-arrow" data-hero-step="1" aria-label="Next picture">›</button></div>':'');
 const show=(index)=>{homepageHeroIndex=(index+items.length)%items.length;host.querySelectorAll('.homepage-hero-slide').forEach((img,i)=>{img.hidden=i!==homepageHeroIndex;img.classList.toggle('is-active',i===homepageHeroIndex)});host.querySelectorAll('.homepage-hero-dot').forEach((dot,i)=>{dot.classList.toggle('is-active',i===homepageHeroIndex);dot.setAttribute('aria-current',i===homepageHeroIndex?'true':'false')})};
 host.querySelectorAll('[data-hero-index]').forEach(button=>button.addEventListener('click',()=>{show(Number(button.dataset.heroIndex));restart()}));
 host.querySelectorAll('[data-hero-step]').forEach(button=>button.addEventListener('click',()=>{show(homepageHeroIndex+Number(button.dataset.heroStep));restart()}));
 const restart=()=>{if(homepageHeroTimer)clearInterval(homepageHeroTimer);if(items.length>1)homepageHeroTimer=setInterval(()=>show(homepageHeroIndex+1),5000)};
 if(items.length>1)restart();
}
const AUTH_TOKEN_KEY='fixit_access_token';
function authToken(){return sessionStorage.getItem(AUTH_TOKEN_KEY)||'';}
async function api(path,options={}){
  const headers=Object.assign({},options.headers||{});
  if(options.body && !(typeof FormData!=='undefined' && options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type']='application/json';
  if(authToken()) headers.Authorization='Bearer '+authToken();
  const res=await fetch(API_BASE+path,Object.assign({},options,{headers}));
  let data={}; try{data=await res.json()}catch{}
  if(!res.ok) throw new Error(data.error||'Something went wrong. Please try again.');
  return data;
}
function saveAuth(data){
  sessionStorage.setItem(AUTH_TOKEN_KEY,data.token);
  localStorage.setItem('fixit_customer',JSON.stringify({id:data.user.id,name:data.user.full_name,phone:data.user.phone,role:data.user.role}));
  updateCustomerAccountButton();
  updateMobileAccountAction();
  updateHomeGreeting();
  loadCustomerHomeJobs();
}
function clearAuth(){
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('fixit_customer');
  localStorage.removeItem('fixit_phone_verified');
  const section=$('homeActiveJobs'),container=$('activeJobs');
  if(section)section.hidden=true;
  if(container)container.innerHTML='';
  updateHomeGreeting();
  updateMobileAccountAction();
}
function closeMobileNav(){
  const drawer=$('mobileNav'),toggle=$('mobileMenuToggle'),backdrop=$('mobileNavBackdrop');
  if(!drawer||!toggle||!backdrop)return;
  drawer.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation menu');
  backdrop.hidden=true;document.body.classList.remove('mobile-nav-open');
}
function openMobileNav(){
  const drawer=$('mobileNav'),toggle=$('mobileMenuToggle'),backdrop=$('mobileNavBackdrop');
  if(!drawer||!toggle||!backdrop)return;
  drawer.classList.add('is-open');drawer.setAttribute('aria-hidden','false');
  toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation menu');
  backdrop.hidden=false;document.body.classList.add('mobile-nav-open');
  updateMobileAccountAction();
}
function updateMobileAccountAction(){
  const button=$('mobileAccountAction');if(!button)return;
  let user=null;try{user=JSON.parse(localStorage.getItem('fixit_customer')||'null')}catch{}
  const avatar=button.querySelector('.mobile-account-avatar');
  const strong=button.querySelector('strong');const small=button.querySelector('small');
  if(authToken()&&user){
    strong.textContent=user.name|| (user.role==='provider'?'Provider account':'Customer account');
    small.textContent=user.role==='provider'?'Open provider account':'Open your customer account';
    if(avatar)avatar.textContent='👤';
    const endpoint=user.role==='provider'?'/api/provider/profile-photo':user.role==='customer'?'/api/customer/profile-photo':null;
    if(endpoint&&avatar)api(endpoint).then(photo=>{if(photo.photo_url&&avatar.isConnected)avatar.innerHTML='<img src="'+esc(mediaUrl(photo.photo_url))+'" alt="">'}).catch(()=>{});
  }else{
    strong.textContent='Customer Login';small.textContent='Sign in or manage your account';
    if(avatar)avatar.textContent='👤';
  }
}
function updateCustomerAccountButton(){
  const button=$('customerAccountButton');
  if(!button)return;
  let user=null;
  try{user=JSON.parse(localStorage.getItem('fixit_customer')||'null')}catch{}
  if(authToken()&&user&&user.role==='customer'){
    const firstName=String(user.name||'Customer').trim().split(/\s+/)[0]||'Customer';
    button.innerHTML='<span class="customer-nav-avatar" id="customerNavAvatar">👤</span><span>'+esc(firstName)+'</span>';
    button.setAttribute('aria-label','Customer profile for '+(user.name||'Customer'));
    button.title='Open your customer profile and requests';
    api('/api/customer/profile-photo').then(photo=>{
      const avatar=$('customerNavAvatar');
      if(avatar&&photo.photo_url)avatar.innerHTML='<img src="'+esc(mediaUrl(photo.photo_url))+'" alt="">';
    }).catch(()=>{});
  }else{
    button.textContent='Customer Login';
    button.setAttribute('aria-label','Customer login');
    button.title='Sign in to your customer account';
  }
}
const providers=[
{name:'Kamara Electricals',service:'Electrical',region:'Western Area',district:'Western Area Urban',area:'Lumley',address:'Lumley, Freetown',price:'From SLE 250',rating:'4.9',reviews:28,initials:'KE',plan:'Pro',featured:true,completed:127,completion:'98%',verified:true,desc:'Wiring, installations, repairs and troubleshooting.'},
{name:"Joe's Plumbing",service:'Plumbing',region:'Western Area',district:'Western Area Urban',area:'Aberdeen',address:'Aberdeen, Freetown',price:'From SLE 200',rating:'4.8',reviews:19,initials:'JP',plan:'Free',featured:false,completed:43,completion:'96%',verified:true,desc:'Leaks, pipes, bathroom fittings and emergency plumbing.'},
{name:'AM Tech Solutions',service:'IT & Computer',region:'Western Area',district:'Western Area Rural',area:'Hill Station',address:'Hill Station, Freetown',price:'From SLE 300',rating:'4.9',reviews:34,initials:'AT',plan:'Business',featured:true,completed:214,completion:'99%',verified:true,desc:'Computer repair, networking, software and technology support.'},
{name:'Clean Salone',service:'Cleaning',region:'Western Area',district:'Western Area Urban',area:'Central Freetown',address:'Freetown',price:'From SLE 180',rating:'4.7',reviews:16,initials:'CS',plan:'Free',featured:false,completed:31,completion:'94%',verified:false,desc:'Home, office and move-in cleaning services.'},
{name:'Mobile Doctor SL',service:'Phone Repair',region:'Western Area',district:'Western Area Urban',area:'Congo Town',address:'Congo Town, Freetown',price:'From SLE 150',rating:'4.8',reviews:22,initials:'MD',plan:'Pro',featured:false,completed:89,completion:'97%',verified:true,desc:'Screen, battery, charging-port and software repairs.'},
{name:'Bai Motors',service:'Auto Repair',region:'Southern',district:'Bo',area:'Bo Town',address:'Bo, Sierra Leone',price:'From SLE 350',rating:'4.6',reviews:13,initials:'BM',plan:'Free',featured:false,completed:27,completion:'92%',verified:false,desc:'Diagnostics, servicing, brakes and general vehicle repairs.'}
];
const categories=[
  ['🔧','Plumbing','Leaks, pipes & fittings','Plumbing'],
  ['💡','Electrical','Wiring & installations','Electrical'],
  ['🏠','General Home','Home maintenance & repairs','home'],
  ['🪜','Roofing','Roof & gutter repairs','roof'],
  ['🧊','Appliance Repair','Appliances & devices','appliance'],
  ['🚨','Emergency Services','Urgent repair help','emergency'],
  ['💻','IT & Computer','Computer repair, software & tech support','computer'],
  ['🧹','Cleaning','Domestic & commercial cleaning','Cleaning'],
  ['🪚','Carpentry','Woodwork, doors & furniture','Carpentry'],
  ['🖌️','Painting','Indoor & outdoor painting','Painting'],
  ['🪲','Pest Control','Pest inspection & treatment','Pest Control'],
  ['🚚','Moving & Delivery','Moving, delivery & transport','moving'],
  ['💇','Beauty & Grooming','Hair, beauty, barbering & grooming','beauty'],
  ['❄️','AC & Refrigerator','Air conditioner & refrigerator repair','refrigerator'],
  ['⚡','Generator Service & Repair','Generator servicing & repairs','generator'],
  ['📹','CCTV & Security Systems','CCTV cameras, alarms & access control','cctv'],
  ['🧑‍🏭','Welding & Metal Work','Welding, fabrication, gates & metalwork','welding'],
  ['🔋','Solar & Inverter Systems','Solar panels, inverters & backup power','solar'],
  ['🧱','Tiling & Masonry','Tiling, block work & masonry','tiling'],
  ['🚗','Auto Repair & Mechanic','Vehicle diagnosis & mechanical repairs','auto repair'],
  ['🌿','Landscaping & Gardening','Garden design, lawn care & landscaping','landscaping'],
  ['🚰','Water Tank & Well Services','Water tanks, wells & pump services','water tank']
];
const districts={'Western Area':['Western Area Urban','Western Area Rural'],'Eastern':['Kailahun','Kenema','Kono'],'Northern':['Bombali','Falaba','Koinadugu','Tonkolili'],'North West':['Kambia','Karene','Port Loko'],'Southern':['Bo','Bonthe','Moyamba','Pujehun']};
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const modal=$('modal'),body=$('modalBody');
let liveProviders=[];
let visibleProviders=[];
let providerNotificationPoll=null;
let liveProvidersLoadedAt=0;
let liveProvidersQueryKey='';
let liveProvidersPromise=null;
async function loadLiveProviders(force=false){
  const r=$('region').value;
  const d=$('district').value;
  const queryKey=[r||'',d||''].join('|');
  if(!force&&liveProvidersLoadedAt&&queryKey===liveProvidersQueryKey&&Date.now()-liveProvidersLoadedAt<15000)return true;
  if(liveProvidersPromise)return liveProvidersPromise;
  liveProvidersPromise=(async()=>{
  try{
    const params=new URLSearchParams();
    if(r&&r!=='All regions')params.set('region',r);
    if(d)params.set('district',d);
    const rows=await api('/api/providers'+(params.toString()?'?'+params.toString():''));
    liveProviders=rows.map(x=>({
      id:x.id,userId:x.user_id,name:x.business_name||x.full_name,profile_photo_url:x.profile_photo_url||null,service:x.service_name,serviceId:x.service_id,
      region:x.region,district:x.district,area:x.area,address:x.service_address,rating:x.rating,review_count:x.review_count,
      price:x.price_sle!=null?('SLE '+Number(x.price_sle).toLocaleString()):'Quote required',
      rating:x.rating!=null?String(x.rating):'—',reviews:Number(x.review_count||0),initials:(x.business_name||x.full_name||'FI').split(/\\s+/).map(v=>v[0]).slice(0,2).join('').toUpperCase(),
      plan:'Free',featured:false,completed:0,completion:'—',verified:x.verification_status==='verified',
      desc:x.service_description||'Local FixIt Salone service provider.',pricingType:x.pricing_type
    }));
    liveProvidersLoadedAt=Date.now();
    liveProvidersQueryKey=queryKey;
    return true;
  }catch(e){
    liveProviders=[];
    liveProvidersLoadedAt=Date.now();
    liveProvidersQueryKey=queryKey;
    return false;
  }
  })();
  try{return await liveProvidersPromise}
  finally{liveProvidersPromise=null}
}
function activeProviders(){return liveProviders.length?liveProviders:providers}
function openModal(html){if(providerNotificationPoll){clearInterval(providerNotificationPoll);providerNotificationPoll=null}body.innerHTML=html;modal.hidden=false} function closeModal(){if(providerNotificationPoll){clearInterval(providerNotificationPoll);providerNotificationPoll=null}modal.hidden=true} window.closeModal=closeModal;
function updateDistricts(){const r=$('region').value,d=$('district'),list=districts[r]||[];d.innerHTML='<option value="">All districts</option>'+list.map(x=>'<option>'+esc(x)+'</option>').join('');d.disabled=!list.length;render()}window.updateDistricts=updateDistricts;
async function render(){
  const ok=await loadLiveProviders();
  const source=activeProviders();
  const q=$('search').value.trim().toLowerCase(),r=$('region').value,d=$('district').value;
  const list=source.filter(p=>(!q||Object.values(p).join(' ').toLowerCase().includes(q))&&(r==='All regions'||p.region===r)&&(!d||p.district===d));
  visibleProviders=list;
  $('count').textContent=list.length+' provider'+(list.length===1?'':'s')+' found'+(ok?'':' · demo data');
  $('providerGrid').innerHTML=list.map((p,i)=>'<article class="card">'+(p.featured?'<div class="featured-badge">⭐ Featured</div>':'')+'<div class="top"><div class="avatar">'+(p.profile_photo_url?'<img src="'+esc(p.profile_photo_url)+'" alt="'+esc(p.name)+' profile photo">':esc(p.initials))+'</div><div><h3>'+esc(p.name)+'</h3><div class="meta">'+esc(p.service)+' · '+esc(p.region)+' · '+esc(p.district)+'</div><div class="stars">'+(p.rating==='—'?'':'★★★★★ ')+'<span class="meta">'+esc(p.rating)+(p.reviews?' ('+p.reviews+')':'')+'</span></div></div></div><div class="price">'+esc(p.price)+'</div><div class="desc">'+esc(p.desc)+'</div><div class="meta">📍 '+esc(p.address||p.area)+'</div><div class="trust-line">'+(p.verified?'<span class="verified-badge" title="Verified provider"><span class="verified-check">✓</span> Verified</span>':'')+' · '+(Number(p.completed)>0?esc(String(p.completed))+' jobs · '+esc(p.completion)+' completion':'New provider')</div><div class="actions"><button class="profile-btn" data-index="'+i+'">View profile</button><button class="request-btn" data-index="'+i+'">Request</button></div></article>').join('')||'<div class="card"><h3>No providers found</h3><p class="desc">'+(ok?'No live providers match your search yet.':'The live marketplace could not be reached. Demo providers are available when no live data is returned.')+'</p></div>';
}
let categoryCarouselIndex=0;
let categoryCarouselTimer=null;
function renderCategories(){
  const host=$('categories');
  if(!host)return;
  const pageSize=6;
  const pages=[];
  for(let i=0;i<categories.length;i+=pageSize)pages.push(categories.slice(i,i+pageSize));
  categoryCarouselIndex=0;
  host.classList.add('categories-carousel');
  host.innerHTML=
    '<div class="category-carousel-track" id="categoryCarouselTrack" aria-label="Quick service categories">'+
    pages.map((page,pageIndex)=>
      '<div class="category-carousel-page" data-page="'+pageIndex+'"><div class="category-page-grid">'+
      page.map((c,localIndex)=>{
        const categoryIndex=pageIndex*pageSize+localIndex;
        const item=siteImages[siteImageKey(c[1])];
        const art=item&&item.image_url?'<img class="category-image" src="'+esc(mediaUrl(item.image_url))+'" alt="" loading="lazy">':'<span class="category-emoji" aria-hidden="true">'+c[0]+'</span>';
        return '<button type="button" class="category-btn category-tone-'+((categoryIndex%4)+1)+'" data-service="'+esc(c[3]||c[1])+'" title="'+esc(c[2])+'" aria-label="'+esc(c[1]+': '+c[2])+'"><span class="category-art">'+art+'</span><b>'+esc(c[1])+'</b></button>';
      }).join('')+
      '</div></div>'
    ).join('')+
    '</div>'+
    '<div class="category-carousel-dots" role="tablist" aria-label="Quick category pages">'+
    pages.map((page,index)=>'<button type="button" class="category-carousel-dot'+(index===0?' is-active':'')+'" data-category-page="'+index+'" role="tab" aria-label="Show category page '+(index+1)+'" aria-selected="'+(index===0?'true':'false')+'"></button>').join('')+
    '</div>';

  const track=$('categoryCarouselTrack');
  const updateDots=()=>{
    const pageWidth=track.clientWidth||1;
    const nextIndex=Math.max(0,Math.min(pages.length-1,Math.round(track.scrollLeft/pageWidth)));
    categoryCarouselIndex=nextIndex;
    host.querySelectorAll('.category-carousel-dot').forEach((dot,index)=>{
      const active=index===nextIndex;
      dot.classList.toggle('is-active',active);
      dot.setAttribute('aria-selected',active?'true':'false');
    });
  };
  const goToPage=(index,smooth=true)=>{
    if(!track||!pages.length)return;
    const safeIndex=(index+pages.length)%pages.length;
    categoryCarouselIndex=safeIndex;
    track.scrollTo({left:safeIndex*track.clientWidth,behavior:smooth?'smooth':'auto'});
    updateDots();
  };
  track.addEventListener('scroll',updateDots,{passive:true});
  host.querySelectorAll('.category-carousel-dot').forEach(dot=>{
    dot.addEventListener('click',()=>goToPage(Number(dot.dataset.categoryPage)));
  });
  track.addEventListener('touchstart',()=>{if(categoryCarouselTimer)clearInterval(categoryCarouselTimer)},{passive:true});
  track.addEventListener('touchend',()=>{
    if(categoryCarouselTimer)clearInterval(categoryCarouselTimer);
    if(pages.length>1)categoryCarouselTimer=setInterval(()=>goToPage(categoryCarouselIndex+1),4500);
  },{passive:true});
  if(categoryCarouselTimer)clearInterval(categoryCarouselTimer);
  if(pages.length>1)categoryCarouselTimer=setInterval(()=>goToPage(categoryCarouselIndex+1),4500);
}
function updateHomeGreeting(){
  const heading=$('homeGreeting');
  if(!heading)return;
  let user=null;try{user=JSON.parse(localStorage.getItem('fixit_customer')||'null')}catch{}
  if(authToken()&&user&&user.role==='customer'){
    const first=String(user.name||'there').trim().split(/\s+/)[0]||'there';
    heading.textContent='Welcome, '+first+'!';
  }else{
    heading.innerHTML='Find the right help, <em>right here.</em>';
  }
}
async function loadCustomerHomeJobs(){
  const section=$('homeActiveJobs'),container=$('activeJobs');
  if(!section||!container)return;
  let user=null;try{user=JSON.parse(localStorage.getItem('fixit_customer')||'null')}catch{}
  if(!authToken()||!user||user.role!=='customer'){
    section.hidden=true;container.innerHTML='';return;
  }
  section.hidden=false;
  container.innerHTML='<p class="home-jobs-loading">Loading your jobs…</p>';
  try{
    const rows=await api('/api/service-requests/mine');
    const active=(Array.isArray(rows)?rows:[]).filter(job=>['requested','quoted','approved','in_progress'].includes(job.status)).slice(0,8);
    if(!active.length){
      container.innerHTML='<article class="home-job-empty"><span class="home-job-empty-icon" aria-hidden="true">▤</span><h3>No active jobs yet</h3><p>Your requests and provider updates will appear here.</p><button class="btn home-empty-book" type="button" onclick="browseServices()">Book Now</button></article>';
      return;
    }
    const progress={requested:20,quoted:42,approved:60,in_progress:80};
    container.innerHTML=active.map(job=>{
      const status=String(job.status||'requested');
      return '<article class="active-job-card"><div class="active-job-top"><div class="active-job-art" aria-hidden="true">🛠️</div><div class="active-job-copy"><h3>'+esc(job.service_name||'Service request')+'</h3><p>Status: <b class="home-status">'+esc(status.replaceAll('_',' '))+'</b></p><p class="home-job-provider">Technician: '+esc(job.business_name||job.provider_name||'Awaiting provider')+'</p><p class="home-job-location">📍 '+esc(job.area||job.district||job.region||'Location provided')+'</p></div></div><div class="home-job-progress-heading"><span>Job progress</span><b>'+esc(status.replaceAll('_',' '))+'</b></div><div class="home-job-progress" aria-label="Job progress"><span style="width:'+(progress[status]||20)+'%"></span></div><button class="home-job-detail" type="button" onclick="openMobileJobs()">View Details</button></article>';
    }).join('');
  }catch(e){
    container.innerHTML='<article class="home-job-empty"><h3>Active jobs</h3><p>We could not load your latest requests just now. Open My Jobs to try again.</p><button class="btn home-empty-book" type="button" onclick="openMobileJobs()">View My Jobs</button></article>';
  }
}
function browseServices(){
  render().then(()=>{const target=$('providers');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});});
}
function mobileNavHome(){
  document.querySelectorAll('.mobile-bottom-item').forEach(el=>el.classList.toggle('is-active',el.dataset.nav==='home'));
  window.scrollTo({top:0,behavior:'smooth'});
}
function setMobileNavActive(name){
  document.querySelectorAll('.mobile-bottom-item').forEach(el=>el.classList.toggle('is-active',el.dataset.nav===name));
}
function openMobileJobs(){
  setMobileNavActive('jobs');
  if(!authToken()){customerLogin('login','customer');return;}
  let user=null;try{user=JSON.parse(localStorage.getItem('fixit_customer')||'null')}catch{}
  if(user&&user.role==='provider')providerJobs();else customerRequests();
}
function openMobileInbox(){
  setMobileNavActive('inbox');
  if(!authToken()){customerLogin('login','customer');return;}
  let user=null;try{user=JSON.parse(localStorage.getItem('fixit_customer')||'null')}catch{}
  if(user&&user.role==='provider'){providerNotificationsCenter();return;}
  openModal('<p class="eyebrow">MESSAGE INBOX</p><h2>Your FixIt updates</h2><p>Provider quotes and job updates are available in My Jobs. Direct customer-to-provider chat is not enabled on this website yet.</p><button class="btn" id="mobileInboxJobs">Open My Jobs</button><button class="btn outline" id="mobileInboxSupport">Open FixIt Support Assistant</button><button class="btn outline" id="mobileInboxClose">Done</button>');
  $('mobileInboxJobs').onclick=()=>{closeModal();openMobileJobs();};
  $('mobileInboxSupport').onclick=()=>{closeModal();$('fixitChatButton')?.click();};
  $('mobileInboxClose').onclick=closeModal;
}
function mobileNavProfile(){
  setMobileNavActive('profile');
  customerLogin();
}
window.browseServices=browseServices;
window.mobileNavHome=mobileNavHome;
window.openMobileJobs=openMobileJobs;
window.openMobileInbox=openMobileInbox;
window.mobileNavProfile=mobileNavProfile;
async function showProfile(i){
  const p=visibleProviders[i]||activeProviders()[i];
  if(!p)return;
  if(p.id){
    try{
      const data=await api('/api/providers/'+encodeURIComponent(p.id));
      const profile=data.profile;
      const services=data.services||[];
      openModal('<p class="eyebrow">'+esc(services[0]?.name||p.service)+'</p><h2>'+esc(profile.business_name)+'</h2><p>'+(profile.verification_status==='verified'?'<span class="verified-badge"><span class="verified-check">✓</span> Verified provider</span>':'Verification pending')+'</p><p>'+esc(services[0]?.description||'Local FixIt Salone provider.')+'</p><div class="address-box"><b>📍 Service location</b><br>'+esc(profile.service_address)+'<br><small>'+esc(profile.region)+' · '+esc(profile.district)+' · '+esc(profile.area)+'</small></div><p><b>Services:</b> '+services.map(s=>esc(s.name)).join(', ')+'</p><p><b>Pricing:</b> '+services.map(s=>esc(s.pricing_type.replaceAll('_',' '))+(s.price_sle!=null?' — SLE '+Number(s.price_sle).toLocaleString():'')).join('<br>')+'</p><h3>My Work</h3><div id="profileWork"><p class="quote-note">Loading portfolio…</p></div><div class="profile-safety"><button class="btn" id="modalRequest">Request this provider</button><button class="btn outline" id="modalReport">⚠️ Report</button></div>');
      $('modalRequest').onclick=()=>showRequest(i);$('modalReport').onclick=()=>reportProvider(i);
      loadProviderWork(p.id);
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
    openModal('<p class="eyebrow">'+(u.role==='provider'?'PROVIDER':'CUSTOMER')+' ACCOUNT</p><h2>Welcome back, '+esc(u.name)+'</h2><p>'+esc(u.phone)+'</p>'+(u.role==='customer'?'<div class="profile-photo-editor"><label class="form-label">Profile photo</label><div id="customerPhotoPreview" class="customer-photo-preview">👤</div><input id="customerProfilePhoto" type="file" accept="image/jpeg,image/png,image/webp" class="form-control"><small>JPG, PNG or WEBP, maximum 5 MB.</small><button class="btn" id="uploadCustomerPhoto">Upload profile photo</button><p id="customerPhotoMessage" class="form-message"></p></div>':'')+'<button class="btn" id="accountContinue">Continue</button>'+(u.role==='customer'?'<button class="btn outline" id="myRequests">My requests</button>':'<button class="btn outline" id="providerJobsBtn">Incoming jobs</button>')+'<button class="btn outline" id="accountSignOut">Sign out</button>');
    $('accountContinue').onclick=closeModal;
    if(u.role==='customer'){
      api('/api/customer/profile-photo').then(photo=>{if(photo.photo_url&&$('customerPhotoPreview'))$('customerPhotoPreview').innerHTML='<img src="'+esc(mediaUrl(photo.photo_url))+'" alt="Your profile photo">'}).catch(()=>{});
      $('uploadCustomerPhoto').onclick=async()=>{
        const file=$('customerProfilePhoto').files[0];
        if(!file){$('customerPhotoMessage').textContent='Choose a photo first.';return}
        if(file.size>5*1024*1024){$('customerPhotoMessage').textContent='Photo must be 5 MB or smaller.';return}
        const data=new FormData();data.append('photo',file);
        $('uploadCustomerPhoto').disabled=true;$('customerPhotoMessage').textContent='Uploading photo…';
        try{
          const result=await api('/api/customer/profile-photo',{method:'POST',body:data});
          $('customerPhotoPreview').innerHTML='<img src="'+esc(result.photo_url)+'" alt="Your profile photo">';
          updateCustomerAccountButton();
          $('customerPhotoMessage').textContent=result.message||'Profile photo updated.';
        }catch(e){$('customerPhotoMessage').textContent=e.message}
        finally{$('uploadCustomerPhoto').disabled=false}
      };
    }
    if(u.role==='customer')$('myRequests').onclick=customerRequests; else $('providerJobsBtn').onclick=providerJobs;
    $('accountSignOut').onclick=()=>{clearAuth();customerLogin('login',role)};
    return;
  }
  const isProvider=role==='provider';
  const title=isProvider?'Provider':'Customer';
  const action=mode==='register'?'Create account':'Sign in';
  openModal('<p class="eyebrow">'+title.toUpperCase()+' ACCOUNT</p><h2>'+action+'</h2>'+
    (mode==='register'?'<label class="form-label">Full name</label><input id="authName" class="form-control" placeholder="Your full name">':'')+
    '<label class="form-label">Phone number</label><div class="phone-entry"><span>🇸🇱 +232</span><input id="authPhone" class="form-control" placeholder="76 123 456" autocomplete="tel" inputmode="tel"></div><small class="quote-note">Enter the 8 digits after +232, or type your full number.</small>'+
    '<label class="form-label">Password</label><input id="authPassword" type="password" class="form-control" placeholder="At least 8 characters" autocomplete="'+(mode==='register'?'new-password':'current-password')+'">'+
    '<button class="btn" id="authSubmit">'+action+'</button>'+
    (mode==='login'?'<button class="btn outline" id="forgotPassword">Forgot password?</button>':'')+
    '<button class="btn outline" id="authSwitch">'+(mode==='register'?'Already have an account? Sign in':'New here? Create an account')+'</button>'+
    '<p id="authMessage" class="form-message"></p>'+
    '<p class="quote-note">Your password is securely stored on the FixIt backend and is never saved in your browser.</p>');
  $('authSubmit').onclick=async()=>{
    const rawPhone=$('authPhone').value.trim(),phoneDigits=rawPhone.replace(/[\s()-]/g,''),phone=/^\+?232/.test(phoneDigits)?(phoneDigits.startsWith('+')?phoneDigits:'+'+phoneDigits):(/^0\d{8}$/.test(phoneDigits)?'+232'+phoneDigits.slice(1):/^\d{8}$/.test(phoneDigits)?'+232'+phoneDigits:phoneDigits),password=$('authPassword').value;
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
function wireLocation(prefix){
  const region=$(prefix+'Region'),district=$(prefix+'District');
  const refresh=()=>{
    const r=region.value,list=districts[r]||[],current=district.value;
    district.innerHTML='<option value="">Select district</option>'+list.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
    district.disabled=!list.length;
    if(list.includes(current))district.value=current;
  };
  region.onchange=refresh;
  refresh();
}
async function showRequest(i){
  if(!authToken()||!localStorage.getItem('fixit_customer')){customerLogin('login','customer');return}
  try{
    const session=await api('/api/auth/me');
    if(session.user.role!=='customer'){
      openModal('<p class="eyebrow">CUSTOMER ACCOUNT REQUIRED</p><h2>Sign in as a customer</h2><p>You are currently signed in with a '+esc(session.user.role)+' account. Provider accounts cannot submit service requests. Sign in with your customer account to continue.</p><button class="btn" id="switchToCustomer">Customer sign in</button><button class="btn outline" id="cancelCustomerSwitch">Cancel</button>');
      $('switchToCustomer').onclick=()=>customerLogin('login','customer');
      $('cancelCustomerSwitch').onclick=closeModal;
      return;
    }
  }catch(e){
    clearAuth();
    customerLogin('login','customer');
    return;
  }
  const p=visibleProviders[i]||activeProviders()[i];
  if(!p)return;
  try{
    const services=await api('/api/services');
    const match=services.find(s=>s.name.toLowerCase()===p.service.toLowerCase());
    if(!match){alert('This service is not yet available in the live marketplace.');return}
    openModal('<p class="eyebrow">SERVICE REQUEST</p><h2>Request '+esc(p.service)+'</h2><p>Provider: <b>'+esc(p.name)+'</b></p>'+locationFields('request')+
      '<label class="form-label">Pricing type</label><select id="quoteType" class="form-control"><option value="starting_price">Starting price</option><option value="fixed_price">Fixed price</option><option value="quote_required">Quote required</option></select>'+
      '<label class="form-label">Job details</label><textarea id="jobDetails" class="form-control" placeholder="Describe the work you need..."></textarea>'+
      '<label class="form-label">Photos (optional, up to 5)</label><div class="upload-choice"><label class="btn outline" for="jobPhotos">📁 Choose photo</label><label class="btn outline" for="jobCamera">📷 Take photo</label></div><input id="jobPhotos" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden><input id="jobCamera" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><p class="quote-note">Choose an existing photo or take a new photo with your camera.</p>'+
      '<p class="quote-note">Final price must be approved before payment. FixIt fee: 1%.</p><button class="btn" id="submitRequest">Send request</button>');
    wireLocation('request');
    $('submitRequest').onclick=()=>submitRequest(p,match.id);
  }catch(e){alert(e.message)}
}
async function submitRequest(provider,serviceId){
  const r=$('requestRegion').value,d=$('requestDistrict').value,a=$('requestArea').value.trim(),addr=$('requestAddress').value.trim(),directions=$('requestDirections').value.trim(),details=$('jobDetails').value.trim(),files=[...$('jobPhotos').files,...$('jobCamera').files];
  if(!r||!d||!a||!addr||!details){alert('Please complete your region, district, area, address and job details.');return}
  if(files.length>5){alert('Maximum 5 photos.');return}
  for(const f of files)if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024){alert('Each photo must be JPG, PNG or WEBP and 3 MB or less.');return}
  $('submitRequest').disabled=true;
  try{
    const session=await api('/api/auth/me');
    if(session.user.role!=='customer'){
      clearAuth();
      openModal('<p class="eyebrow">CUSTOMER ACCOUNT REQUIRED</p><h2>Please sign in as a customer</h2><p>The account currently signed in is a '+esc(session.user.role)+' account. Sign in with your customer account before submitting this request.</p><button class="btn" id="requestCustomerSignIn">Customer sign in</button>');
      $('requestCustomerSignIn').onclick=()=>customerLogin('login','customer');
      return;
    }
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
    loadCustomerHomeJobs();
    openModal('<p class="eyebrow">REQUEST SUBMITTED</p><h2>Your request is live</h2><p>Request ID: <b>'+esc(created.id)+'</b></p><p>📍 '+esc(a)+', '+esc(addr)+'</p><p>'+(files.length?files.length+' photo'+(files.length===1?'':'s')+' attached. ':'')+'The provider can now review the job and respond.</p><button class="btn" id="closeRequest">Done</button>');
    $('closeRequest').onclick=closeModal;
  }catch(e){
    $('submitRequest').disabled=false;
    if(/invalid or expired session|authentication required|account not found/i.test(e.message||'')){
      clearAuth();
      openModal('<p class="eyebrow">SESSION EXPIRED</p><h2>Please sign in again</h2><p>Your FixIt Salone sign-in session has expired. Your request was not submitted. Sign in with your customer account, then send the request again.</p><button class="btn" id="requestSignIn">Customer sign in</button>');
      $('requestSignIn').onclick=()=>customerLogin('login','customer');
      return;
    }
    alert(e.message);
  }
}

async function reviewCompletedJob(id){
  openModal(
    '<p class="eyebrow">RATE YOUR EXPERIENCE</p><h2>How was the job?</h2>' +
    '<p>Your review helps other customers choose reliable providers.</p>' +
    '<label class="form-label">Rating</label>' +
    '<select id="reviewRating" class="form-control">' +
      '<option value="5">★★★★★ Excellent</option>' +
      '<option value="4">★★★★ Very good</option>' +
      '<option value="3">★★★ Good</option>' +
      '<option value="2">★★ Needs improvement</option>' +
      '<option value="1">★ Poor</option>' +
    '</select>' +
    '<label class="form-label">Review (optional)</label>' +
    '<textarea id="reviewText" class="form-control" maxlength="1000" placeholder="Tell us about the provider\'s work..."></textarea>' +
    '<button class="btn" id="submitReview">Submit review</button>' +
    '<button class="btn outline" id="reviewBack">Back</button>'
  );

  $('submitReview').onclick=async()=>{
    const btn=$('submitReview');
    btn.disabled=true;
    try{
      await api('/api/service-requests/'+encodeURIComponent(id)+'/review',{
        method:'POST',
        body:JSON.stringify({
          rating:Number($('reviewRating').value),
          review_text:$('reviewText').value.trim()
        })
      });
      openModal(
        '<p class="eyebrow">THANK YOU</p><h2>Review submitted ⭐</h2>' +
        '<p>Your feedback has been recorded.</p>' +
        '<button class="btn" id="reviewDone">Done</button>'
      );
      $('reviewDone').onclick=customerRequests;
    }catch(e){
      alert(e.message);
      btn.disabled=false;
    }
  };

  $('reviewBack').onclick=customerRequests;
}
window.reviewCompletedJob=reviewCompletedJob;
function renderJobProgressTracker(status){
  const key=String(status||'requested').toLowerCase();
  if(key==='cancelled'||key==='declined'){
    const terminal=key==='cancelled'?'This request was cancelled.':'This request was declined.';
    return '<div class="job-progress-terminal">'+terminal+'</div>';
  }
  const stages=[
    {key:'requested',label:'Requested'},
    {key:'quoted',label:'Quoted'},
    {key:'approved',label:'Approved'},
    {key:'in_progress',label:'In progress'},
    {key:'completed',label:'Completed'}
  ];
  const currentByStatus={requested:0,quoted:1,approved:2,in_progress:3,completed:4};
  const current=Object.prototype.hasOwnProperty.call(currentByStatus,key)?currentByStatus[key]:0;
  const percent=[20,40,60,82,100][current];
  const title=stages[current].label;
  return '<div class="job-progress-panel"><div class="job-progress-heading"><span>Job progress</span><b>'+title+'</b></div>'+
    '<div class="job-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+
    '<div class="job-progress-steps">'+stages.map((stage,index)=>'<div class="job-progress-step"><span class="job-progress-dot'+(index<=current?' is-done':'')+(index===current?' is-current':'')+'"></span><small>'+stage.label+'</small></div>').join('')+'</div></div>';
}

async function customerRequests(){
  if(!authToken()){customerLogin('login','customer');return}
  try{
    const me=await api('/api/auth/me');
    if(me.user.role!=='customer')throw new Error('Please sign in with a customer account to view your requests.');
    const requests=await api('/api/service-requests/mine');
    const cards=requests.length?requests.map(r=>{
      const quote=r.quoted_amount!=null?'<div class="quote-panel quote-ready"><div class="quote-panel-top"><span class="quote-kicker">SERVICE QUOTATION</span><span class="quote-status">'+(r.status==='approved'?'Approved':r.status==='declined'?'Declined':r.status==='cancelled'?'Cancelled':'Awaiting your decision')+'</span></div><div class="quote-breakdown"><div><span>Labour</span><b>SLE '+Number(r.labour_amount||0).toLocaleString()+'</b></div><div><span>Materials</span><b>SLE '+Number(r.materials_amount||0).toLocaleString()+'</b></div><div><span>Transport</span><b>SLE '+Number(r.transport_amount||0).toLocaleString()+'</b></div></div><div class="quote-grand-total"><span>Total quote</span><strong class="quote-total">SLE '+Number(r.quoted_amount).toLocaleString()+'</strong></div><small class="quote-help">Review the itemized costs. Approve only if you agree with the final total.</small></div>':'<div class="quote-panel quote-pending"><span class="quote-kicker">SERVICE QUOTATION</span><strong class="quote-awaiting">Awaiting provider quote</strong><small class="quote-help">The provider will send a breakdown of labour, materials and transport.</small></div>';
      const actions=[];
      if(r.status==='quoted')actions.push('<button class="btn" data-customer-job="'+esc(r.id)+'" data-customer-action="approve">Approve quote</button>','<button class="btn outline quote-decline" data-customer-job="'+esc(r.id)+'" data-customer-action="decline">Decline quote</button>');
      if(r.status==='approved')actions.push('<button class="btn" data-customer-job="'+esc(r.id)+'" data-customer-action="pay">Prepare payment</button>');
      if(r.status==='completed')actions.push('<button class="btn" data-customer-job="'+esc(r.id)+'" data-customer-action="review">Rate provider ⭐</button>');
      if(['requested','quoted','approved','in_progress'].includes(r.status))actions.push('<button class="btn outline" data-customer-job="'+esc(r.id)+'" data-customer-action="cancel">Cancel</button>');
      return '<article class="job-card"><div class="job-head"><div><b>'+esc(r.service_name||'Service')+'</b><small>'+esc(r.created_at?new Date(r.created_at).toLocaleString():'')+'</small></div><span class="status-pill">'+esc(r.status.replaceAll('_',' '))+'</span></div>'+renderJobProgressTracker(r.status)+'<p><b>Provider:</b> '+esc(r.business_name||r.provider_name||'Provider')+'</p><p><b>Location:</b> '+esc(r.area)+', '+esc(r.district)+', '+esc(r.region)+'<br>'+esc(r.service_address)+'</p><p><b>Job:</b> '+esc(r.job_details)+'</p><p><b>Quote:</b> '+'</p>'+quote+'<button class="btn outline" data-customer-job="'+esc(r.id)+'" data-customer-action="photos">View job photos</button>'+actions.join('')+'</article>';
    }).join(''):'<div class="card"><h3>No requests yet</h3><p class="desc">Your service requests will appear here.</p></div>';
    openModal('<p class="eyebrow">MY REQUESTS</p><h2>Your FixIt jobs</h2><p class="quote-note">Review provider quotes here. Payment will only be requested after you approve the final quote.</p><div class="job-list">'+cards+'</div><button class="btn outline" id="closeCustomerRequests">Done</button>');
    document.querySelectorAll('[data-customer-action]').forEach(btn=>btn.onclick=async()=>{
      try{
        if(btn.dataset.customerAction==='photos'){
          const photos=await api('/api/service-requests/'+encodeURIComponent(btn.dataset.customerJob)+'/photos');
          openModal('<p class="eyebrow">JOB PHOTOS</p><h2>Photos for this request</h2>'+(photos.length?'<div class="photo-grid">'+photos.map(p=>'<a href="'+esc(mediaUrl(p.file_url))+'" target="_blank" rel="noopener"><img src="'+esc(mediaUrl(p.file_url))+'" alt="Job photo"></a>').join('')+'</div>':'<p>No photos attached to this request.</p>')+'<button class="btn outline" id="closePhotos">Done</button>');$('closePhotos').onclick=()=>customerRequests();return;
        }
        if(btn.dataset.customerAction==='review'){reviewCompletedJob(btn.dataset.customerJob);return;}
        if(btn.dataset.customerAction==='decline'){if(!confirm('Decline this quote? The provider will be notified that you do not wish to proceed.'))return;await api('/api/service-requests/'+encodeURIComponent(btn.dataset.customerJob)+'/status',{method:'PATCH',body:JSON.stringify({status:'declined'})});customerRequests();return;}
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
async function loadProviderWork(providerId){
  const box=$('profileWork'); if(!box)return;
  try{
    const work=await api('/api/providers/'+encodeURIComponent(providerId)+'/work');
    box.innerHTML=work.length?'<div class="photo-grid">'+work.map(w=>w.media_type==='video'
      ? '<figure class="work-card"><video src="'+esc(mediaUrl(w.file_url))+'" controls preload="metadata"></video><figcaption>'+esc(w.caption)+'</figcaption></figure>'
      : '<figure class="work-card"><img src="'+esc(mediaUrl(w.file_url))+'" alt="'+esc(w.caption)+'"><figcaption>'+esc(w.caption)+'</figcaption></figure>').join('')+'</div>'
      : '<p class="quote-note">No portfolio items yet.</p>';
  }catch(e){box.innerHTML='<p class="quote-note">Portfolio could not be loaded.</p>'}
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
    if(!profile.profile){
      openModal('<p class="eyebrow">PROVIDER PORTAL</p><h2>Complete your provider profile</h2><p>Your provider account is ready, but your business profile has not been created yet. Add your business name, location and main service before receiving customer requests.</p><button class="btn" id="setupProviderProfile">Set up provider profile</button><button class="btn outline" id="providerPortalBack">Back</button>');
      $('setupProviderProfile').onclick=providerProfile;
      $('providerPortalBack').onclick=closeModal;
      return;
    }
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
      '<button class="btn" id="manageJobs">Manage incoming jobs</button><button class="btn outline" id="editProviderProfile">Edit profile & services</button><button class="btn outline" id="managePortfolio">Manage portfolio</button><button class="btn outline" id="refreshProvider">Refresh dashboard</button>');
    $('manageJobs').onclick=()=>providerJobs();
    $('editProviderProfile').onclick=()=>providerProfile();
    $('managePortfolio').onclick=()=>providerPortfolio();
    $('refreshProvider').onclick=()=>providerPortal();
    $('providerNotifications').onclick=()=>providerNotificationsCenter();
    if($('subscribeProvider'))$('subscribeProvider').onclick=()=>subscriptionCenter();
    providerNotificationPoll=setInterval(async()=>{
      if(modal.hidden||!$('providerNotifications')){clearInterval(providerNotificationPoll);providerNotificationPoll=null;return}
      try{
        const latest=await api('/api/provider/notifications');
        const count=latest.filter(n=>!n.is_read).length;
        const button=$('providerNotifications');
        if(button)button.textContent='Notifications'+(count?' ('+count+')':'');
      }catch(e){console.warn('Notification refresh failed:',e.message)}
    },15000);
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
async function subscriptionCenter(){
  try{
    const data=await api('/api/provider/subscription');
    const active=data.subscription;
    const pending=data.payments?.find(p=>p.status==='pending'||p.status==='processing');
    openModal('<p class="eyebrow">PROVIDER SUBSCRIPTION</p><h2>'+ (active?'Your subscription is active':'Choose your FixIt plan') +'</h2>'+
      (active?'<div class="card"><b>'+esc(active.plan_name)+' plan</b><p class="desc">Active until '+esc(new Date(active.expires_at).toLocaleDateString())+'. You receive unlimited referrals and 0% FixIt fee while active.</p></div>':'<p>Your first <b>3 customer referrals are free</b>. After that, request details stay locked until you activate a paid plan.</p>')+
      '<div class="plan-grid">'+
      '<div><b>FREE</b><strong>SLE 0 / month</strong><small>3 referrals · 1% FixIt fee</small></div>'+
      '<div><b>PRO</b><strong>SLE 20 / month</strong><small>Unlimited referrals · 0% fee</small><button class="btn" data-subscribe-plan="Pro" '+(active?'disabled':'')+'>Choose Pro</button></div>'+
      '<div><b>BUSINESS</b><strong>SLE 40 / month</strong><small>Unlimited referrals · 0% fee</small><button class="btn" data-subscribe-plan="Business" '+(active?'disabled':'')+'>Choose Business</button></div>'+
      '<div><b>PREMIUM</b><strong>SLE 60 / month</strong><small>Unlimited referrals · 0% fee</small><button class="btn" data-subscribe-plan="Premium" '+(active?'disabled':'')+'>Choose Premium</button></div></div>'+
      (pending?'<div class="card"><b>Payment request pending</b><p class="desc">'+esc(pending.plan_name)+' · SLE '+Number(pending.amount_sle).toLocaleString()+'</p><small>We have recorded your subscription request. Live Orange Money payment is not connected yet.</small></div>':'')+
      '<p class="quote-note">Payment gateway status: <b>Not connected</b>. This step records the subscription request safely; no money is collected until Orange Money is connected.</p><button class="btn outline" id="subscriptionBack">Back</button>');
    document.querySelectorAll('[data-subscribe-plan]').forEach(btn=>btn.onclick=async()=>{
      const plan=btn.dataset.subscribePlan;
      btn.disabled=true;
      try{
        const result=await api('/api/provider/subscription/request',{method:'POST',body:JSON.stringify({plan_name:plan})});
        alert(result.message);
        subscriptionCenter();
      }catch(e){alert(e.message);btn.disabled=false}
    });
    $('subscriptionBack').onclick=providerPortal;
  }catch(e){alert(e.message)}
}

async function providerPortfolio(){
  try{
    const profile=await api('/api/providers/me/profile');
    const providerId=profile.profile?.id;
    if(!providerId)throw new Error('Please save your provider profile first.');
    const work=await api('/api/providers/'+encodeURIComponent(providerId)+'/work');
    const items=work.length?work.map(w=>{
      const media=w.media_type==='video'?'<video src="'+esc(mediaUrl(w.file_url))+'" controls preload="metadata"></video>':'<img src="'+esc(mediaUrl(w.file_url))+'" alt="'+esc(w.caption)+'">';
      return '<article class="work-card">'+media+'<b>'+esc(w.caption)+'</b><button class="btn outline" data-work-delete="'+esc(w.id)+'">Delete</button></article>';
    }).join(''):'<p class="quote-note">Your portfolio is empty. Add photos or short videos of completed work to help customers choose you.</p>';
    openModal('<p class="eyebrow">PROVIDER PORTFOLIO</p><h2>Show customers your work</h2><p class="quote-note">Upload clear work photos or short videos. Do not upload IDs or private customer information.</p><label class="form-label">Photo or video</label><input id="workMedia" class="form-control" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"><label class="form-label">Caption</label><input id="workCaption" class="form-control" maxlength="300" placeholder="e.g. Kitchen sink installation in Lumley"><button class="btn" id="uploadWork">Add to portfolio</button><div class="photo-grid" id="myPortfolio">'+items+'</div><button class="btn outline" id="portfolioBack">Back to dashboard</button>');
    $('uploadWork').onclick=async()=>{
      const file=$('workMedia').files[0],caption=$('workCaption').value.trim();
      if(!file){alert('Choose a photo or video first.');return}
      if(!caption){alert('Add a short caption.');return}
      if(file.size>15*1024*1024){alert('Maximum file size is 15MB.');return}
      const fd=new FormData();fd.append('media',file);fd.append('caption',caption);$('uploadWork').disabled=true;
      try{await api('/api/providers/'+encodeURIComponent(providerId)+'/work',{method:'POST',body:fd});providerPortfolio()}catch(e){alert(e.message);$('uploadWork').disabled=false}
    };
    document.querySelectorAll('[data-work-delete]').forEach(btn=>btn.onclick=async()=>{
      if(!confirm('Remove this portfolio item?'))return;
      try{await api('/api/providers/'+encodeURIComponent(providerId)+'/work/'+encodeURIComponent(btn.dataset.workDelete),{method:'DELETE'});providerPortfolio()}catch(e){alert(e.message)}
    });
    $('portfolioBack').onclick=providerPortal;
  }catch(e){alert(e.message)}
}
async function providerJobs(){
  try{
    const jobData=await api('/api/provider/requests');
    const requests=jobData.requests||[];
    const cards=requests.length?requests.map(r=>{
      const status=r.status.replaceAll('_',' ');
      const quote=r.quoted_amount!=null?'<div class="quote-panel quote-ready"><div class="quote-panel-top"><span class="quote-kicker">YOUR QUOTATION</span><span class="quote-status">'+esc(status)+'</span></div><div class="quote-breakdown"><div><span>Labour</span><b>SLE '+Number(r.labour_amount||0).toLocaleString()+'</b></div><div><span>Materials</span><b>SLE '+Number(r.materials_amount||0).toLocaleString()+'</b></div><div><span>Transport</span><b>SLE '+Number(r.transport_amount||0).toLocaleString()+'</b></div></div><div class="quote-grand-total"><span>Total quote</span><strong class="quote-total">SLE '+Number(r.quoted_amount).toLocaleString()+'</strong></div><small class="quote-help">Customer approval is required before work starts.</small></div>':'<div class="quote-panel quote-pending"><span class="quote-kicker">QUOTATION</span><strong class="quote-awaiting">Not sent yet</strong><small class="quote-help">Add labour, materials and transport so the customer can review the full breakdown.</small></div>';
      const actions=[];
      if(r.status==='requested')actions.push('<button class="btn" data-job="'+esc(r.id)+'" data-action="quote">Send quote</button>','<button class="btn outline" data-job="'+esc(r.id)+'" data-action="decline">Decline</button>');
      if(r.status==='approved')actions.push('<button class="btn" data-job="'+esc(r.id)+'" data-action="start">Start job</button>');
      if(r.status==='in_progress')actions.push('<button class="btn" data-job="'+esc(r.id)+'" data-action="complete">Mark completed</button>');
      if(['requested','quoted','approved','in_progress'].includes(r.status))actions.push('<button class="btn outline" data-job="'+esc(r.id)+'" data-action="cancel">Cancel</button>');
      return '<article class="job-card"><div class="job-head"><div><b>'+esc(r.service_name||'Service request')+'</b><small>'+esc(r.created_at?new Date(r.created_at).toLocaleString():'')+'</small></div><span class="status-pill">'+esc(status)+'</span></div>'+renderJobProgressTracker(r.status)+'<p><b>Customer:</b> '+esc(r.customer_name||'Customer')+' · '+esc(r.customer_phone||'')+'</p><p><b>Location:</b> '+esc(r.area)+', '+esc(r.district)+', '+esc(r.region)+'<br>'+esc(r.service_address)+(r.directions?'<br><small>Directions: '+esc(r.directions)+'</small>':'')+'</p><p><b>Job:</b> '+esc(r.job_details)+'</p><p><b>Quote:</b> '+'</p>'+quote+'<div class="job-actions"><button class="btn outline" data-job="'+esc(r.id)+'" data-action="photos">View job photos</button>'+actions.join('')+'</div></article>';
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
      openModal('<p class="eyebrow">JOB PHOTOS</p><h2>Customer job photos</h2>'+(photos.length?'<div class="photo-grid">'+photos.map((p,i)=>'<a href="#" class="job-photo-link" data-photo-index="'+i+'" target="_blank" rel="noopener"><span class="job-photo-loading">Loading photo…</span></a>').join(''):'<p>No photos attached.</p>')+'<button class="btn outline" id="closeJobPhotos">Back to jobs</button>');$('closeJobPhotos').onclick=providerJobs;
      const links=body.querySelectorAll('.job-photo-link');
      await Promise.all(photos.map(async(p,i)=>{
        const link=links[i];if(!link)return;
        try{
          const response=await fetch(API_BASE+'/api/service-requests/'+encodeURIComponent(id)+'/photos/'+encodeURIComponent(p.id)+'/file',{headers:{Authorization:'Bearer '+authToken()}});
          if(!response.ok)throw new Error('Photo request failed ('+response.status+').');
          const blob=await response.blob();
          const objectUrl=URL.createObjectURL(blob);
          link.href=objectUrl;link.target='_blank';
          link.innerHTML='<img src="'+objectUrl+'" alt="Customer job photo">';
        }catch(error){
          link.removeAttribute('href');link.innerHTML='<span class="job-photo-loading">Photo unavailable</span>';
          console.error('Unable to load job photo:',error);
        }
      }));
      return;
    }
    if(action==='quote'){
      openModal('<p class="eyebrow">SERVICE QUOTATION</p><h2>Build your quote</h2><p class="quote-note">Enter each cost separately. The total is calculated automatically. Customer approval is required before work starts.</p><div class="quote-entry-card quote-builder"><label class="form-label" for="quoteLabour">Labour (SLE)</label><input id="quoteLabour" class="form-control quote-cost-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" required><label class="form-label" for="quoteMaterials">Materials (SLE)</label><input id="quoteMaterials" class="form-control quote-cost-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" required><label class="form-label" for="quoteTransport">Transport (SLE)</label><input id="quoteTransport" class="form-control quote-cost-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" required><div class="quote-grand-total quote-live-total"><span>Total quotation</span><strong id="quoteCalculatedTotal">SLE 0.00</strong></div></div><p id="providerQuoteMessage" class="form-message"></p><button class="btn" id="sendProviderQuote">Send quotation to customer</button><button class="btn outline" id="cancelProviderQuote">Cancel</button>');
      $('cancelProviderQuote').onclick=providerJobs;
      const quoteCosts=()=>['quoteLabour','quoteMaterials','quoteTransport'].map(key=>Number($(key).value||0));
      const updateQuoteTotal=()=>{const values=quoteCosts();$('quoteCalculatedTotal').textContent='SLE '+values.reduce((a,b)=>a+b,0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})};
      document.querySelectorAll('.quote-cost-input').forEach(input=>input.addEventListener('input',updateQuoteTotal));
      $('sendProviderQuote').onclick=async()=>{
        const [labour_amount,materials_amount,transport_amount]=quoteCosts();const n=labour_amount+materials_amount+transport_amount;
        if([labour_amount,materials_amount,transport_amount].some(v=>!Number.isFinite(v)||v<0)||n<=0){$('providerQuoteMessage').textContent='Enter valid non-negative costs and make sure the total is greater than zero.';return}
        $('sendProviderQuote').disabled=true;$('providerQuoteMessage').textContent='Sending quotation…';
        try{await api('/api/service-requests/'+encodeURIComponent(id)+'/quote',{method:'PATCH',body:JSON.stringify({labour_amount,materials_amount,transport_amount})});providerJobs()}
        catch(e){$('providerQuoteMessage').textContent=e.message;$('sendProviderQuote').disabled=false}
      };
      return;
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
      '<div class="profile-photo-editor"><label class="form-label">Business profile photo</label><div id="providerPhotoPreview" class="customer-photo-preview">🏪</div><input id="providerProfilePhoto" type="file" accept="image/jpeg,image/png,image/webp" class="form-control"><small>JPG, PNG or WEBP, maximum 5 MB. This photo appears on your public provider listing.</small><button class="btn outline" id="uploadProviderPhoto">Upload profile photo</button><p id="providerPhotoMessage" class="form-message"></p></div>'+
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
    api('/api/provider/profile-photo').then(photo=>{if(photo.photo_url&&$('providerPhotoPreview'))$('providerPhotoPreview').innerHTML='<img src="'+esc(mediaUrl(photo.photo_url))+'" alt="Provider profile photo">'}).catch(()=>{});
    $('uploadProviderPhoto').onclick=async()=>{
      const file=$('providerProfilePhoto').files[0];
      if(!file){$('providerPhotoMessage').textContent='Choose a photo first.';return}
      if(file.size>5*1024*1024){$('providerPhotoMessage').textContent='Photo must be 5 MB or smaller.';return}
      const data=new FormData();data.append('photo',file);
      $('uploadProviderPhoto').disabled=true;$('providerPhotoMessage').textContent='Uploading photo…';
      try{
        const result=await api('/api/provider/profile-photo',{method:'POST',body:data});
        $('providerPhotoPreview').innerHTML='<img src="'+esc(result.photo_url)+'" alt="Provider profile photo">';
        $('providerPhotoMessage').textContent=result.message||'Profile photo updated.';
      }catch(e){$('providerPhotoMessage').textContent=e.message}
      finally{$('uploadProviderPhoto').disabled=false}
    };
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
  if(!user||!authToken()){
    openModal('<p class="eyebrow">ACCOUNT VERIFICATION</p><h2>Sign in first</h2><p>Create or sign in to your FixIt account before verifying your phone number or identity.</p><button class="btn" id="verificationLogin">Sign in</button><button class="btn outline" id="verificationDone">Done</button>');
    $('verificationLogin').onclick=()=>{closeModal();customerLogin('login','customer')};$('verificationDone').onclick=closeModal;return;
  }
  openModal('<p class="eyebrow">ACCOUNT VERIFICATION</p><h2>Loading verification…</h2><p>Please wait.</p>');
  let status={phone_status:'unverified',identity:{status:'unverified'}};
  try{status=await api('/api/verification/'+encodeURIComponent(user.id||''))}catch{}
  const phoneVerified=status.phone_status==='verified';
  const identityStatus=status.identity?.status||'unverified';
  const identityDone=identityStatus==='verified';
  const identityPending=['pending','under_review'].includes(identityStatus);
  openModal('<p class="eyebrow">ACCOUNT VERIFICATION</p><h2>Build trust on FixIt</h2>'+
    '<div class="verification-steps"><div class="verification-step done"><b>01</b><span><strong>Account</strong><small>Account created</small></span></div>'+
    '<div class="verification-step '+(phoneVerified?'done':'')+'"><b>02</b><span><strong>Phone</strong><small>'+(phoneVerified?'Phone verified':'Verify your phone number')+'</small></span></div>'+
    '<div class="verification-step '+(identityDone?'done':'')+'"><b>03</b><span><strong>Identity</strong><small>'+ (identityDone?'Identity verified':identityPending?'Identity review in progress':'Secure identity verification') +'</small></span></div></div>'+
    '<p class="quote-note">'+(phoneVerified?'Your phone number is verified. ':'Verify your phone before submitting KYC. ')+(identityDone?'Your identity is verified and private.':identityPending?'Your identity documents are encrypted and waiting for Trust & Safety review.':'Your ID and selfie are encrypted before storage and are only accessible to authorized Trust & Safety administrators.')+'</p>'+
    (phoneVerified?'<button class="btn" disabled>Phone verified ✓</button>':'<button class="btn" id="phoneVerifyBtn">Send verification code</button>')+
    (identityDone?'<button class="btn" disabled>Identity verified ✓</button>':identityPending?'<button class="btn" disabled>Identity review pending</button>':'<button class="btn" id="identityVerifyBtn" '+(phoneVerified?'':'disabled')+'>Submit identity verification</button>')+
    '<button class="btn outline" id="verificationDone">Done</button>');
  if(!phoneVerified)$('phoneVerifyBtn').onclick=phoneVerification;
  if($('identityVerifyBtn'))$('identityVerifyBtn').onclick=submitIdentityVerification;
  $('verificationDone').onclick=closeModal;
}
async function submitIdentityVerification(){
  openModal('<p class="eyebrow">SECURE KYC</p><h2>Verify your identity</h2><p>Your identity document and selfie are encrypted before they are stored. They are not displayed publicly.</p>'+
    '<label class="form-label">Document type</label><select id="kycDocumentType" class="form-control"><option value="national_id">National ID</option><option value="passport">Passport</option><option value="drivers_license">Driver\'s licence</option><option value="voter_id">Voter ID</option></select>'+
    '<label class="form-label">Identity document</label><div class="upload-choice"><label class="btn outline" for="kycDocument">📁 Choose file</label><label class="btn outline" for="kycDocumentCamera">📷 Take photo</label></div><input id="kycDocument" class="form-control" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden><input id="kycDocumentCamera" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><p class="quote-note">Choose an existing ID file or take a photo of your ID.</p>'+
    '<label class="form-label">Selfie</label><div class="upload-choice"><label class="btn outline" for="kycSelfie">📁 Choose photo</label><label class="btn outline" for="kycSelfieCamera">📷 Take selfie</label></div><input id="kycSelfie" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" hidden><input id="kycSelfieCamera" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" capture="user" hidden><p class="quote-note">Choose an existing selfie or take one with your front camera.</p>'+
    '<p class="quote-note">Maximum 5MB per file. Do not upload another person\'s ID or any document you are not authorized to provide.</p><button class="btn" id="submitKyc">Submit securely</button><button class="btn outline" id="kycBack">Back</button><p id="kycMessage" class="form-message"></p>');
  $('submitKyc').onclick=async()=>{
    const documentFile=$('kycDocument').files[0]||$('kycDocumentCamera').files[0],selfie=$('kycSelfie').files[0]||$('kycSelfieCamera').files[0];
    if(!documentFile||!selfie){$('kycMessage').textContent='Please choose both your identity document and selfie.';return}
    if(documentFile.size>5*1024*1024||selfie.size>5*1024*1024){$('kycMessage').textContent='Each file must be 5MB or smaller.';return}
    const fd=new FormData();fd.append('document_type',$('kycDocumentType').value);fd.append('document',documentFile);fd.append('selfie',selfie);
    $('submitKyc').disabled=true;$('kycMessage').textContent='Encrypting and submitting securely…';
    try{
      const result=await api('/api/verification/identity',{method:'POST',body:fd});
      openModal('<p class="eyebrow">KYC SUBMITTED</p><h2>Identity verification received</h2><p>'+esc(result.message)+'</p><p class="quote-note">Your documents are stored encrypted and will only be accessible to authorized Trust & Safety administrators.</p><button class="btn" id="kycDone">Done</button>');
      $('kycDone').onclick=verificationCenter;
    }catch(e){$('kycMessage').textContent=e.message;$('submitKyc').disabled=false}
  };
  $('kycBack').onclick=verificationCenter;
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
function safetyCenter(){openModal('<p class="eyebrow">TRUST & SAFETY</p><h2>Safety Center</h2><p>FixIt is designed to keep a private identity record while showing only trust signals publicly.</p><div class="safety-list"><div><b>🔵 Verification</b><small>Identity verification status can be stored securely.</small></div><div><b>⚠️ Report an issue</b><small>Use the report button on a provider profile or contact support.</small></div><div><b>🧾 Job history</b><small>Important job activity can be linked to the customer and provider accounts.</small></div></div><p class="quote-note">Identity documents are encrypted before storage and reviewed privately by authorized Trust & Safety administrators. Phone verification uses real SMS when the configured provider is active.</p><button class="btn" onclick="verificationCenter()">Verify my account</button><button class="btn outline" onclick="closeModal()">Done</button>')}window.safetyCenter=safetyCenter;
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
$('search').addEventListener('input',render);$('region').addEventListener('change',updateDistricts);$('district').addEventListener('change',render);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});renderCategories();updateDistricts();updateCustomerAccountButton();updateMobileAccountAction();updateHomeGreeting();render();loadCustomerHomeJobs();loadPublicSiteImages().then(()=>renderCategories());
$('mobileMenuToggle')?.addEventListener('click',()=>{if($('mobileMenuToggle').getAttribute('aria-expanded')==='true')closeMobileNav();else openMobileNav()});
$('mobileMenuClose')?.addEventListener('click',closeMobileNav);
$('mobileNavBackdrop')?.addEventListener('click',closeMobileNav);
$('mobileNav')?.querySelectorAll('a,button').forEach(el=>el.addEventListener('click',()=>{if(el.id!=='mobileAccountAction')closeMobileNav()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNav()});
window.addEventListener('resize',()=>{if(window.innerWidth>850)closeMobileNav()});
})();