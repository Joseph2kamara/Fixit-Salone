(() => {
'use strict';

const providers = [
 {name:'Kamara Electricals',service:'Electrical',region:'Western Area',district:'Western Area Urban',price:'From SLE 250',rating:'4.9',reviews:28,initials:'KE',desc:'Wiring, installations, repairs and troubleshooting.',work:[{type:'image',src:'',caption:'Electrical installation and wiring project'}]},
 {name:"Joe's Plumbing",service:'Plumbing',region:'Western Area',district:'Western Area Urban',price:'From SLE 200',rating:'4.8',reviews:19,initials:'JP',desc:'Leaks, pipes, bathroom fittings and emergency plumbing.',work:[{type:'image',src:'',caption:'Bathroom plumbing installation'}]},
 {name:'AM Tech Solutions',service:'IT & Computer',region:'Western Area',district:'Western Area Rural',price:'From SLE 300',rating:'4.9',reviews:34,initials:'AT',desc:'Computer repair, networking, software and technology support.',work:[{type:'image',src:'',caption:'Computer and networking setup'}]},
 {name:'Clean Salone',service:'Cleaning',region:'Western Area',district:'Western Area Urban',price:'From SLE 180',rating:'4.7',reviews:16,initials:'CS',desc:'Home, office and move-in cleaning services.',work:[{type:'image',src:'',caption:'Office cleaning project'}]},
 {name:'Mobile Doctor SL',service:'Phone Repair',region:'Western Area',district:'Western Area Urban',price:'From SLE 150',rating:'4.8',reviews:22,initials:'MD',desc:'Screen, battery, charging-port and software repairs.',work:[{type:'image',src:'',caption:'Phone repair project'}]},
 {name:'Bai Motors',service:'Auto Repair',region:'Southern',district:'Bo',price:'From SLE 350',rating:'4.6',reviews:13,initials:'BM',desc:'Diagnostics, servicing, brakes and general vehicle repairs.',work:[{type:'image',src:'',caption:'Vehicle servicing project'}]}
];

const categories=[
 ['🔧','Plumbing','Leaks & pipes'],['⚡','Electrical','Wiring & installs'],
 ['🧹','Cleaning','Home & office'],['📱','Phone Repair','Devices & screens'],
 ['💻','IT & Computer','Tech support'],['🚗','Auto Repair','Mechanics'],
 ['💇','Beauty','Barbers & stylists'],['🏠','Construction','Building & painting']
];

const districts={
 'Western Area':['Western Area Urban','Western Area Rural'],
 'Eastern':['Kailahun','Kenema','Kono'],
 'Northern':['Bombali','Falaba','Koinadugu','Tonkolili'],
 'North West':['Kambia','Karene','Port Loko'],
 'Southern':['Bo','Bonthe','Moyamba','Pujehun']
};

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const modal = $('modal');
const body = $('modalBody');

function openModal(html){ body.innerHTML=html; modal.hidden=false; }
function closeModal(){ modal.hidden=true; }
window.closeModal=closeModal;

function updateDistricts(){
 const region=$('region').value, district=$('district');
 const list=districts[region]||[];
 district.innerHTML='<option value="">All districts</option>'+list.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 district.disabled=list.length===0;
 render();
}
window.updateDistricts=updateDistricts;

function render(){
 const q=$('search').value.trim().toLowerCase();
 const region=$('region').value, district=$('district').value;
 const list=providers.filter(p=>
   (!q || Object.values(p).join(' ').toLowerCase().includes(q)) &&
   (region==='All regions'||p.region===region) &&
   (!district || p.district===district)
 );
 $('count').textContent=list.length+' provider'+(list.length===1?'':'s')+' found';
 $('providerGrid').innerHTML=list.map((p,i)=>'<article class="card"><div class="top"><div class="avatar">'+esc(p.initials)+'</div><div><h3>'+esc(p.name)+'</h3><div class="meta">'+esc(p.service)+' · '+esc(p.region)+' · '+esc(p.district)+'</div><div class="stars">★★★★★ <span class="meta">'+p.rating+' ('+p.reviews+')</span></div></div></div><div class="price">'+esc(p.price)+'</div><div class="desc">'+esc(p.desc)+'</div><div class="actions"><button class="profile-btn" data-index="'+i+'">View profile</button><button class="request-btn" data-index="'+i+'">Request</button></div></article>').join('') || '<div class="card"><h3>No providers found</h3><p class="desc">Try another service, region or district.</p></div>';
}

function renderCategories(){
 $('categories').innerHTML=categories.map((c,i)=>'<button class="category-btn" data-service="'+esc(c[1])+'">'+c[0]+'<b>'+esc(c[1])+'</b><small>'+esc(c[2])+'</small></button>').join('');
}

function showProfile(i){
 const p=providers[i], work=p.work||[];
 const gallery=work.length?work.map(w=>w.src?(w.type==='video'?'<video class="work-media" controls src="'+esc(w.src)+'"></video>':'<img class="work-media" src="'+esc(w.src)+'" alt="Provider work">'):'<div class="work-placeholder">📷</div><p>'+esc(w.caption)+'</p>').join(''):'<p class="quote-note">This professional has not added work samples yet.</p>';
 openModal('<p class="eyebrow">'+esc(p.service)+'</p><h2>'+esc(p.name)+'</h2><p>'+esc(p.region)+' · '+esc(p.district)+' · ★ '+p.rating+' ('+p.reviews+' reviews)</p><p>'+esc(p.desc)+'</p><p><b>Starting price:</b> '+esc(p.price)+'</p><h3>My Work</h3><div class="work-gallery">'+gallery+'</div><button class="btn" id="modalRequest">Request this provider</button>');
 $('modalRequest').onclick=()=>showRequest(i);
}

function customerLogin(){
 const saved=localStorage.getItem('fixit_customer');
 if(saved){
  const u=JSON.parse(saved);
  openModal('<p class="eyebrow">CUSTOMER ACCOUNT</p><h2>Welcome back, '+esc(u.name)+'</h2><p>'+esc(u.phone)+'</p><button class="btn" id="continueBtn">Continue</button>');
  $('continueBtn').onclick=closeModal;
  return;
 }
 openModal('<p class="eyebrow">CUSTOMER LOGIN</p><h2>Create your customer account</h2><label class="form-label">Full name</label><input id="customerName" class="form-control" placeholder="Your name"><label class="form-label">Phone number</label><input id="customerPhone" class="form-control" placeholder="+232 76 000 000"><label class="form-label">Password</label><input id="customerPassword" type="password" class="form-control" placeholder="Password"><button class="btn" id="saveCustomer">Continue</button>');
 $('saveCustomer').onclick=saveCustomer;
}
window.customerLogin=customerLogin;

function saveCustomer(){
 const name=$('customerName').value.trim(),phone=$('customerPhone').value.trim(),pass=$('customerPassword').value;
 if(!name||!phone||!pass){alert('Please complete all fields.');return;}
 localStorage.setItem('fixit_customer',JSON.stringify({name,phone}));
 openModal('<p class="eyebrow">ACCOUNT READY</p><h2>Welcome, '+esc(name)+'</h2><p>Your beta customer account is ready.</p><button class="btn" id="doneBtn">Continue</button>');
 $('doneBtn').onclick=closeModal;
}

function showRequest(i){
 if(!localStorage.getItem('fixit_customer')){customerLogin();return;}
 const p=providers[i];
 openModal('<p class="eyebrow">SERVICE REQUEST</p><h2>Request '+esc(p.service)+'</h2><p>Provider: <b>'+esc(p.name)+'</b></p><label class="form-label">Region</label><select id="requestRegion" class="form-control"><option value="">Select region</option>'+Object.keys(districts).map(r=>'<option>'+esc(r)+'</option>').join('')+'</select><label class="form-label">District</label><select id="requestDistrict" class="form-control" disabled><option>Select district</option></select><label class="form-label">Pricing type</label><select id="quoteType" class="form-control"><option>Starting price</option><option>Fixed price</option><option>Quote required</option></select><label class="form-label">Job details</label><textarea id="jobDetails" class="form-control" placeholder="Describe the work you need..."></textarea><label class="form-label">Photos (optional, up to 5)</label><input id="jobPhotos" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" multiple><p class="quote-note">Final price must be approved before payment. FixIt fee: 1%.</p><button class="btn" id="submitRequest">Continue</button>');
 $('requestRegion').onchange=()=>{const r=$('requestRegion').value,d=$('requestDistrict'),list=districts[r]||[];d.innerHTML='<option value="">Select district</option>'+list.map(x=>'<option>'+esc(x)+'</option>').join('');d.disabled=!list.length;};
 $('submitRequest').onclick=()=>submitRequest();
}

function submitRequest(){
 const region=$('requestRegion').value,district=$('requestDistrict').value,details=$('jobDetails').value.trim(),files=$('jobPhotos').files;
 if(!region||!district){alert('Please select your region and district.');return;}
 if(!details){alert('Please describe the job.');return;}
 if(files.length>5){alert('Maximum 5 photos.');return;}
 for(const f of files){if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024){alert('Each photo must be JPG, PNG or WEBP and 3 MB or less.');return;}}
 openModal('<p class="eyebrow">REQUEST RECEIVED</p><h2>Your request is ready</h2><p>Location: '+esc(region)+' · '+esc(district)+'</p><p>The provider can review the job and send a quote for your approval.</p><button class="btn" id="closeRequest">Done</button>');
 $('closeRequest').onclick=closeModal;
}

function providerPortfolio(){
 openModal('<p class="eyebrow">MY WORK</p><h2>Add a work sample</h2><p>Upload a photo or short video of a completed job and add a caption.</p><label class="form-label">Photo or video</label><input id="workFile" class="form-control" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"><label class="form-label">Caption</label><input id="workCaption" class="form-control" placeholder="e.g. Bathroom installation in Lumley"><button class="btn" id="addWork">Add to portfolio</button><p class="quote-note">Beta limit: one file at a time. Keep videos short.</p>'); $('addWork').onclick=addWorkSample;
}
function addWorkSample(){const f=$('workFile').files[0],caption=$('workCaption').value.trim();if(!f||!caption){alert('Please choose a photo/video and add a caption.');return;}if(f.size>15*1024*1024){alert('File must be 15 MB or less.');return;}const reader=new FileReader();reader.onload=()=>{const items=JSON.parse(localStorage.getItem('fixit_work')||'[]');items.push({type:f.type.startsWith('video/')?'video':'image',src:reader.result,caption});localStorage.setItem('fixit_work',JSON.stringify(items));openModal('<p class="eyebrow">WORK ADDED</p><h2>Portfolio updated</h2><p>Your work sample is saved in this browser for the beta.</p><button class="btn" id="workDone">Done</button>');$('workDone').onclick=closeModal;};reader.readAsDataURL(f);}
function providerPortal(){
 openModal('<p class="eyebrow">PROVIDER PORTAL</p><h2>Prepare a customer quote</h2><label class="form-label">Customer</label><input class="form-control" value="Sample customer" readonly><label class="form-label">Region / District</label><input class="form-control" value="Western Area / Western Area Urban" readonly><label class="form-label">Labour (SLE)</label><input id="labour" class="form-control" type="number" min="0" value="200"><label class="form-label">Materials (SLE)</label><input id="materials" class="form-control" type="number" min="0" value="0"><label class="form-label">Transport (SLE)</label><input id="transport" class="form-control" type="number" min="0" value="0"><button class="btn" id="sendQuote">Send Quote to Customer</button><p class="quote-note">FixIt fee: 1% of the customer total.</p>');
 $('sendQuote').onclick=sendQuote;
}
window.providerPortal=providerPortal; window.providerPortfolio=providerPortfolio;

function sendQuote(){
 const total=(Number($('labour').value)||0)+(Number($('materials').value)||0)+(Number($('transport').value)||0),fee=total*.01;
 openModal('<p class="eyebrow">QUOTE SENT</p><h2>SLE '+total.toFixed(2)+'</h2><p>FixIt fee: SLE '+fee.toFixed(2)+'<br>Provider earnings: SLE '+(total-fee).toFixed(2)+'</p><button class="btn" id="quoteDone">Done</button>');
 $('quoteDone').onclick=closeModal;
}

function joinProvider(){openModal('<p class="eyebrow">FOR PROFESSIONALS</p><h2>Become a FixIt Salone provider</h2><p>Provider registration is being prepared for the public marketplace launch.</p><button class="btn" id="joinDone">Got it</button>');$('joinDone').onclick=closeModal;}
window.joinProvider=joinProvider;

document.addEventListener('click',e=>{
 const p=e.target.closest('.profile-btn'),r=e.target.closest('.request-btn'),cat=e.target.closest('.category-btn');
 if(p){showProfile(Number(p.dataset.index));return;}
 if(r){showRequest(Number(r.dataset.index));return;}
 if(cat){$('search').value=cat.dataset.service;render();$('providers').scrollIntoView({behavior:'smooth'});}
});
$('search').addEventListener('input',render);
$('region').addEventListener('change',updateDistricts);
$('district').addEventListener('change',render);
$('modal').addEventListener('click',e=>{if(e.target===modal)closeModal();});
renderCategories();
updateDistricts();
})();