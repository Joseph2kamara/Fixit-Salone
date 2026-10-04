require('dotenv').config();
const bcrypt=require('bcryptjs');
const {Pool}=require('pg');

const phone=process.argv[2];
const password=process.argv[3];
const name=process.argv[4]||'FixIt Salone Admin';

if(!phone||!password){
  console.error('Usage: node scripts/create-admin.js <phone> <password> [full name]');
  process.exit(1);
}
if(password.length<12){
  console.error('Admin password must be at least 12 characters.');
  process.exit(1);
}
if(!process.env.DATABASE_URL){
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
(async()=>{
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  try{
    const hash=await bcrypt.hash(password,12);
    const existing=await pool.query('SELECT id FROM users WHERE phone=$1',[phone]);
    if(existing.rows[0]){
      await pool.query('UPDATE users SET full_name=$1,password_hash=$2,role=\'admin\',status=\'active\',updated_at=NOW() WHERE id=$3',[name,hash,existing.rows[0].id]);
      console.log('Existing account promoted to admin:',phone);
    }else{
      await pool.query('INSERT INTO users(full_name,phone,password_hash,role,status) VALUES($1,$2,$3,\'admin\',\'active\')',[name,phone,hash]);
      console.log('Admin account created:',phone);
    }
  }finally{await pool.end()}
})().catch(e=>{console.error(e.message);process.exit(1)});
