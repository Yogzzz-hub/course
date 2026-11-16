import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import { hash,passwordHash,verifyPassword } from './security.ts';
export async function leaderboard(db:Pool,url:URL){
  const input=z.object({period:z.enum(['weekly','monthly','all']).default('weekly'),difficulty:z.enum(['all','beginner','intermediate','advanced']).default('all'),skill:z.enum(['all','python']).default('all')}).parse(Object.fromEntries(url.searchParams));
  const result=await db.query(`SELECT u.public_name AS name,sum(p.points)::int AS points,count(*)::int AS challenges,
    max(p.achieved_at) AS completed_at FROM learning_points p JOIN learning_users u ON u.id=p.user_id
    WHERE u.public_participation AND NOT u.disabled AND ($1='all' OR p.difficulty=$1) AND ($2='all' OR p.skill=$2)
    AND ($3='all' OR p.achieved_at>=CASE WHEN $3='weekly' THEN date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' ELSE date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END)
    GROUP BY u.id,u.public_name ORDER BY points DESC,completed_at ASC,u.id ASC LIMIT 100`,[input.difficulty,input.skill,input.period]);
  return {entries:result.rows.map((r,i)=>({...r,rank:i+1,badges:r.challenges>=3?['Three challenges completed']:r.challenges>=1?['First challenge completed']:[]})),
    explanation:'Only opted-in, academy-invited learner accounts participate. Points = verified score × difficulty (1, 2 or 3). Independent-mode submissions must include an understanding check; this is self-reported practice, not a supervised exam. Each challenge counts once, using the best verified result. Repeats and new versions do not create extra points. UTC week/month membership uses first completion time; improvements do not move old challenges into a new period. Ties use earlier completion, then a stable internal identifier.'};
}
export const registrationSchema=z.object({invite:z.string().regex(/^[a-f0-9]{64}$/),handle:z.string().regex(/^[a-z0-9_-]{3,40}$/),password:z.string().min(16).max(200),publicName:z.string().trim().regex(/^[\p{L}\p{N} _-]{2,40}$/u)}).strict();
export async function registerLearner(db:Pool,input:z.infer<typeof registrationSchema>,sessionId:string){
  const client=await db.connect();try{await client.query('BEGIN');
    const invite=await client.query('UPDATE learning_invites SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING token_hash',[hash(input.invite)]);
    if(!invite.rowCount){await client.query('ROLLBACK');return false;}
    const userId=randomUUID();await client.query('INSERT INTO learning_users(id,handle,password_hash,public_name) VALUES($1,$2,$3,$4)',[userId,input.handle,passwordHash(input.password),input.publicName]);
    await client.query('UPDATE learning_sessions SET user_id=$2 WHERE id=$1',[sessionId,userId]);await client.query('COMMIT');return true;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function loginLearner(db:Pool,handle:string,password:string,sessionId:string){
  const user=(await db.query('SELECT * FROM learning_users WHERE handle=$1 AND NOT disabled',[handle])).rows[0];
  const valid=verifyPassword(password,user?.password_hash??`${'0'.repeat(32)}:${'0'.repeat(128)}`);
  if(!valid||!user)return false;
  await db.query('UPDATE learning_sessions SET user_id=$2 WHERE id=$1',[sessionId,user.id]);return true;
}
