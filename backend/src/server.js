require('dotenv').config();
const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const multer=require('multer');
const path=require('path');
const fs=require('fs');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const rateLimit=require('express-rate-limit');
const {Pool}=require('pg');

const app=express();
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET || String(JWT_SECRET).length<32) throw new Error('JWT_SECRET must be configured and be at least 32 characters long.');
app.use(helmet());
app.use(cors({origin:process.env.FRONTEND_URL||true}));
app.use(express.json({limit:'2mb'}));

const pool=new Pool({connectionString:process.env.DATABASE_URL});
async function bootstrapAdmin(){
  const phone=String(process.env.ADMIN_BOOTSTRAP_PHONE||'').trim();
  const password=String(process.env.ADMIN_BOOTSTRAP_PASSWORD||'');
  const name=String(process.env.ADMIN_BOOTSTRAP_NAME||'FixIt Salone Admin').trim();
  if(!phone||!password) return;
  if(password.length<12) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.');
  const adminCount=await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='admin'");
  if(adminCount.rows[0].count>0){
    console.log('Admin bootstrap skipped: an admin account already exists.');
    return;
  }
  const existing=await pool.query('SELECT id,role FROM users WHERE phone=$1',[phone]);
  if(existing.rows[0]) throw new Error('ADMIN_BOOTSTRAP_PHONE belongs to an existing non-admin account. Use a different bootstrap phone.');
  const hash=await bcrypt.hash(password,12);
  await pool.query('INSERT INTO users(full_name,phone,password_hash,role,status) VALUES($1,$2,$3,\'admin\',\'active\')',[name,phone,hash]);
  console.log('Bootstrap admin created.');
}
async function initializeDatabase(){
  if(process.env.AUTO_INIT_DB!=='true') return;
  const schemaPath=path.join(__dirname,'..','schema.sql');
  const schema=fs.readFileSync(schemaPath,'utf8');
  await pool.query(schema);
  console.log('Database schema initialized.');
}

const uploadDir=path.resolve(process.env.UPLOAD_DIR||'uploads');
fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,uploadDir),filename:(req,file,cb)=>cb(null,Date.now()+'-'+Math.random().toString(36).slice(2)+path.extname(file.originalname).toLowerCase())});
const upload=multer({storage,limits:{fileSize:(Number(process.env.MAX_UPLOAD_MB)||15)*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.mimetype))});
app.use('/uploads',express.static(uploadDir));

const authLimiter=rateLimit({windowMs:15*60*1000,max:10,standardHeaders:true,legacyHeaders:false,message:{error:'Too many authentication attempts. Try again later.'}});
const adminLimiter=rateLimit({windowMs:60*1000,max:60,standardHeaders:true,legacyHeaders:false,message:{error:'Too many admin requests. Try again shortly.'}});
function normalizePhone(value){return String(value||'').trim().replace(/[\s()-]/g,'');}
function normalizeSierraLeonePhone(value){
  const raw=normalizePhone(value);
  if(/^\+232\d{8}$/.test(raw))return raw;
  if(/^232\d{8}$/.test(raw))return '+'+raw;
  if(/^0\d{8}$/.test(raw))return '+232'+raw.slice(1);
  throw new Error('Please use a valid Sierra Leone mobile number.');
}
const D7_API_TOKEN=String(process.env.D7_API_TOKEN||'').trim();
const D7_SENDER_ID=String(process.env.D7_SENDER_ID||'FixIt').trim();
async function d7VerifyRequest(pathname,body){
  if(!D7_API_TOKEN)throw new Error('Real SMS verification is not configured yet. Add D7_API_TOKEN in Render.');
  const response=await fetch('https://api.d7networks.com'+pathname,{
    method:'POST',
    headers:{'Authorization':'Bearer '+D7_API_TOKEN,'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(body)
  });
  let data={};try{data=await response.json()}catch{}
  if(!response.ok){
    const detail=data&&data.detail;
    const message=typeof detail==='string'?detail:(detail&&detail.message)||'SMS provider rejected the request.';
    throw new Error(message);
  }
  return data;
}

function signToken(user){return jwt.sign({sub:user.id,role:user.role},JWT_SECRET,{expiresIn:'8h'});}
function requireAuth(req,res,next){
  const header=req.headers.authorization||'';
  const token=header.startsWith('Bearer ')?header.slice(7):null;
  if(!token||!JWT_SECRET)return res.status(401).json({error:'Authentication required.'});
  try{req.user=jwt.verify(token,JWT_SECRET);next()}catch(e){return res.status(401).json({error:'Invalid or expired session.'})}
}
function requireAdmin(req,res,next){if(req.user&&req.user.role==='admin')return next();return res.status(403).json({error:'Admin access required.'});}
async function audit(actor,target,action,type,id,metadata){
  await pool.query('INSERT INTO audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[actor||null,target||null,action,type||null,id||null,metadata||{}]);
}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'fixit-salone'}));

app.post('/api/auth/register',authLimiter,async(req,res)=>{
  const {full_name,password,role}=req.body||{};
  const phone=normalizePhone(req.body&&req.body.phone);
  if(!full_name||!phone||!password)return res.status(400).json({error:'Full name, phone and password are required.'});
  if(String(full_name).trim().length<2||String(full_name).trim().length>160)return res.status(400).json({error:'Please enter a valid full name.'});
  if(String(password).length<8)return res.status(400).json({error:'Password must be at least 8 characters.'});
  const safeRole=role==='provider'?'provider':'customer';
  try{
    const hash=await bcrypt.hash(String(password),12);
    const {rows}=await pool.query('INSERT INTO users(full_name,phone,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,full_name,phone,role,status,created_at',[String(full_name).trim(),phone,hash,safeRole]);
    const user=rows[0];
    await audit(user.id,user.id,'auth.register','user',user.id,{role:safeRole});
    res.status(201).json({user,token:signToken(user)});
  }catch(e){
    if(e.code==='23505')return res.status(409).json({error:'An account with that phone number already exists.'});
    console.error('Register error:',e);
    res.status(500).json({error:'Unable to create account.'});
  }
});

app.post('/api/auth/login',authLimiter,async(req,res)=>{
  const phone=normalizePhone(req.body&&req.body.phone);
  const password=String(req.body&&req.body.password||'');
  if(!phone||!password)return res.status(400).json({error:'Phone and password are required.'});
  try{
    const {rows}=await pool.query('SELECT id,full_name,phone,role,status,password_hash,failed_login_count,locked_until FROM users WHERE phone=$1 LIMIT 1',[phone]);
    const user=rows[0];
    if(!user||!user.password_hash)return res.status(401).json({error:'Invalid phone number or password.'});
    if(user.locked_until && new Date(user.locked_until)>new Date())return res.status(429).json({error:'Too many failed attempts. Please try again later.'});
    if(user.status==='suspended'||user.status==='banned')return res.status(403).json({error:'This account is restricted. Contact FixIt Salone support.'});
    const ok=await bcrypt.compare(password,user.password_hash);
    if(!ok){
      const nextFailed=Number(user.failed_login_count||0)+1;
      const lockSql=nextFailed>=5?',locked_until=NOW()+INTERVAL \'15 minutes\'':'';
      await pool.query('UPDATE users SET failed_login_count=$1'+lockSql+',updated_at=NOW() WHERE id=$2',[nextFailed,user.id]);
      return res.status(nextFailed>=5?429:401).json({error:nextFailed>=5?'Too many failed attempts. Please try again in 15 minutes.':'Invalid phone number or password.'});
    }
    await pool.query('UPDATE users SET last_login_at=NOW(),failed_login_count=0,locked_until=NULL,updated_at=NOW() WHERE id=$1',[user.id]);
    delete user.password_hash;
    delete user.failed_login_count;
    delete user.locked_until;
    await audit(user.id,user.id,'auth.login','user',user.id,{role:user.role});
    res.json({user,token:signToken(user)});
  }catch(e){console.error('Login error:',e);res.status(500).json({error:'Unable to sign in.'})}
});

app.post('/api/auth/forgot-password',authLimiter,async(req,res)=>{
  const phone=normalizePhone(req.body&&req.body.phone);
  if(!phone)return res.status(400).json({error:'Phone number is required.'});
  try{
    const user=await pool.query("SELECT id,phone,status FROM users WHERE phone=$1 LIMIT 1",[phone]);
    // Do not reveal whether an account exists.
    if(!user.rows[0]||['suspended','banned'].includes(user.rows[0].status)){
      return res.json({ok:true,message:'If an account exists for that phone number, password reset instructions have been prepared.'});
    }
    const otp='123456';
    const otpHash=await bcrypt.hash(otp,10);
    await pool.query("UPDATE password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[user.rows[0].id]);
    const {rows}=await pool.query("INSERT INTO password_resets(user_id,phone,otp_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes') RETURNING id,expires_at",[user.rows[0].id,phone,otpHash]);
    await audit(user.rows[0].id,user.rows[0].id,'auth.password_reset_requested','user',user.rows[0].id,{method:'phone',sms_active:false});
    res.json({ok:true,reset_id:rows[0].id,expires_at:rows[0].expires_at,otp_demo:true,message:'Password reset started. Real SMS is not connected yet; use demo code 123456.'});
  }catch(e){console.error('Forgot password error:',e);res.status(500).json({error:'Unable to start password reset.'})}
});

app.post('/api/auth/reset-password',authLimiter,async(req,res)=>{
  const resetId=String(req.body&&req.body.reset_id||'').trim();
  const otp=String(req.body&&req.body.otp||'').trim();
  const password=String(req.body&&req.body.password||'');
  if(!resetId||!otp||!password)return res.status(400).json({error:'Reset ID, verification code and new password are required.'});
  if(password.length<8)return res.status(400).json({error:'New password must be at least 8 characters.'});
  try{
    const q=await pool.query("SELECT id,user_id,otp_hash,attempts,expires_at,used_at FROM password_resets WHERE id=$1 LIMIT 1",[resetId]);
    const reset=q.rows[0];
    if(!reset||reset.used_at||new Date(reset.expires_at)<=new Date())return res.status(400).json({error:'This password reset has expired. Start again.'});
    if(Number(reset.attempts)>=5)return res.status(429).json({error:'Too many verification attempts. Start a new password reset.'});
    const ok=await bcrypt.compare(otp,reset.otp_hash);
    if(!ok){
      await pool.query('UPDATE password_resets SET attempts=attempts+1 WHERE id=$1',[reset.id]);
      return res.status(400).json({error:'Invalid verification code.'});
    }
    const hash=await bcrypt.hash(password,12);
    await pool.query('UPDATE users SET password_hash=$1,failed_login_count=0,locked_until=NULL,updated_at=NOW() WHERE id=$2',[hash,reset.user_id]);
    await pool.query('UPDATE password_resets SET used_at=NOW() WHERE id=$1',[reset.id]);
    await audit(reset.user_id,reset.user_id,'auth.password_reset_completed','user',reset.user_id,{method:'phone'});
    res.json({ok:true,message:'Password reset successfully. You can now sign in.'});
  }catch(e){console.error('Reset password error:',e);res.status(500).json({error:'Unable to reset password.'})}
});

app.get('/api/auth/me',requireAuth,async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT id,full_name,phone,role,status,created_at,last_login_at FROM users WHERE id=$1',[req.user.sub]);
    if(!rows[0])return res.status(401).json({error:'Account not found.'});
    if(rows[0].status==='suspended'||rows[0].status==='banned')return res.status(403).json({error:'Account is restricted.'});
    res.json({user:rows[0]});
  }catch(e){res.status(500).json({error:'Unable to load account.'})}
});


// Marketplace services and provider profiles
app.get('/api/services',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT id,name,description FROM services WHERE active=true ORDER BY name');
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load services.'})}
});

app.get('/api/providers',async(req,res)=>{
  const {service,region,district}=req.query;
  try{
    const values=[]; const where=[];
    if(service){values.push(String(service));where.push('s.name=$'+values.length)}
    if(region){values.push(String(region));where.push('pp.region=$'+values.length)}
    if(district){values.push(String(district));where.push('pp.district=$'+values.length)}
    const sql=`SELECT pp.id,pp.user_id,pp.business_name,pp.region,pp.district,pp.area,pp.service_address,pp.verification_status,
      u.full_name,ps.service_id,s.name AS service_name,ps.pricing_type,ps.price_sle,ps.description AS service_description
      FROM provider_profiles pp
      JOIN users u ON u.id=pp.user_id AND u.status='active'
      JOIN provider_services ps ON ps.provider_id=pp.id
      JOIN services s ON s.id=ps.service_id AND s.active=true
      ${where.length?'WHERE '+where.join(' AND '):''}
      ORDER BY pp.created_at DESC LIMIT 200`;
    const {rows}=await pool.query(sql,values);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load providers.'})}
});

app.get('/api/providers/:id',async(req,res)=>{
  try{
    const profile=await pool.query(`SELECT pp.id,pp.user_id,pp.business_name,pp.region,pp.district,pp.area,pp.service_address,pp.verification_status,u.full_name
      FROM provider_profiles pp JOIN users u ON u.id=pp.user_id WHERE pp.id=$1`,[req.params.id]);
    if(!profile.rows[0])return res.status(404).json({error:'Provider not found.'});
    const services=await pool.query(`SELECT ps.service_id,s.name,ps.pricing_type,ps.price_sle,ps.description FROM provider_services ps JOIN services s ON s.id=ps.service_id WHERE ps.provider_id=$1 ORDER BY s.name`,[req.params.id]);
    res.json({profile:profile.rows[0],services:services.rows});
  }catch(e){res.status(500).json({error:'Unable to load provider.'})}
});

app.get('/api/providers/me/profile',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const {rows}=await pool.query('SELECT id,user_id,business_name,region,district,area,service_address,verification_status FROM provider_profiles WHERE user_id=$1',[req.user.sub]);
    if(!rows[0])return res.json({profile:null,services:[]});
    const services=await pool.query('SELECT ps.service_id,s.name,ps.pricing_type,ps.price_sle,ps.description FROM provider_services ps JOIN services s ON s.id=ps.service_id WHERE ps.provider_id=$1 ORDER BY s.name',[rows[0].id]);
    res.json({profile:rows[0],services:services.rows});
  }catch(e){res.status(500).json({error:'Unable to load your provider profile.'})}
});

app.put('/api/providers/me/profile',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  const {business_name,region,district,area,service_address}=req.body||{};
  if(!business_name||!region||!district||!area||!service_address)return res.status(400).json({error:'Business name, region, district, area and service address are required.'});
  try{
    const {rows}=await pool.query(`INSERT INTO provider_profiles(user_id,business_name,region,district,area,service_address)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(user_id) DO UPDATE SET business_name=EXCLUDED.business_name,region=EXCLUDED.region,district=EXCLUDED.district,area=EXCLUDED.area,service_address=EXCLUDED.service_address,updated_at=NOW()
      RETURNING id,user_id,business_name,region,district,area,service_address,verification_status`,
      [req.user.sub,String(business_name).trim(),String(region).trim(),String(district).trim(),String(area).trim(),String(service_address).trim()]);
    await audit(req.user.sub,req.user.sub,'provider.profile_update','provider_profile',rows[0].id,{region:rows[0].region,district:rows[0].district});
    res.json({profile:rows[0]});
  }catch(e){console.error('Provider profile error:',e);res.status(500).json({error:'Unable to save provider profile.'})}
});

app.post('/api/providers/me/services',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  const {service_id,pricing_type,price_sle,description}=req.body||{};
  if(!service_id||!['fixed_price','starting_price','quote_required'].includes(pricing_type))return res.status(400).json({error:'Service and valid pricing type are required.'});
  if(price_sle!==null&&price_sle!==undefined&&price_sle!==''&&(Number.isNaN(Number(price_sle))||Number(price_sle)<0))return res.status(400).json({error:'Price must be a valid non-negative amount.'});
  try{
    const profile=await pool.query('SELECT id FROM provider_profiles WHERE user_id=$1',[req.user.sub]);
    if(!profile.rows[0])return res.status(400).json({error:'Create your provider profile first.'});
    const service=await pool.query('SELECT id FROM services WHERE id=$1 AND active=true',[service_id]);
    if(!service.rows[0])return res.status(404).json({error:'Service not found.'});
    const {rows}=await pool.query(`INSERT INTO provider_services(provider_id,service_id,pricing_type,price_sle,description)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(provider_id,service_id) DO UPDATE SET pricing_type=EXCLUDED.pricing_type,price_sle=EXCLUDED.price_sle,description=EXCLUDED.description,updated_at=NOW()
      RETURNING provider_id,service_id,pricing_type,price_sle,description`,
      [profile.rows[0].id,service_id,pricing_type,price_sle===''?null:price_sle,String(description||'').trim()||null]);
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to save provider service.'})}
});

app.get('/api/providers/me/services',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const {rows}=await pool.query('SELECT ps.service_id,s.name,ps.pricing_type,ps.price_sle,ps.description FROM provider_services ps JOIN provider_profiles pp ON pp.id=ps.provider_id JOIN services s ON s.id=ps.service_id WHERE pp.user_id=$1 ORDER BY s.name',[req.user.sub]);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load provider services.'})}
});

app.post('/api/service-requests',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  const {provider_id,service_id,region,district,area,service_address,directions,pricing_type,job_details}=req.body||{};
  if(!provider_id||!service_id||!region||!district||!area||!service_address||!pricing_type||!job_details)return res.status(400).json({error:'Provider, service, location, pricing type and job details are required.'});
  if(!['fixed_price','starting_price','quote_required'].includes(pricing_type))return res.status(400).json({error:'Invalid pricing type.'});
  try{
    const provider=await pool.query('SELECT id FROM provider_profiles WHERE id=$1',[provider_id]);
    const service=await pool.query('SELECT id FROM services WHERE id=$1 AND active=true',[service_id]);
    const offered=await pool.query('SELECT 1 FROM provider_services WHERE provider_id=$1 AND service_id=$2',[provider_id,service_id]);
    if(!provider.rows[0]||!service.rows[0]||!offered.rows[0])return res.status(400).json({error:'That provider does not currently offer the selected service.'});
    const {rows}=await pool.query(`INSERT INTO service_requests(customer_user_id,provider_id,service_id,region,district,area,service_address,directions,pricing_type,job_details)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,status,created_at`,
      [req.user.sub,provider_id,service_id,String(region).trim(),String(district).trim(),String(area).trim(),String(service_address).trim(),String(directions||'').trim()||null,pricing_type,String(job_details).trim()]);
    await audit(req.user.sub,null,'service_request.created','service_request',rows[0].id,{provider_id,service_id});
    res.status(201).json(rows[0]);
  }catch(e){console.error('Service request error:',e);res.status(500).json({error:'Unable to create service request.'})}
});

app.get('/api/service-requests/mine',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  try{
    const {rows}=await pool.query(`SELECT sr.id,sr.status,sr.region,sr.district,sr.area,sr.service_address,sr.pricing_type,sr.job_details,sr.quoted_amount,sr.created_at,
      pp.business_name,u.full_name AS provider_name,s.name AS service_name
      FROM service_requests sr LEFT JOIN provider_profiles pp ON pp.id=sr.provider_id LEFT JOIN users u ON u.id=pp.user_id LEFT JOIN services s ON s.id=sr.service_id
      WHERE sr.customer_user_id=$1 ORDER BY sr.created_at DESC LIMIT 100`,[req.user.sub]);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load your requests.'})}
});

app.get('/api/provider/requests',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const {rows}=await pool.query(`SELECT sr.id,sr.status,sr.region,sr.district,sr.area,sr.service_address,sr.directions,sr.pricing_type,sr.job_details,sr.quoted_amount,sr.created_at,
      u.full_name AS customer_name,u.phone AS customer_phone,s.name AS service_name
      FROM service_requests sr JOIN provider_profiles pp ON pp.id=sr.provider_id JOIN users u ON u.id=sr.customer_user_id LEFT JOIN services s ON s.id=sr.service_id
      WHERE pp.user_id=$1 ORDER BY sr.created_at DESC LIMIT 100`,[req.user.sub]);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load provider requests.'})}
});

app.patch('/api/service-requests/:id/quote',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  const amount=Number(req.body&&req.body.quoted_amount);
  if(!Number.isFinite(amount)||amount<=0||amount>100000000)return res.status(400).json({error:'Enter a valid quote amount.'});
  try{
    const current=await pool.query('SELECT id,customer_user_id,provider_id,status FROM service_requests WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=current.rows[0];
    const owner=await pool.query('SELECT id FROM provider_profiles WHERE id=$1 AND user_id=$2',[r.provider_id,req.user.sub]);
    if(!owner.rows[0])return res.status(403).json({error:'You do not have access to this request.'});
    if(!['requested','quoted'].includes(r.status))return res.status(409).json({error:'A quote can only be sent while the request is awaiting a quote.'});
    const fee=Number((amount*0.01).toFixed(2));
    const earnings=Number((amount-fee).toFixed(2));
    const {rows}=await pool.query(`UPDATE service_requests SET status='quoted',quoted_amount=$1,platform_fee=$2,provider_earnings=$3,updated_at=NOW() WHERE id=$4 RETURNING id,status,quoted_amount,platform_fee,provider_earnings,updated_at`,[amount,fee,earnings,r.id]);
    await audit(req.user.sub,r.customer_user_id,'service_request.quote_sent','service_request',r.id,{quoted_amount:amount,platform_fee:fee,provider_earnings:earnings});
    res.json(rows[0]);
  }catch(e){console.error('Quote error:',e);res.status(500).json({error:'Unable to send quote.'})}
});

app.post('/api/payments/intent',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  const {service_request_id}=req.body||{};
  if(!service_request_id)return res.status(400).json({error:'service_request_id is required.'});
  try{
    const current=await pool.query('SELECT id,customer_user_id,provider_id,status,quoted_amount,platform_fee,provider_earnings FROM service_requests WHERE id=$1',[service_request_id]);
    if(!current.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=current.rows[0];
    if(r.customer_user_id!==req.user.sub)return res.status(403).json({error:'You do not have access to this request.'});
    if(r.status!=='approved')return res.status(409).json({error:'Approve the provider quote before starting payment.'});
    if(!r.quoted_amount)return res.status(409).json({error:'This request has no approved quote.'});
    const existing=await pool.query('SELECT id,status,amount_sle,platform_fee,provider_earnings,gateway FROM payment_transactions WHERE service_request_id=$1',[r.id]);
    if(existing.rows[0])return res.json({payment:existing.rows[0],gateway_ready:false,message:'Payment gateway is not configured yet. No money was collected.'});
    const fee=Number((Number(r.quoted_amount)*0.01).toFixed(2));
    const earnings=Number((Number(r.quoted_amount)-fee).toFixed(2));
    const {rows}=await pool.query(`INSERT INTO payment_transactions(service_request_id,customer_user_id,provider_id,amount_sle,platform_fee,provider_earnings,gateway,status)
      VALUES($1,$2,$3,$4,$5,$6,'not_configured','pending')
      RETURNING id,status,amount_sle,platform_fee,provider_earnings,gateway,created_at`,[r.id,req.user.sub,r.provider_id,r.quoted_amount,fee,earnings]);
    await audit(req.user.sub,null,'payment.intent_created','payment_transaction',rows[0].id,{service_request_id:r.id,amount_sle:Number(r.quoted_amount),gateway:'not_configured'});
    res.status(201).json({payment:rows[0],gateway_ready:false,message:'Payment gateway is not configured yet. No money was collected.'});
  }catch(e){console.error('Payment intent error:',e);res.status(500).json({error:'Unable to prepare payment.'})}
});

app.get('/api/payments/mine',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  try{
    const {rows}=await pool.query(`SELECT pt.id,pt.service_request_id,pt.amount_sle,pt.platform_fee,pt.provider_earnings,pt.currency,pt.gateway,pt.status,pt.provider_reference,pt.created_at,s.name AS service_name,pp.business_name
      FROM payment_transactions pt JOIN service_requests sr ON sr.id=pt.service_request_id
      LEFT JOIN services s ON s.id=sr.service_id LEFT JOIN provider_profiles pp ON pp.id=sr.provider_id
      WHERE pt.customer_user_id=$1 ORDER BY pt.created_at DESC LIMIT 100`,[req.user.sub]);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load your payments.'})}
});

app.post('/api/payments/intent',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  const {service_request_id}=req.body||{};
  if(!service_request_id)return res.status(400).json({error:'service_request_id is required.'});
  try{
    const current=await pool.query('SELECT id,customer_user_id,provider_id,status,quoted_amount FROM service_requests WHERE id=$1',[service_request_id]);
    if(!current.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=current.rows[0];
    if(r.customer_user_id!==req.user.sub)return res.status(403).json({error:'You do not have access to this request.'});
    if(r.status!=='approved')return res.status(409).json({error:'Approve the provider quote before starting payment.'});
    if(!r.quoted_amount)return res.status(409).json({error:'This request has no approved quote.'});
    const existing=await pool.query('SELECT id,status,amount_sle,platform_fee,provider_earnings,gateway FROM payment_transactions WHERE service_request_id=$1',[r.id]);
    if(existing.rows[0])return res.json({payment:existing.rows[0],gateway_ready:false,message:'Payment gateway is not configured yet. No money was collected.'});
    const fee=Number((Number(r.quoted_amount)*0.01).toFixed(2));
    const earnings=Number((Number(r.quoted_amount)-fee).toFixed(2));
    const {rows}=await pool.query(`INSERT INTO payment_transactions(service_request_id,customer_user_id,provider_id,amount_sle,platform_fee,provider_earnings,gateway,status)
      VALUES($1,$2,$3,$4,$5,$6,'not_configured','pending')
      RETURNING id,status,amount_sle,platform_fee,provider_earnings,gateway,created_at`,[r.id,req.user.sub,r.provider_id,r.quoted_amount,fee,earnings]);
    await audit(req.user.sub,null,'payment.intent_created','payment_transaction',rows[0].id,{service_request_id:r.id,amount_sle:Number(r.quoted_amount),gateway:'not_configured'});
    res.status(201).json({payment:rows[0],gateway_ready:false,message:'Payment gateway is not configured yet. No money was collected.'});
  }catch(e){console.error('Payment intent error:',e);res.status(500).json({error:'Unable to prepare payment.'})}
});

app.get('/api/payments/mine',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  try{
    const {rows}=await pool.query(`SELECT pt.id,pt.service_request_id,pt.amount_sle,pt.platform_fee,pt.provider_earnings,pt.currency,pt.gateway,pt.status,pt.provider_reference,pt.created_at,s.name AS service_name,pp.business_name
      FROM payment_transactions pt JOIN service_requests sr ON sr.id=pt.service_request_id
      LEFT JOIN services s ON s.id=sr.service_id LEFT JOIN provider_profiles pp ON pp.id=sr.provider_id
      WHERE pt.customer_user_id=$1 ORDER BY pt.created_at DESC LIMIT 100`,[req.user.sub]);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load your payments.'})}
});

app.patch('/api/service-requests/:id/status',requireAuth,async(req,res)=>{
  const {status}=req.body||{};
  const allowed=['quoted','approved','in_progress','completed','cancelled','declined'];
  if(!allowed.includes(status))return res.status(400).json({error:'Invalid request status.'});
  try{
    const current=await pool.query('SELECT id,customer_user_id,provider_id,status FROM service_requests WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=current.rows[0];
    const profile=req.user.role==='provider'?await pool.query('SELECT id FROM provider_profiles WHERE id=$1 AND user_id=$2',[r.provider_id,req.user.sub]):null;
    const isCustomer=req.user.role==='customer'&&r.customer_user_id===req.user.sub;
    const isProvider=profile&&profile.rows[0];
    if(!isCustomer&&!isProvider)return res.status(403).json({error:'You do not have access to this request.'});
    const transitions={
      customer:{quoted:['approved','cancelled'],requested:['cancelled'],approved:['cancelled'],in_progress:['cancelled']},
      provider:{requested:['declined','cancelled'],quoted:['in_progress','cancelled'],approved:['in_progress','cancelled'],in_progress:['completed','cancelled'],completed:[],declined:[],cancelled:[]}
    };
    const next=(transitions[req.user.role]&&transitions[req.user.role][r.status])||[];
    if(!next.includes(status))return res.status(409).json({error:'That status change is not allowed from the current request status.'});
    const {rows}=await pool.query('UPDATE service_requests SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status,updated_at',[status,req.params.id]);
    await audit(req.user.sub,r.customer_user_id,'service_request.status_update','service_request',r.id,{status});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to update request status.'})}
});

app.get('/api/providers/:id/work',async(req,res)=>{
  try{const {rows}=await pool.query('SELECT id,media_type,file_url,caption,created_at FROM provider_work WHERE provider_id=$1 ORDER BY created_at DESC',[req.params.id]);res.json(rows)}
  catch(e){res.status(500).json({error:'Unable to load portfolio'})}
});
app.post('/api/providers/:id/work',requireAuth,upload.single('media'),async(req,res)=>{
  if(req.user.role!=='provider'&&req.user.role!=='admin')return res.status(403).json({error:'Provider access required.'});
  if(req.user.role==='provider'){
    const owner=await pool.query('SELECT id FROM provider_profiles WHERE id=$1 AND user_id=$2',[req.params.id,req.user.sub]);
    if(!owner.rows[0])return res.status(403).json({error:'You can only manage your own portfolio.'});
  }
  if(!req.file)return res.status(400).json({error:'Please upload an image or video.'});
  const caption=(req.body.caption||'').trim();
  if(!caption){try{fs.unlinkSync(path.join(uploadDir,req.file.filename))}catch{};return res.status(400).json({error:'Caption is required.'})}
  const mediaType=req.file.mimetype.startsWith('video/')?'video':'image';
  try{
    const {rows}=await pool.query('INSERT INTO provider_work(provider_id,media_type,file_url,caption) VALUES($1,$2,$3,$4) RETURNING id,media_type,file_url,caption,created_at',[req.params.id,mediaType,'/uploads/'+req.file.filename,caption]);
    res.status(201).json(rows[0]);
  }catch(e){try{fs.unlinkSync(path.join(uploadDir,req.file.filename))}catch{};res.status(500).json({error:'Unable to save portfolio item'})}
});

app.post('/api/incidents',requireAuth,async(req,res)=>{
  const {reported_user_id,job_id,reason,details}=req.body||{};
  if(!reason||!details)return res.status(400).json({error:'reason and details are required'});
  if(String(details).trim().length>5000)return res.status(400).json({error:'Report details are too long.'});
  try{
    const {rows}=await pool.query('INSERT INTO incidents(reporter_user_id,reported_user_id,job_id,reason,details) VALUES($1,$2,$3,$4,$5) RETURNING id,status,priority,created_at',[req.user.sub,reported_user_id||null,job_id||null,String(reason).trim(),String(details).trim()]);
    await audit(req.user.sub,reported_user_id||null,'incident.created','incident',rows[0].id,{reason:String(reason).trim()});
    res.status(201).json(rows[0]);
  }catch(e){console.error('Incident error:',e);res.status(500).json({error:'Unable to create incident'})}
});

app.post('/api/phone-verification/request',requireAuth,authLimiter,async(req,res)=>{
  try{
    const user=await pool.query('SELECT phone,status FROM users WHERE id=$1',[req.user.sub]);
    if(!user.rows[0])return res.status(404).json({error:'Account not found.'});
    if(['suspended','banned'].includes(user.rows[0].status))return res.status(403).json({error:'Account is restricted.'});
    const phone=normalizeSierraLeonePhone(user.rows[0].phone);
    const recent=await pool.query("SELECT created_at FROM phone_verifications WHERE user_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1",[req.user.sub]);
    if(recent.rows[0] && (Date.now()-new Date(recent.rows[0].created_at).getTime())<60000){
      return res.status(429).json({error:'Please wait at least 60 seconds before requesting another verification code.'});
    }
    const sms=await d7VerifyRequest('/verify/v1/otp/send-otp',{
      originator:D7_SENDER_ID,
      recipient:phone,
      content:'FixIt Salone verification code: {}',
      expiry:600,
      data_coding:'text'
    });
    const otpId=String(sms.otp_id||sms.request_id||'');
    if(!otpId)throw new Error('SMS provider did not return a verification ID.');
    await pool.query("UPDATE phone_verifications SET status='expired' WHERE user_id=$1 AND status='pending'",[req.user.sub]);
    const expirySeconds=Number(sms.expiry)||600;
    const {rows}=await pool.query(
      "INSERT INTO phone_verifications(user_id,phone,status,provider_reference,expires_at) VALUES($1,$2,'pending',$3,NOW()+($4 * INTERVAL '1 second')) RETURNING id,status,created_at,expires_at",
      [req.user.sub,phone,otpId,expirySeconds]
    );
    await audit(req.user.sub,req.user.sub,'phone_verification.requested','phone_verification',rows[0].id,{provider:'d7',phone_suffix:phone.slice(-4)});
    res.status(201).json({verification:rows[0],otp_sent:true,message:'A verification code has been sent to your phone.'});
  }catch(e){
    console.error('Phone verification request error:',e);
    const message=e.message||'Unable to send verification code.';
    const status=/not configured/i.test(message)?503:502;
    res.status(status).json({error:message});
  }
});
app.post('/api/phone-verification/verify',requireAuth,authLimiter,async(req,res)=>{
  const verificationId=String(req.body&&req.body.verification_id||'').trim();
  const otp=String(req.body&&req.body.otp||'').trim();
  if(!verificationId||!/^\d{4,8}$/.test(otp))return res.status(400).json({error:'Verification ID and a valid OTP are required.'});
  try{
    const q=await pool.query("SELECT id,user_id,status,provider_reference,expires_at FROM phone_verifications WHERE id=$1 AND user_id=$2 LIMIT 1",[verificationId,req.user.sub]);
    const row=q.rows[0];
    if(!row)return res.status(404).json({error:'Verification request not found.'});
    if(row.status==='verified')return res.json({ok:true,verified:true,message:'Phone number is already verified.'});
    if(row.status!=='pending'||(row.expires_at&&new Date(row.expires_at)<=new Date()))return res.status(400).json({error:'This verification code has expired. Request a new code.'});
    const result=await d7VerifyRequest('/verify/v1/verify-otp',{otp_id:row.provider_reference,otp_code:otp});
    const status=String(result.status||'').toUpperCase();
    if(status!=='APPROVED'){
      if(status==='EXPIRED')await pool.query("UPDATE phone_verifications SET status='expired' WHERE id=$1",[row.id]);
      return res.status(400).json({error:status==='EXPIRED'?'This verification code has expired. Request a new code.':'Incorrect verification code.'});
    }
    const {rows}=await pool.query("UPDATE phone_verifications SET status='verified',verified_at=NOW() WHERE id=$1 RETURNING id,status,verified_at",[row.id]);
    await audit(req.user.sub,req.user.sub,'phone_verification.completed','phone_verification',row.id,{provider:'d7'});
    res.json({ok:true,verified:true,verification:rows[0],message:'Phone number verified successfully.'});
  }catch(e){
    console.error('Phone verification verify error:',e);
    res.status(502).json({error:e.message||'Unable to verify the code.'});
  }
});
app.get('/api/verification/:userId',requireAuth,async(req,res)=>{
  if(req.user.sub!==req.params.userId&&req.user.role!=='admin')return res.status(403).json({error:'Access denied.'});
  try{
    const [phone,identity]=await Promise.all([
      pool.query("SELECT status,verified_at,created_at FROM phone_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[req.params.userId]),
      pool.query("SELECT status,document_type,verified_at,created_at FROM identity_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[req.params.userId])
    ]);
    res.json({
      phone_status:phone.rows[0]?.status||'unverified',
      phone_verified_at:phone.rows[0]?.verified_at||null,
      identity:identity.rows[0]||{status:'unverified'}
    });
  }catch(e){res.status(500).json({error:'Unable to load verification status'})}
});

app.use('/api/admin',requireAuth,requireAdmin,adminLimiter);
app.get('/api/admin/incidents',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT i.id,i.reason,i.details,i.status,i.priority,i.created_at,i.reported_user_id,u.full_name AS reported_name FROM incidents i LEFT JOIN users u ON u.id=i.reported_user_id ORDER BY i.created_at DESC LIMIT 200');
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load incidents.'})}
});
app.patch('/api/admin/incidents/:id',async(req,res)=>{
  const {status,priority}=req.body||{};
  if(!['open','under_review','resolved','dismissed'].includes(status)&&!['low','normal','high','critical'].includes(priority))return res.status(400).json({error:'Provide a valid status or priority.'});
  try{
    const current=await pool.query('SELECT id,reported_user_id,status,priority FROM incidents WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'Incident not found.'});
    const nextStatus=status||current.rows[0].status,nextPriority=priority||current.rows[0].priority;
    const {rows}=await pool.query('UPDATE incidents SET status=$1,priority=$2,resolved_at=CASE WHEN $1 IN (\'resolved\',\'dismissed\') THEN NOW() ELSE NULL END,resolved_by=CASE WHEN $1 IN (\'resolved\',\'dismissed\') THEN $3 ELSE NULL END WHERE id=$4 RETURNING id,status,priority,resolved_at',[nextStatus,nextPriority,req.user.sub,req.params.id]);
    await audit(req.user.sub,current.rows[0].reported_user_id,'admin.incident_update','incident',req.params.id,{status:nextStatus,priority:nextPriority});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to update incident.'})}
});
app.get('/api/admin/verifications',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT iv.id,iv.user_id,u.full_name,u.role,u.phone,iv.status,iv.document_type,iv.created_at,iv.verified_at FROM identity_verifications iv JOIN users u ON u.id=iv.user_id ORDER BY iv.created_at DESC LIMIT 200');
    res.json(rows.map(r=>({id:r.id,user_id:r.user_id,full_name:r.full_name,role:r.role,phone:r.phone,status:r.status,document_type:r.document_type||'Not provided',created_at:r.created_at,verified_at:r.verified_at})));
  }catch(e){res.status(500).json({error:'Unable to load verification queue.'})}
});
app.patch('/api/admin/verifications/:id',async(req,res)=>{
  const {status,rejection_reason}=req.body||{};
  if(!['pending','verified','rejected','under_review'].includes(status))return res.status(400).json({error:'Invalid verification status.'});
  try{
    const current=await pool.query('SELECT id,user_id,status FROM identity_verifications WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'Verification record not found.'});
    const {rows}=await pool.query('UPDATE identity_verifications SET status=$1,rejection_reason=$2,verified_at=CASE WHEN $1=\'verified\' THEN NOW() ELSE NULL END,reviewed_by=$3,updated_at=NOW() WHERE id=$4 RETURNING id,user_id,status,verified_at',[status,rejection_reason||null,req.user.sub,req.params.id]);
    if(status==='verified'||status==='rejected')await pool.query('UPDATE provider_profiles SET verification_status=$1,updated_at=NOW() WHERE user_id=$2',[status,rows[0].user_id]);
    await audit(req.user.sub,rows[0].user_id,'admin.verification_update','identity_verification',req.params.id,{status:status});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to update verification.'})}
});
app.get('/api/admin/users',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT id,full_name,phone,role,status,created_at,last_login_at FROM users ORDER BY created_at DESC LIMIT 500');
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load users.'})}
});
app.patch('/api/admin/users/:id/status',async(req,res)=>{
  const {status}=req.body||{};
  if(!['active','under_review','suspended','banned'].includes(status))return res.status(400).json({error:'Invalid account status.'});
  if(req.params.id===req.user.sub&&status!=='active')return res.status(400).json({error:'You cannot restrict your own admin account.'});
  try{
    const current=await pool.query('SELECT id,status,role FROM users WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'User not found.'});
    const {rows}=await pool.query('UPDATE users SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,full_name,phone,role,status',[status,req.params.id]);
    await audit(req.user.sub,req.params.id,'admin.user_status','user',req.params.id,{from:current.rows[0].status,to:status});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to update user status.'})}
});
app.get('/api/admin/audit',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT a.id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 500');
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load audit history.'})}
});

initializeDatabase().then(()=>bootstrapAdmin()).then(()=>{app.listen(process.env.PORT||4000,()=>console.log('FixIt backend running on port '+(process.env.PORT||4000)));}).catch(err=>{console.error('Database initialization failed:',err);process.exit(1);});
