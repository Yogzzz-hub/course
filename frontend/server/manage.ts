import { randomUUID } from 'node:crypto';
import { pool, migrate } from './db.ts';
import { passwordHash, permissions } from './security.ts';
const command=process.argv[2];
try {
  if(command==='migrate') {await migrate();console.log('Learning database migrated and question bank seeded.');}
  else if(command==='admin') {
    const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(), password=process.env.ADMIN_PASSWORD;
    const role=process.env.ADMIN_ROLE || 'owner';
    if(!email || !email.includes('@') || !password || password.length<16 || password.length>200 || !Object.hasOwn(permissions,role)) throw new Error('Set ADMIN_EMAIL, ADMIN_PASSWORD (16–200 characters) and a valid ADMIN_ROLE.');
    await pool.query('INSERT INTO learning_admins(id,email,password_hash,role) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET password_hash=$3,role=$4',[randomUUID(),email,passwordHash(password),role]);
    await pool.query('DELETE FROM learning_admin_sessions WHERE admin_id=(SELECT id FROM learning_admins WHERE email=$1)',[email]);
    console.log('Administrator provisioned; existing sessions revoked.');
  } else if(command==='prune') {
    await pool.query('DELETE FROM enquiry_keys WHERE expires_at<now()');
    await pool.query("UPDATE learning_submissions SET state='system-error',code=NULL WHERE state IN ('queued','running') AND created_at<now()-interval '1 day'");
    await pool.query('DELETE FROM learning_sessions WHERE expires_at<now()');
    await pool.query('DELETE FROM learning_attempts WHERE expires_at<now()');
    await pool.query("DELETE FROM learning_events WHERE created_at<now()-interval '30 days'");
    await pool.query('DELETE FROM learning_admin_sessions WHERE expires_at<now()');
    await pool.query('DELETE FROM learning_limits WHERE expires_at<now()');
    await pool.query("DELETE FROM learning_audit WHERE created_at<now()-interval '180 days'");
    console.log('Expired learning data pruned.');
  } else throw new Error('Use migrate, admin or prune.');
} finally {await pool.end();}
