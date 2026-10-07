require('dotenv').config();
const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const multer=require('multer');
const path=require('path');
const fs=require('fs');
const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const rateLimit=require('express-rate-limit');
const {Pool}=require('pg');
const {S3Client,PutObjectCommand,DeleteObjectCommand,GetObjectCommand}=require('@aws-sdk/client-s3');
const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');

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
const R2_ENDPOINT=String(process.env.R2_ENDPOINT||'').trim();
const R2_ACCESS_KEY_ID=String(process.env.R2_ACCESS_KEY_ID||'').trim();
const R2_SECRET_ACCESS_KEY=String(process.env.R2_SECRET_ACCESS_KEY||'').trim();
const R2_BUCKET=String(process.env.R2_BUCKET||'').trim();
const objectStorageEnabled=!!(R2_ENDPOINT&&R2_ACCESS_KEY_ID&&R2_SECRET_ACCESS_KEY&&R2_BUCKET);
const objectStorage=objectStorageEnabled?new S3Client({
  region:'auto',
  endpoint:R2_ENDPOINT,
  credentials:{accessKeyId:R2_ACCESS_KEY_ID,secretAccessKey:R2_SECRET_ACCESS_KEY},
}):null;
const diskStorage=multer.diskStorage({destination:(req,file,cb)=>cb(null,uploadDir),filename:(req,file,cb)=>cb(null,Date.now()+'-'+Math.random().toString(36).slice(2)+path.extname(file.originalname).toLowerCase())});
const memoryStorage=multer.memoryStorage();
const upload=multer({
  storage:objectStorageEnabled?memoryStorage:diskStorage,
  limits:{fileSize:(Number(process.env.MAX_UPLOAD_MB)||15)*1024*1024},
  fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.mimetype))
});
function safeObjectName(name){return String(name||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-180)}
function makeObjectKey(prefix,file){
  const ext=path.extname(file.originalname||'').toLowerCase();
  return prefix+'/'+Date.now()+'-'+crypto.randomBytes(10).toString('hex')+ext;
}
async function storeUpload(file,key){
  if(objectStorageEnabled){
    await objectStorage.send(new PutObjectCommand({
      Bucket:R2_BUCKET,Key:key,Body:file.buffer,ContentType:file.mimetype,Metadata:{original_name:safeObjectName(file.originalname)}
    }));
    return {storage_provider:'r2',storage_key:key,file_url:null};
  }
  const filename=Date.now()+'-'+crypto.randomBytes(10).toString('hex')+path.extname(file.originalname||'').toLowerCase();
  const target=path.join(uploadDir,filename);
  if(file.buffer)fs.writeFileSync(target,file.buffer);
  return {storage_provider:'local',storage_key:filename,file_url:'/uploads/'+filename};
}
async function removeStoredFile(storageProvider,storageKey,fileUrl){
  if(storageProvider==='r2'&&storageKey&&objectStorageEnabled){
    await objectStorage.send(new DeleteObjectCommand({Bucket:R2_BUCKET,Key:storageKey}));return;
  }
  const filename=String(storageKey||fileUrl||'').replace(/^\/uploads\//,'');
  const filePath=path.resolve(uploadDir,filename);
  if(filePath.startsWith(path.resolve(uploadDir)+path.sep)){try{fs.unlinkSync(filePath)}catch{}}
}
async function storedFileUrl(storageProvider,storageKey,fileUrl,expires=600){
  if(storageProvider==='r2'&&storageKey&&objectStorageEnabled){
    return await getSignedUrl(objectStorage,new GetObjectCommand({Bucket:R2_BUCKET,Key:storageKey}),{expiresIn:expires});
  }
  return fileUrl||null;
}

const kycUpload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:5*1024*1024,files:2},
  fileFilter:(req,file,cb)=>{
    const allowed=['image/jpeg','image/png','image/webp','application/pdf'];
    const selfieAllowed=['image/jpeg','image/png','image/webp'];
    const ok=file.fieldname==='selfie'?selfieAllowed.includes(file.mimetype):allowed.includes(file.mimetype);
    cb(null,ok);
  }
});
function kycEncryptionKey(){
  const raw=String(process.env.KYC_ENCRYPTION_KEY||'').trim();
  if(!raw)throw new Error('KYC_ENCRYPTION_KEY is not configured.');
  let key;
  if(/^[0-9a-fA-F]{64}$/.test(raw))key=Buffer.from(raw,'hex');
  else{try{key=Buffer.from(raw,'base64')}catch{}}
  if(!key||key.length!==32)throw new Error('KYC_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.');
  return key;
}
function encryptKyc(buffer){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',kycEncryptionKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(buffer),cipher.final()]);
  return {ciphertext,iv,authTag:cipher.getAuthTag()};
}
function decryptKyc(ciphertext,iv,authTag){
  const decipher=crypto.createDecipheriv('aes-256-gcm',kycEncryptionKey(),iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext),decipher.final()]);
}

app.use('/uploads',express.static(uploadDir));
app.get('/api/storage/status',(req,res)=>res.json({permanent_storage:objectStorageEnabled,provider:objectStorageEnabled?'r2':'local'}));

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
const D7_SENDER_ID=String(process.env.D7_SENDER_ID||'SignOTP').trim();
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

async function providerSubscriptionState(providerId){
  const {rows}=await pool.query("SELECT id,plan_name,status,starts_at,expires_at FROM provider_subscriptions WHERE provider_id=$1 AND status='active' AND expires_at>NOW() ORDER BY expires_at DESC LIMIT 1",[providerId]);
  return rows[0]||null;
}
async function providerReferralCount(providerId){
  const {rows}=await pool.query("SELECT COUNT(*)::int AS count FROM service_requests WHERE provider_id=$1",[providerId]);
  return Number(rows[0]?.count||0);
}

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
    const referralCount=await providerReferralCount(provider_id);
    const subscription=await providerSubscriptionState(provider_id);
    const locked=referralCount>3&&!subscription;
    await pool.query('INSERT INTO provider_notifications(provider_id,type,title,message,service_request_id) VALUES($1,$2,$3,$4,$5)',[
      provider_id,'job_request','New service request',
      locked?'A customer has requested your service. You have used your 3 free referrals. Subscribe to view the request details and receive new requests.':'A customer has requested your service. Open your Provider Portal to view the request details.',
      rows[0].id
    ]);
    await audit(req.user.sub,null,'service_request.created','service_request',rows[0].id,{provider_id,service_id,referral_count:referralCount,locked});
    res.status(201).json(Object.assign({},rows[0],{provider_locked:locked}));
  }catch(e){console.error('Service request error:',e);res.status(500).json({error:'Unable to create service request.'})}
});

app.post('/api/service-requests/:id/photos',requireAuth,upload.array('photos',5),async(req,res)=>{
  const files=req.files||[];
  if(!files.length)return res.status(400).json({error:'Please upload at least one photo.'});
  const cleanup=[];
  try{
    const current=await pool.query('SELECT id,customer_user_id,provider_id FROM service_requests WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=current.rows[0];
    const allowed=req.user.role==='customer'&&r.customer_user_id===req.user.sub || req.user.role==='provider' && (await pool.query('SELECT 1 FROM provider_profiles WHERE id=$1 AND user_id=$2',[r.provider_id,req.user.sub])).rows[0];
    if(!allowed)return res.status(403).json({error:'You do not have access to this request.'});
    const count=await pool.query('SELECT COUNT(*)::int AS count FROM service_request_photos WHERE service_request_id=$1',[r.id]);
    if(count.rows[0].count+files.length>5)return res.status(400).json({error:'A request can have a maximum of 5 photos.'});
    const saved=[];
    for(const f of files){
      const key=makeObjectKey('service-request-photos/'+r.id,f);
      const stored=await storeUpload(f,key);
      cleanup.push(stored);
      const row=await pool.query('INSERT INTO service_request_photos(service_request_id,uploaded_by,file_url,storage_key,storage_provider,original_name) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,file_url,storage_key,storage_provider,original_name,created_at',[r.id,req.user.sub,stored.file_url,stored.storage_key,stored.storage_provider,f.originalname]);
      saved.push(row.rows[0]);
    }
    await audit(req.user.sub,r.customer_user_id,'service_request.photos_uploaded','service_request',r.id,{count:saved.length,storage:objectStorageEnabled?'r2':'local'});
    res.status(201).json(saved.map(x=>({...x,file_url:objectStorageEnabled&&x.storage_provider==='r2'?('/api/service-requests/'+encodeURIComponent(r.id)+'/photos/'+encodeURIComponent(x.id)+'/file'):x.file_url})));
  }catch(e){
    for(const item of cleanup){try{await removeStoredFile(item.storage_provider,item.storage_key,item.file_url)}catch{}}
    console.error('Request photos error:',e);res.status(500).json({error:'Unable to save request photos.'});
  }
});
app.get('/api/service-requests/:id/photos/:photoId/file',requireAuth,async(req,res)=>{
  try{
    const current=await pool.query('SELECT sr.customer_user_id,sr.provider_id,p.id,p.file_url,p.storage_key,p.storage_provider,p.original_name FROM service_requests sr JOIN service_request_photos p ON p.service_request_id=sr.id WHERE sr.id=$1 AND p.id=$2',[req.params.id,req.params.photoId]);
    const row=current.rows[0];if(!row)return res.status(404).json({error:'Photo not found.'});
    const allowed=req.user.role==='customer'&&row.customer_user_id===req.user.sub || req.user.role==='provider' && (await pool.query('SELECT 1 FROM provider_profiles WHERE id=$1 AND user_id=$2',[row.provider_id,req.user.sub])).rows[0] || req.user.role==='admin';
    if(!allowed)return res.status(403).json({error:'You do not have access to this photo.'});
    if(row.storage_provider==='r2'&&row.storage_key&&objectStorageEnabled)return res.redirect(await storedFileUrl(row.storage_provider,row.storage_key,row.file_url,600));
    const filename=String(row.file_url||'').replace(/^\/uploads\//,'');const filePath=path.resolve(uploadDir,filename);
    if(!filePath.startsWith(path.resolve(uploadDir)+path.sep)||!fs.existsSync(filePath))return res.status(404).json({error:'File not found.'});
    res.sendFile(filePath);
  }catch(e){res.status(500).json({error:'Unable to load photo.'})}
});

app.get('/api/service-requests/:id/photos',requireAuth,async(req,res)=>{
  try{
    const current=await pool.query('SELECT customer_user_id,provider_id FROM service_requests WHERE id=$1',[req.params.id]);
    if(!current.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=current.rows[0];
    const allowed=req.user.role==='customer'&&r.customer_user_id===req.user.sub || req.user.role==='provider' && (await pool.query('SELECT 1 FROM provider_profiles WHERE id=$1 AND user_id=$2',[r.provider_id,req.user.sub])).rows[0];
    if(!allowed)return res.status(403).json({error:'You do not have access to these photos.'});
    const {rows}=await pool.query('SELECT id,file_url,storage_key,storage_provider,original_name,created_at FROM service_request_photos WHERE service_request_id=$1 ORDER BY created_at ASC',[req.params.id]);
    res.json(rows.map(x=>({...x,file_url:objectStorageEnabled&&x.storage_provider==='r2'?('/api/service-requests/'+encodeURIComponent(req.params.id)+'/photos/'+encodeURIComponent(x.id)+'/file'):x.file_url})));
  }catch(e){res.status(500).json({error:'Unable to load request photos.'})}
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

app.get('/api/provider/notifications',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const profile=await pool.query('SELECT id FROM provider_profiles WHERE user_id=$1 LIMIT 1',[req.user.sub]);
    if(!profile.rows[0])return res.status(404).json({error:'Provider profile not found.'});
    const {rows}=await pool.query('SELECT id,type,title,message,service_request_id,is_read,created_at FROM provider_notifications WHERE provider_id=$1 ORDER BY created_at DESC LIMIT 50',[profile.rows[0].id]);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load notifications.'})}
});
app.patch('/api/provider/notifications/:id/read',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const profile=await pool.query('SELECT id FROM provider_profiles WHERE user_id=$1 LIMIT 1',[req.user.sub]);
    const {rows}=await pool.query('UPDATE provider_notifications SET is_read=true WHERE id=$1 AND provider_id=$2 RETURNING id,is_read',[req.params.id,profile.rows[0]?.id]);
    if(!rows[0])return res.status(404).json({error:'Notification not found.'});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to update notification.'})}
});
app.get('/api/provider/subscription',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const profile=await pool.query('SELECT id FROM provider_profiles WHERE user_id=$1',[req.user.sub]);
    if(!profile.rows[0])return res.status(404).json({error:'Provider profile not found.'});
    const providerId=profile.rows[0].id;
    const subscription=await providerSubscriptionState(providerId);
    const referrals=await providerReferralCount(providerId);
    const payments=await pool.query('SELECT id,plan_name,amount_sle,status,provider_reference,created_at FROM provider_subscription_payments WHERE provider_id=$1 ORDER BY created_at DESC LIMIT 10',[providerId]);
    res.json({subscription,referral_count:referrals,free_referrals:3,can_receive_requests:!!subscription||referrals<3,payments:payments.rows});
  }catch(e){res.status(500).json({error:'Unable to load subscription status.'})}
});
app.post('/api/provider/subscription/request',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  const plans={Pro:20,Business:40,Premium:60};
  const plan=String(req.body&&req.body.plan_name||'').trim();
  if(!plans[plan])return res.status(400).json({error:'Choose a valid paid plan.'});
  try{
    const profile=await pool.query('SELECT id FROM provider_profiles WHERE user_id=$1',[req.user.sub]);
    if(!profile.rows[0])return res.status(404).json({error:'Create your provider profile first.'});
    const existing=await pool.query("SELECT id,status FROM provider_subscription_payments WHERE provider_id=$1 AND status IN ('pending','processing') ORDER BY created_at DESC LIMIT 1",[profile.rows[0].id]);
    if(existing.rows[0])return res.status(409).json({error:'You already have a pending subscription payment request.'});
    const {rows}=await pool.query('INSERT INTO provider_subscription_payments(provider_id,plan_name,amount_sle,status,gateway) VALUES($1,$2,$3,\'pending\',\'not_configured\') RETURNING id,plan_name,amount_sle,status,created_at',[profile.rows[0].id,plan,plans[plan]]);
    await audit(req.user.sub,null,'provider.subscription_payment_requested','provider_subscription_payment',rows[0].id,{plan_name:plan,amount_sle:plans[plan]});
    res.status(201).json({payment:rows[0],gateway_ready:false,message:'Subscription request recorded. Live Orange Money payment is not connected yet, so no money was collected.'});
  }catch(e){console.error('Subscription request error:',e);res.status(500).json({error:'Unable to create subscription payment request.'})}
});

app.get('/api/provider/requests',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider')return res.status(403).json({error:'Provider account required.'});
  try{
    const profile=await pool.query('SELECT id FROM provider_profiles WHERE user_id=$1 LIMIT 1',[req.user.sub]);
    if(!profile.rows[0])return res.status(404).json({error:'Provider profile not found.'});
    const providerId=profile.rows[0].id;
    const subscription=await providerSubscriptionState(providerId);
    const referralCount=await providerReferralCount(providerId);
    const base=`SELECT sr.id,sr.status,sr.region,sr.district,sr.area,sr.service_address,sr.directions,sr.pricing_type,sr.job_details,sr.quoted_amount,sr.created_at,
      u.full_name AS customer_name,u.phone AS customer_phone,s.name AS service_name
      FROM service_requests sr
      LEFT JOIN users u ON u.id=sr.customer_user_id
      LEFT JOIN services s ON s.id=sr.service_id
      WHERE sr.provider_id=$1
      ORDER BY sr.created_at DESC LIMIT 100`;
    const result=await pool.query(base,[providerId]);
    const requests=subscription?result.rows:result.rows.filter((r,idx)=>idx<3);
    res.json({requests,subscription:subscription||null,referral_count:referralCount,free_referrals:3,locked_requests:subscription?0:Math.max(0,referralCount-3),can_receive_requests:!!subscription||referralCount<3});
  }catch(e){console.error('Provider requests error:',e);res.status(500).json({error:'Unable to load provider requests.'})}
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
    const subscription=await providerSubscriptionState(r.provider_id);
    const fee=subscription?0:Number((amount*0.01).toFixed(2));
    const earnings=Number((amount-fee).toFixed(2));
    const {rows}=await pool.query(`UPDATE service_requests SET status='quoted',quoted_amount=$1,platform_fee=$2,provider_earnings=$3,updated_at=NOW() WHERE id=$4 RETURNING id,status,quoted_amount,platform_fee,provider_earnings,updated_at`,[amount,fee,earnings,r.id]);
    await audit(req.user.sub,r.customer_user_id,'service_request.quote_sent','service_request',r.id,{quoted_amount:amount,platform_fee:fee,provider_earnings:earnings,subscription_active:!!subscription});
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
    const providerSubscription=await providerSubscriptionState(r.provider_id);
    const fee=providerSubscription?0:Number((Number(r.quoted_amount)*0.01).toFixed(2));
    const earnings=Number((Number(r.quoted_amount)-fee).toFixed(2));
    const {rows}=await pool.query(`INSERT INTO payment_transactions(service_request_id,customer_user_id,provider_id,amount_sle,platform_fee,provider_earnings,gateway,status)
      VALUES($1,$2,$3,$4,$5,$6,'not_configured','pending')
      RETURNING id,status,amount_sle,platform_fee,provider_earnings,gateway,created_at`,[r.id,req.user.sub,r.provider_id,r.quoted_amount,fee,earnings]);
    await audit(req.user.sub,null,'payment.intent_created','payment_transaction',rows[0].id,{service_request_id:r.id,amount_sle:Number(r.quoted_amount),gateway:'not_configured',subscription_active:!!providerSubscription});
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

app.get('/api/providers/:id/reviews',async(req,res)=>{
  try{
    const {rows}=await pool.query(`SELECT pr.id,pr.rating,pr.review_text,pr.created_at,u.full_name AS customer_name
      FROM provider_reviews pr JOIN users u ON u.id=pr.customer_user_id
      WHERE pr.provider_id=$1 ORDER BY pr.created_at DESC LIMIT 100`,[req.params.id]);
    const stats=await pool.query('SELECT COUNT(*)::int AS count,COALESCE(ROUND(AVG(rating)::numeric,1),0) AS average FROM provider_reviews WHERE provider_id=$1',[req.params.id]);
    res.json({reviews:rows,rating:Number(stats.rows[0].average||0),review_count:Number(stats.rows[0].count||0)});
  }catch(e){res.status(500).json({error:'Unable to load provider reviews.'})}
});

app.post('/api/service-requests/:id/review',requireAuth,async(req,res)=>{
  if(req.user.role!=='customer')return res.status(403).json({error:'Customer account required.'});
  const rating=Number(req.body&&req.body.rating);
  const reviewText=String(req.body&&req.body.review_text||'').trim();
  if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:'Rating must be between 1 and 5.'});
  if(reviewText.length>1000)return res.status(400).json({error:'Review is too long.'});
  try{
    const q=await pool.query('SELECT id,customer_user_id,provider_id,status FROM service_requests WHERE id=$1',[req.params.id]);
    if(!q.rows[0])return res.status(404).json({error:'Service request not found.'});
    const r=q.rows[0];
    if(r.customer_user_id!==req.user.sub)return res.status(403).json({error:'You do not have access to this request.'});
    if(r.status!=='completed')return res.status(409).json({error:'You can review a provider only after the job is completed.'});
    if(!r.provider_id)return res.status(409).json({error:'This request has no provider to review.'});
    const existing=await pool.query('SELECT id FROM provider_reviews WHERE service_request_id=$1',[r.id]);
    if(existing.rows[0])return res.status(409).json({error:'You have already reviewed this completed job.'});
    const {rows}=await pool.query(`INSERT INTO provider_reviews(service_request_id,customer_user_id,provider_id,rating,review_text)
      VALUES($1,$2,$3,$4,$5) RETURNING id,rating,review_text,created_at`,[r.id,req.user.sub,r.provider_id,rating,reviewText||null]);
    await audit(req.user.sub,null,'provider.review_created','provider_review',rows[0].id,{provider_id:r.provider_id,service_request_id:r.id,rating});
    res.status(201).json(rows[0]);
  }catch(e){console.error('Review error:',e);res.status(500).json({error:'Unable to submit review.'})}
});

app.get('/api/providers/:id/work',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT id,media_type,file_url,storage_key,storage_provider,caption,created_at FROM provider_work WHERE provider_id=$1 ORDER BY created_at DESC',[req.params.id]);
    const result=[];
    for(const row of rows){
      const file_url=await storedFileUrl(row.storage_provider,row.storage_key,row.file_url,600);
      result.push({id:row.id,media_type:row.media_type,file_url:objectStorageEnabled&&row.storage_provider==='r2'?('/api/providers/'+encodeURIComponent(req.params.id)+'/work/'+encodeURIComponent(row.id)+'/file'):file_url,caption:row.caption,created_at:row.created_at});
    }
    res.json(result);
  }catch(e){console.error('Portfolio load error:',e);res.status(500).json({error:'Unable to load portfolio'})}
});
app.get('/api/providers/:id/work/:workId/file',async(req,res)=>{
  try{
    const q=await pool.query('SELECT media_type,file_url,storage_key,storage_provider FROM provider_work WHERE id=$1 AND provider_id=$2',[req.params.workId,req.params.id]);
    const row=q.rows[0];if(!row)return res.status(404).json({error:'Portfolio item not found.'});
    if(row.storage_provider==='r2'&&row.storage_key&&objectStorageEnabled)return res.redirect(await storedFileUrl(row.storage_provider,row.storage_key,row.file_url,600));
    const filename=String(row.file_url||'').replace(/^\/uploads\//,'');const filePath=path.resolve(uploadDir,filename);
    if(!filePath.startsWith(path.resolve(uploadDir)+path.sep)||!fs.existsSync(filePath))return res.status(404).json({error:'File not found.'});
    res.sendFile(filePath);
  }catch(e){res.status(500).json({error:'Unable to load portfolio file.'})}
});
app.post('/api/providers/:id/work',requireAuth,upload.single('media'),async(req,res)=>{
  if(req.user.role!=='provider'&&req.user.role!=='admin')return res.status(403).json({error:'Provider access required.'});
  if(req.user.role==='provider'){
    const owner=await pool.query('SELECT id FROM provider_profiles WHERE id=$1 AND user_id=$2',[req.params.id,req.user.sub]);
    if(!owner.rows[0])return res.status(403).json({error:'You can only manage your own portfolio.'});
  }
  if(!req.file)return res.status(400).json({error:'Please upload an image or video.'});
  const caption=(req.body.caption||'').trim();
  if(!caption)return res.status(400).json({error:'Caption is required.'});
  const mediaType=req.file.mimetype.startsWith('video/')?'video':'image';
  const key=makeObjectKey('provider-work/'+req.params.id,req.file);
  try{
    const stored=await storeUpload(req.file,key);
    const {rows}=await pool.query('INSERT INTO provider_work(provider_id,media_type,file_url,storage_key,storage_provider,caption) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,media_type,file_url,storage_key,storage_provider,caption,created_at',[req.params.id,mediaType,stored.file_url,stored.storage_key,stored.storage_provider,caption]);
    res.status(201).json(rows[0]);
  }catch(e){try{await removeStoredFile(objectStorageEnabled?'r2':'local',key,req.file.filename?'/uploads/'+req.file.filename:null)}catch{};console.error('Portfolio upload error:',e);res.status(500).json({error:'Unable to save portfolio item'})}
});

app.delete('/api/providers/:id/work/:workId',requireAuth,async(req,res)=>{
  if(req.user.role!=='provider'&&req.user.role!=='admin')return res.status(403).json({error:'Provider access required.'});
  try{
    const owner=req.user.role==='admin'
      ? await pool.query('SELECT id,file_url,storage_key,storage_provider FROM provider_work WHERE id=$1 AND provider_id=$2',[req.params.workId,req.params.id])
      : await pool.query('SELECT w.id,w.file_url,w.storage_key,w.storage_provider FROM provider_work w JOIN provider_profiles p ON p.id=w.provider_id WHERE w.id=$1 AND w.provider_id=$2 AND p.user_id=$3',[req.params.workId,req.params.id,req.user.sub]);
    const item=owner.rows[0];
    if(!item)return res.status(404).json({error:'Portfolio item not found.'});
    await pool.query('DELETE FROM provider_work WHERE id=$1',[item.id]);
    await removeStoredFile(item.storage_provider,item.storage_key,item.file_url);
    res.json({ok:true});
  }catch(e){console.error('Portfolio delete error:',e);res.status(500).json({error:'Unable to delete portfolio item'})}
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
app.post('/api/verification/identity',requireAuth,kycUpload.fields([{name:'document',maxCount:1},{name:'selfie',maxCount:1}]),async(req,res)=>{
  const document=req.files?.document?.[0];
  const selfie=req.files?.selfie?.[0];
  const documentType=String(req.body?.document_type||'').trim().slice(0,50);
  if(!document||!selfie||!documentType)return res.status(400).json({error:'Document type, identity document and selfie are required.'});
  if(!['national_id','passport','drivers_license','voter_id'].includes(documentType))return res.status(400).json({error:'Choose a supported identity document type.'});
  try{
    const user=await pool.query('SELECT id,role,status FROM users WHERE id=$1',[req.user.sub]);
    if(!user.rows[0])return res.status(404).json({error:'Account not found.'});
    if(['suspended','banned'].includes(user.rows[0].status))return res.status(403).json({error:'Account is restricted.'});
    const phone=await pool.query("SELECT status FROM phone_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[req.user.sub]);
    if(phone.rows[0]?.status!=='verified')return res.status(409).json({error:'Verify your phone number before submitting identity verification.'});
    const doc=encryptKyc(document.buffer);
    const selfieData=encryptKyc(selfie.buffer);
    await pool.query("UPDATE identity_verifications SET status='rejected',rejection_reason='Replaced by a newer submission',updated_at=NOW() WHERE user_id=$1 AND status IN ('pending','under_review')",[req.user.sub]);
    const {rows}=await pool.query(`INSERT INTO identity_verifications(
      user_id,status,document_type,document_storage_key,document_original_name,document_mime_type,document_ciphertext,document_iv,document_auth_tag,
      selfie_storage_key,selfie_original_name,selfie_mime_type,selfie_ciphertext,selfie_iv,selfie_auth_tag
    ) VALUES($1,'pending',$2,'postgresql-encrypted-v1',$3,$4,$5,$6,$7,'postgresql-encrypted-v1',$8,$9,$10,$11,$12)
    RETURNING id,status,document_type,created_at`,
      [req.user.sub,documentType,document.originalname,document.mimetype,doc.ciphertext,doc.iv,doc.authTag,selfie.originalname,selfie.mimetype,selfieData.ciphertext,selfieData.iv,selfieData.authTag]);
    await audit(req.user.sub,req.user.sub,'identity_verification.submitted','identity_verification',rows[0].id,{document_type:documentType,encrypted_storage:'postgresql'});
    res.status(201).json({verification:rows[0],message:'Identity verification submitted securely. FixIt Trust & Safety will review it.'});
  }catch(e){
    console.error('Identity verification submission error:',e);
    const status=/KYC_ENCRYPTION_KEY/.test(e.message||'')?503:500;
    res.status(status).json({error:/KYC_ENCRYPTION_KEY/.test(e.message||'')?'Secure KYC storage is not configured yet. Please contact FixIt Salone support.':'Unable to submit identity verification.'});
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


const OPENAI_API_KEY=String(process.env.OPENAI_API_KEY||'').trim();
const SUPPORT_AI_MODEL=String(process.env.SUPPORT_AI_MODEL||'gpt-6-luna').trim();
const SUPPORT_KNOWLEDGE=fs.readFileSync(path.join(__dirname,'..','knowledge','fixit-salone-knowledge.md'),'utf8');
const supportChatLimiter=rateLimit({windowMs:10*60*1000,max:30,standardHeaders:true,legacyHeaders:false,message:{error:'Too many support chat messages. Please try again shortly.'}});

app.post('/api/support/chat',supportChatLimiter,async(req,res)=>{
  const message=String(req.body&&req.body.message||'').trim();
  const history=Array.isArray(req.body&&req.body.history)?req.body.history:[];
  if(!message)return res.status(400).json({error:'Please enter a message.'});
  if(message.length>1200)return res.status(400).json({error:'Please keep your message under 1,200 characters.'});

  const cleanHistory=history
    .filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string')
    .slice(-10)
    .map(x=>({role:x.role,content:x.content.slice(0,1600)}));

  const instructions=`You are the FixIt Salone Support Assistant. Follow the approved FixIt Salone knowledge base below as your source of truth.
${SUPPORT_KNOWLEDGE}

Additional operating rules:
- Answer only from the knowledge base and information explicitly available in the user's message.
- Never invent providers, prices, ratings, transactions, payment status, verification status, policies or capabilities.
- Never ask for passwords, PINs, OTPs, full card numbers, CVV/security codes, identity numbers or identity documents.
- Never claim that a payment was collected, a subscription was activated, an account was verified, or a support ticket was created unless the application explicitly confirms it.
- For account-specific, payment-specific, safety, dispute or verification matters that you cannot verify, direct the user to human support.
- If there is immediate danger, tell the user to prioritize immediate safety and contact appropriate local emergency services or trusted people, then FixIt Salone support.
- Be friendly, concise, practical and use simple English.
`;

  if(!OPENAI_API_KEY){
    return res.json({reply:'I can help with general FixIt Salone questions. For account-specific or urgent support, please email kamarajoseph247@gmail.com or call/WhatsApp +232 31 864040. The AI support service is currently being configured.'});
  }

  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':'Bearer '+OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:SUPPORT_AI_MODEL,
        instructions,
        input:[...cleanHistory,{role:'user',content:message}],
        max_output_tokens:500
      })
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok){
      console.error('Support AI error:',response.status,data);
      return res.status(502).json({error:'The support assistant is temporarily unavailable. Please contact FixIt Salone support at kamarajoseph247@gmail.com or +232 31 864040.'});
    }
    const reply=String(data.output_text||'').trim();
    if(!reply) return res.status(502).json({error:'The support assistant did not return a response. Please contact FixIt Salone support.'});
    res.json({reply});
  }catch(e){
    console.error('Support chat error:',e);
    res.status(502).json({error:'The support assistant is temporarily unavailable. Please contact FixIt Salone support.'});
  }
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
    const {rows}=await pool.query('SELECT iv.id,iv.user_id,u.full_name,u.role,u.phone,iv.status,iv.document_type,iv.document_original_name,iv.selfie_original_name,iv.document_ciphertext IS NOT NULL AS document_available,iv.selfie_ciphertext IS NOT NULL AS selfie_available,iv.created_at,iv.verified_at,iv.rejection_reason FROM identity_verifications iv JOIN users u ON u.id=iv.user_id ORDER BY iv.created_at DESC LIMIT 200');
    res.json(rows.map(r=>({id:r.id,user_id:r.user_id,full_name:r.full_name,role:r.role,phone:r.phone,status:r.status,document_type:r.document_type||'Not provided',document_original_name:r.document_original_name||null,selfie_original_name:r.selfie_original_name||null,document_available:r.document_available,selfie_available:r.selfie_available,created_at:r.created_at,verified_at:r.verified_at,rejection_reason:r.rejection_reason||null})));
  }catch(e){res.status(500).json({error:'Unable to load verification queue.'})}
});
app.get('/api/admin/verifications/:id/file',async(req,res)=>{
  const type=String(req.query?.type||'document');
  if(!['document','selfie'].includes(type))return res.status(400).json({error:'Invalid verification file type.'});
  try{
    const {rows}=await pool.query(`SELECT id,user_id,status,
      document_ciphertext,document_iv,document_auth_tag,document_mime_type,document_original_name,
      selfie_ciphertext,selfie_iv,selfie_auth_tag,selfie_mime_type,selfie_original_name
      FROM identity_verifications WHERE id=$1 LIMIT 1`,[req.params.id]);
    const row=rows[0];
    if(!row)return res.status(404).json({error:'Verification record not found.'});
    const prefix=type==='document'?'document':'selfie';
    const ciphertext=row[prefix+'_ciphertext'],iv=row[prefix+'_iv'],authTag=row[prefix+'_auth_tag'];
    if(!ciphertext||!iv||!authTag)return res.status(404).json({error:'Verification file is not available.'});
    const data=decryptKyc(ciphertext,iv,authTag);
    await audit(req.user.sub,row.user_id,'admin.identity_file_access','identity_verification',row.id,{file_type:type});
    res.setHeader('Content-Type',row[prefix+'_mime_type']||'application/octet-stream');
    res.setHeader('Content-Disposition','inline; filename="'+String(row[prefix+'_original_name']||type).replace(/[^a-zA-Z0-9._-]/g,'_')+'"');
    res.send(data);
  }catch(e){
    console.error('Admin identity file error:',e);
    const status=/KYC_ENCRYPTION_KEY/.test(e.message||'')?503:500;
    res.status(status).json({error:/KYC_ENCRYPTION_KEY/.test(e.message||'')?'Secure KYC storage is not configured.':'Unable to open verification file.'});
  }
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
app.get('/api/admin/subscription-payments',async(req,res)=>{
  try{
    const {rows}=await pool.query(`SELECT p.id,p.provider_id,p.plan_name,p.amount_sle,p.status,p.gateway,p.provider_reference,p.created_at,p.updated_at,
      pp.business_name,u.full_name AS provider_name,u.phone AS provider_phone,pp.verification_status
      FROM provider_subscription_payments p
      JOIN provider_profiles pp ON pp.id=p.provider_id
      JOIN users u ON u.id=pp.user_id
      ORDER BY p.created_at DESC LIMIT 300`);
    res.json(rows);
  }catch(e){console.error('Admin subscription payments error:',e);res.status(500).json({error:'Unable to load subscription payments.'})}
});
app.patch('/api/admin/subscription-payments/:id',async(req,res)=>{
  const {status,provider_reference,duration_months}=req.body||{};
  if(!['pending','processing','paid','failed','cancelled'].includes(status))return res.status(400).json({error:'Invalid subscription payment status.'});
  const months=Number(duration_months||1);
  if(!Number.isInteger(months)||months<1||months>12)return res.status(400).json({error:'Duration must be between 1 and 12 months.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const current=await client.query(`SELECT p.id,p.provider_id,p.plan_name,p.amount_sle,p.status,p.provider_reference,pp.business_name,u.full_name AS provider_name
      FROM provider_subscription_payments p
      JOIN provider_profiles pp ON pp.id=p.provider_id
      JOIN users u ON u.id=pp.user_id
      WHERE p.id=$1 FOR UPDATE`,[req.params.id]);
    if(!current.rows[0]){await client.query('ROLLBACK');return res.status(404).json({error:'Subscription payment not found.'})}
    const p=current.rows[0];
    if(['paid','failed','cancelled'].includes(p.status)&&status!==p.status){
      await client.query('ROLLBACK');return res.status(409).json({error:'This subscription payment has already been finalized.'});
    }
    const reference=String(provider_reference||p.provider_reference||'').trim()||null;
    const updated=await client.query('UPDATE provider_subscription_payments SET status=$1,provider_reference=$2,updated_at=NOW() WHERE id=$3 RETURNING id,provider_id,plan_name,amount_sle,status,gateway,provider_reference,updated_at',[status,reference,p.id]);
    if(status==='paid'){
      await client.query("UPDATE provider_subscriptions SET status='expired',updated_at=NOW() WHERE provider_id=$1 AND status='active' AND expires_at>NOW()",[p.provider_id]);
      await client.query(`INSERT INTO provider_subscriptions(provider_id,plan_name,status,starts_at,expires_at)
        VALUES($1,$2,'active',NOW(),NOW()+(($3::text||' months')::interval))`,[p.provider_id,p.plan_name,months]);
      await client.query('INSERT INTO audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[req.user.sub,p.provider_id,'admin.subscription_activated','provider_subscription',p.provider_id,{payment_id:p.id,plan_name:p.plan_name,amount_sle:Number(p.amount_sle),duration_months:months,provider_reference:reference,manual_confirmation:true}]);
    }else{
      await client.query('INSERT INTO audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[req.user.sub,p.provider_id,'admin.subscription_payment_update','provider_subscription_payment',p.id,{status,provider_reference:reference}]);
    }
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  }catch(e){
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Admin subscription payment update error:',e);
    res.status(500).json({error:'Unable to update subscription payment.'});
  }finally{client.release()}
});
app.get('/api/admin/subscriptions',async(req,res)=>{
  try{
    const {rows}=await pool.query(`SELECT ps.id,ps.provider_id,ps.plan_name,ps.status,ps.starts_at,ps.expires_at,
      pp.business_name,u.full_name AS provider_name,u.phone AS provider_phone
      FROM provider_subscriptions ps
      JOIN provider_profiles pp ON pp.id=ps.provider_id
      JOIN users u ON u.id=pp.user_id
      ORDER BY ps.created_at DESC LIMIT 300`);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load subscriptions.'})}
});
app.get('/api/admin/payments',async(req,res)=>{
  try{
    const {rows}=await pool.query(`SELECT pt.id,pt.service_request_id,pt.amount_sle,pt.platform_fee,pt.provider_earnings,pt.currency,pt.gateway,pt.status,pt.provider_reference,pt.created_at,
      cu.full_name AS customer_name,cu.phone AS customer_phone,pp.business_name
      FROM payment_transactions pt
      JOIN users cu ON cu.id=pt.customer_user_id
      LEFT JOIN provider_profiles pp ON pp.id=pt.provider_id
      ORDER BY pt.created_at DESC LIMIT 300`);
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load payment records.'})}
});
app.get('/api/admin/audit',async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT a.id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 500');
    res.json(rows);
  }catch(e){res.status(500).json({error:'Unable to load audit history.'})}
});

initializeDatabase().then(()=>bootstrapAdmin()).then(()=>{app.listen(process.env.PORT||4000,()=>console.log('FixIt backend running on port '+(process.env.PORT||4000)));}).catch(err=>{console.error('Database initialization failed:',err);process.exit(1);});
