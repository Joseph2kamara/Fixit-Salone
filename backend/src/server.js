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
if(!JWT_SECRET) console.warn('WARNING: JWT_SECRET is not configured.');
app.use(helmet());
app.use(cors({origin:process.env.FRONTEND_URL||true}));
app.use(express.json({limit:'2mb'}));

const pool=new Pool({connectionString:process.env.DATABASE_URL});
async function bootstrapAdmin(){
  const phone=process.env.ADMIN_BOOTSTRAP_PHONE;
  const password=process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name=process.env.ADMIN_BOOTSTRAP_NAME||'FixIt Salone Admin';
  if(!phone||!password) return;
  if(password.length<12) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.');
  const hash=await bcrypt.hash(password,12);
  const existing=await pool.query('SELECT id FROM users WHERE phone=$1',[phone]);
  if(existing.rows[0]){
    await pool.query('UPDATE users SET full_name=$1,password_hash=$2,role=\'admin\',status=\'active\',updated_at=NOW() WHERE id=$3',[name,hash,existing.rows[0].id]);
    console.log('Bootstrap admin updated.');
  }else{
    await pool.query('INSERT INTO users(full_name,phone,password_hash,role,status) VALUES($1,$2,$3,\'admin\',\'active\')',[name,phone,hash]);
    console.log('Bootstrap admin created.');
  }
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
  const {full_name,phone,password,role}=req.body||{};
  if(!full_name||!phone||!password)return res.status(400).json({error:'Full name, phone and password are required.'});
  if(String(password).length<8)return res.status(400).json({error:'Password must be at least 8 characters.'});
  const safeRole=role==='provider'?'provider':'customer';
  try{
    const hash=await bcrypt.hash(String(password),12);
    const {rows}=await pool.query('INSERT INTO users(full_name,phone,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,full_name,phone,role,status',[String(full_name).trim(),String(phone).trim(),hash,safeRole]);
    const user=rows[0];
    res.status(201).json({user,token:signToken(user)});
  }catch(e){
    if(e.code==='23505')return res.status(409).json({error:'An account with that phone number already exists.'});
    res.status(500).json({error:'Unable to create account.'});
  }
});

app.post('/api/auth/login',authLimiter,async(req,res)=>{
  const {phone,password}=req.body||{};
  if(!phone||!password)return res.status(400).json({error:'Phone and password are required.'});
  try{
    const {rows}=await pool.query('SELECT id,full_name,phone,role,status,password_hash FROM users WHERE phone=$1 LIMIT 1',[String(phone).trim()]);
    const user=rows[0];
    if(!user||!user.password_hash)return res.status(401).json({error:'Invalid phone number or password.'});
    if(user.status==='suspended'||user.status==='banned')return res.status(403).json({error:'This account is restricted. Contact FixIt Salone support.'});
    const ok=await bcrypt.compare(String(password),user.password_hash);
    if(!ok)return res.status(401).json({error:'Invalid phone number or password.'});
    await pool.query('UPDATE users SET last_login_at=NOW(),failed_login_count=0,locked_until=NULL,updated_at=NOW() WHERE id=$1',[user.id]);
    delete user.password_hash;
    res.json({user,token:signToken(user)});
  }catch(e){res.status(500).json({error:'Unable to sign in.'})}
});

app.get('/api/auth/me',requireAuth,async(req,res)=>{
  try{
    const {rows}=await pool.query('SELECT id,full_name,phone,role,status,created_at,last_login_at FROM users WHERE id=$1',[req.user.sub]);
    if(!rows[0])return res.status(401).json({error:'Account not found.'});
    if(rows[0].status==='suspended'||rows[0].status==='banned')return res.status(403).json({error:'Account is restricted.'});
    res.json({user:rows[0]});
  }catch(e){res.status(500).json({error:'Unable to load account.'})}
});

app.get('/api/providers/:id/work',async(req,res)=>{
  try{const {rows}=await pool.query('SELECT id,media_type,file_url,caption,created_at FROM provider_work WHERE provider_id=$1 ORDER BY created_at DESC',[req.params.id]);res.json(rows)}
  catch(e){res.status(500).json({error:'Unable to load portfolio'})}
});
app.post('/api/providers/:id/work',upload.single('media'),async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Please upload an image or video.'});
  const caption=(req.body.caption||'').trim();
  if(!caption){try{fs.unlinkSync(path.join(uploadDir,req.file.filename))}catch{};return res.status(400).json({error:'Caption is required.'})}
  const mediaType=req.file.mimetype.startsWith('video/')?'video':'image';
  try{
    const {rows}=await pool.query('INSERT INTO provider_work(provider_id,media_type,file_url,caption) VALUES($1,$2,$3,$4) RETURNING id,media_type,file_url,caption,created_at',[req.params.id,mediaType,'/uploads/'+req.file.filename,caption]);
    res.status(201).json(rows[0]);
  }catch(e){try{fs.unlinkSync(path.join(uploadDir,req.file.filename))}catch{};res.status(500).json({error:'Unable to save portfolio item'})}
});

app.post('/api/incidents',async(req,res)=>{
  const {reporter_user_id,reported_user_id,job_id,reason,details}=req.body||{};
  if(!reason||!details)return res.status(400).json({error:'reason and details are required'});
  try{
    const {rows}=await pool.query('INSERT INTO incidents(reporter_user_id,reported_user_id,job_id,reason,details) VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at',[reporter_user_id||null,reported_user_id||null,job_id||null,reason,String(details).trim()]);
    res.status(201).json(rows[0]);
  }catch(e){res.status(500).json({error:'Unable to create incident'})}
});

app.post('/api/phone-verification/request',async(req,res)=>{
  const {user_id,phone}=req.body||{};
  if(!user_id||!phone)return res.status(400).json({error:'user_id and phone are required'});
  try{
    const {rows}=await pool.query('INSERT INTO phone_verifications(user_id,phone,status) VALUES($1,$2,$3) RETURNING id,status,created_at',[user_id,String(phone).trim(),'pending']);
    res.status(201).json({verification:rows[0],otp_sent:false,message:'OTP provider integration is not active. No real SMS was sent.'});
  }catch(e){res.status(500).json({error:'Unable to create phone verification request'})}
});
app.get('/api/verification/:userId',async(req,res)=>{
  try{const {rows}=await pool.query('SELECT status,document_type,verified_at,created_at FROM identity_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',[req.params.userId]);res.json(rows[0]||{status:'unverified'})}
  catch(e){res.status(500).json({error:'Unable to load verification status'})}
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
