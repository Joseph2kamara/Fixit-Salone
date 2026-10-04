require('dotenv').config();
const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const multer=require('multer');
const path=require('path');
const fs=require('fs');
const {Pool}=require('pg');

const app=express();
app.use(helmet());
app.use(cors({origin:process.env.FRONTEND_URL||true}));
app.use(express.json({limit:'2mb'}));

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const uploadDir=path.resolve(process.env.UPLOAD_DIR||'uploads');
fs.mkdirSync(uploadDir,{recursive:true});

const storage=multer.diskStorage({
 destination:(req,file,cb)=>cb(null,uploadDir),
 filename:(req,file,cb)=>cb(null,Date.now()+'-'+Math.random().toString(36).slice(2)+path.extname(file.originalname).toLowerCase())
});
const upload=multer({
 storage,
 limits:{fileSize:(Number(process.env.MAX_UPLOAD_MB)||15)*1024*1024},
 fileFilter:(req,file,cb)=>{
  const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
  cb(null,allowed.includes(file.mimetype));
 }
});

app.use('/uploads',express.static(uploadDir));

app.get('/api/health',(req,res)=>res.json({ok:true,service:'fixit-salone'}));

app.get('/api/providers/:id/work',async(req,res)=>{
 try{
  const {rows}=await pool.query(
   'SELECT id,media_type,file_url,caption,created_at FROM provider_work WHERE provider_id=$1 ORDER BY created_at DESC',
   [req.params.id]
  );
  res.json(rows);
 }catch(e){res.status(500).json({error:'Unable to load portfolio'});}
});

app.post('/api/providers/:id/work',upload.single('media'),async(req,res)=>{
 if(!req.file)return res.status(400).json({error:'Please upload an image or video.'});
 const mediaType=req.file.mimetype.startsWith('video/')?'video':'image';
 const fileUrl='/uploads/'+req.file.filename;
 try{
  const {rows}=await pool.query(
   'INSERT INTO provider_work(provider_id,media_type,file_url,caption) VALUES($1,$2,$3,$4) RETURNING id,media_type,file_url,caption,created_at',
   [req.params.id,mediaType,fileUrl,(req.body.caption||'').trim()]
  );
  if(!req.body.caption?.trim()){fs.unlinkSync(path.join(uploadDir,req.file.filename));return res.status(400).json({error:'Caption is required.'});}
  res.status(201).json(rows[0]);
 }catch(e){
  try{fs.unlinkSync(path.join(uploadDir,req.file.filename));}catch{}
  res.status(500).json({error:'Unable to save portfolio item'});
 }
});

app.listen(process.env.PORT||4000,()=>console.log('FixIt backend running on port '+(process.env.PORT||4000)));