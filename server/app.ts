import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
import { questionSchema, type Question } from './bank.ts';
import { grade, nextQuestion, publicQuestion, roadmap, roleSkills, shuffle, profileSchema, type Answer, type CareerRole } from './assessment.ts';
import { hash, permitted, token, verifyPassword } from './security.ts';
import { challenges, publicChallenge } from './challenges.ts';
import { leaderboard,registrationSchema,registerLearner,loginLearner } from './community.ts';
import { recordPoints } from './ranking.ts';
import { classifyAttribution,conversionReport,csvCell } from './insights.ts';

class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status=status; } }
const json = (data: unknown, status=200, headers: Record<string,string>={}) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',...headers}});
const id = z.string().uuid();
const eventSchema = z.object({name:z.enum(['page_view','course_viewed','package_compared','coding_challenge_started']),path:z.string().regex(/^\/[a-z0-9/-]*$/).max(200),attribution:z.object({source:z.string().max(80).optional(),medium:z.string().max(80).optional(),campaign:z.string().max(80).optional(),referrer:z.string().max(2048).optional()}).strict().optional()}).strict();
const roles = Object.keys(roleSkills) as [CareerRole,...CareerRole[]];
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415,'Expected JSON.');
  const reader=request.body?.getReader(); let size=0; const chunks: Uint8Array[]=[];
  if(reader) for (;;) {const part=await reader.read(); if(part.done) break; size+=part.value.length; if(size>32768){await reader.cancel();throw new ApiError(413,'Request is too large.');} chunks.push(part.value);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new ApiError(400,'Invalid JSON.');}
}
function cookie(request: Request, name: string) {return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1) ?? '';}
function viewAttempt(row: Record<string,unknown>) {
  const answers=row.answers as Answer[];
  return {id:row.id,answered:answers.length,total:10,track:row.track,result:row.result,
    question: row.result ? null : publicQuestion(row.current_question as Question,row.option_order as number[])};
}
export function createApp(db: Pool, origin: string, secure = true) {
  if (!origin || new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an exact origin.');
  const sessionCookie=secure?'__Host-learning':'learning';
  const adminCookie=secure?'__Host-learning-admin':'learning-admin';
  const setCookie=(name:string,value:string,age:number)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
  async function rate(key:string, limit:number, seconds:number) {
    const bucket=Math.floor(Date.now()/1000/seconds);
    const result=await db.query('INSERT INTO learning_limits(key,count,expires_at) VALUES($1,1,now()+($2 * interval \'1 second\')) ON CONFLICT(key) DO UPDATE SET count=learning_limits.count+1 RETURNING count',[`${hash(key)}:${bucket}`,seconds]);
    if(result.rows[0].count>limit) throw new ApiError(429,'Too many requests. Please wait before retrying.');
  }
  async function session(request:Request) {
    const raw=cookie(request,sessionCookie);
    if(!/^[a-f0-9]{64}$/.test(raw)) throw new ApiError(401,'Start or resume a session first.');
    const result=await db.query('SELECT s.* FROM learning_sessions s WHERE token_hash=$1 AND expires_at>now() AND (user_id IS NULL OR EXISTS(SELECT 1 FROM learning_users u WHERE u.id=s.user_id AND NOT u.disabled))',[hash(raw)]);
    if(!result.rows[0]) throw new ApiError(401,'Session expired. Start a new assessment.');
    if(request.method!=='GET' && request.headers.get('x-csrf-token')!==result.rows[0].csrf) throw new ApiError(403,'Refresh this page before trying again.');
    return result.rows[0];
  }
  async function admin(request:Request, permission:string) {
    const raw=cookie(request,adminCookie);
    const result=await db.query('SELECT a.id,a.role,s.csrf FROM learning_admin_sessions s JOIN learning_admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT a.disabled',[hash(raw)]);
    const actor=result.rows[0];
    if(!actor) throw new ApiError(401,'Administrator sign-in required.');
    if(permission && !permitted(actor.role,permission)) throw new ApiError(403,'Your role cannot perform this action.');
    if(request.method!=='GET' && request.headers.get('x-csrf-token')!==actor.csrf) throw new ApiError(403,'Invalid session verification.');
    return actor;
  }
  async function event(client: Pool|PoolClient, sessionId:string, name:string) {
    await client.query('INSERT INTO learning_events(session_id,name) SELECT id,$2 FROM learning_sessions WHERE id=$1 AND analytics=true',[sessionId,name]);
  }
  async function judgingAvailable(){return process.env.LEARNING_JUDGING_ENABLED==='true' && Boolean((await db.query("SELECT id FROM learning_worker_health WHERE checked_at>now()-interval '2 minutes'")).rowCount);}
  function submissionView(row:Record<string,unknown>){
    const challenge=row.challenge as typeof challenges[number];
    const result=row.result as {correctness:number;edgeCases:number;outcomes:{passed:boolean;kind:string;status:string}[];graderVersion:string}|null;
    const answered=typeof row.understanding_answer==='number';
    const understanding=answered && row.understanding_answer===challenge.understanding.answer ? 20 : 0;
    return {id:row.id,state:row.state,purpose:row.purpose,correction:row.correction||null,result:result?{...result,understanding:answered?understanding:null,total:answered?result.correctness+result.edgeCases+understanding:null,
      rubric:{sampleCorrectness:60,edgeCases:20,understanding:20},quality:'Not scored. Different valid implementations are accepted.'}:null,
      followup:row.state==='graded'&&row.purpose!=='sample'?{prompt:challenge.understanding.prompt,options:(row.understanding_order as number[]).map(i=>challenge.understanding.options[i]),answered,...(answered?{explanation:challenge.understanding.explanation}:{})}:null};
  }
  return async function handle(request:Request, peer='unknown'):Promise<Response> {
    const requestId=randomUUID();
    try {
      const path=new URL(request.url).pathname.replace(/\/$/,'');
      if(!path.startsWith('/api/learning')) return json({message:'Endpoint not found.'},404);
      if(request.method!=='GET' && request.headers.get('origin')!==origin) throw new ApiError(403,'Request origin is not allowed.');
      await rate(`ip:${peer}`,180,60);
      if(path==='/api/learning/leaderboard' && request.method==='GET')return json(await leaderboard(db,new URL(request.url)));
      if(path==='/api/learning/health' && request.method==='GET'){await db.query('SELECT 1');return json({status:'ok',execution:await judgingAvailable()?'available':'unavailable'});}
      if(path==='/api/learning/session/current' && request.method==='GET'){
        try{const s=await session(request);return json({csrf:s.csrf,analytics:s.analytics});}
        catch(error){if(error instanceof ApiError&&error.status===401)return json({csrf:'',analytics:false});throw error;}
      }
      if(path==='/api/learning/session' && request.method==='GET') {
        try {const s=await session(request);return json({csrf:s.csrf,analytics:s.analytics});}
        catch(error) {if(!(error instanceof ApiError) || error.status!==401) throw error;}
        await rate(`session:${peer}`,30,3600);
        const raw=token(), csrf=token();
        await db.query('INSERT INTO learning_sessions(id,token_hash,csrf) VALUES($1,$2,$3)',[randomUUID(),hash(raw),csrf]);
        return json({csrf,analytics:false},200,{'Set-Cookie':setCookie(sessionCookie,raw,604800)});
      }
      if(path==='/api/learning/admin/login' && request.method==='POST') {
        await rate(`login:${peer}`,5,900);
        const input=z.object({email:z.email().max(254),password:z.string().min(12).max(200)}).strict().parse(await body(request));
        const found=await db.query('SELECT * FROM learning_admins WHERE email=$1 AND NOT disabled',[input.email.toLowerCase()]);
        // Use a real-cost dummy hash for unknown accounts to reduce timing differences.
        const actor=found.rows[0];
        const valid=verifyPassword(input.password,actor?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`);
        if(!actor || !valid) throw new ApiError(401,'Sign-in details were not accepted.');
        const raw=token(),csrf=token();
        await db.query('INSERT INTO learning_admin_sessions(token_hash,admin_id,csrf) VALUES($1,$2,$3)',[hash(raw),actor.id,csrf]);
        await db.query('INSERT INTO learning_audit(admin_id,action,target) VALUES($1,\'login\',$2)',[actor.id,actor.id]);
        return json({role:actor.role,csrf},200,{'Set-Cookie':setCookie(adminCookie,raw,3600)});
      }
      if(path==='/api/learning/shared-report' && request.method==='POST'){
        const input=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(await body(request));
        const row=(await db.query('SELECT s.report FROM learning_report_shares s JOIN learning_roadmaps r ON r.id=s.roadmap_id JOIN learning_sessions owner ON owner.id=r.session_id JOIN learning_attempts a ON a.id=r.attempt_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND owner.expires_at>now() AND a.expires_at>now()',[hash(input.token)])).rows[0];
        if(!row)throw new ApiError(404,'This shared report is expired or has been revoked.');
        return json({report:row.report});
      }
      if(path==='/api/learning/admin/session' && request.method==='GET') return json(await admin(request,''));
      if(path==='/api/learning/admin/logout' && request.method==='POST') {await admin(request,'');await db.query('DELETE FROM learning_admin_sessions WHERE token_hash=$1',[hash(cookie(request,adminCookie))]);return json({success:true},200,{'Set-Cookie':setCookie(adminCookie,'',0)});}
      if(path==='/api/learning/admin/metrics' && request.method==='GET') {
        await admin(request,'metrics');
        const [events,attempts,skills]=await Promise.all([
          db.query('SELECT name,count(*)::int AS events,count(DISTINCT session_id)::int AS visitors FROM learning_events WHERE created_at>now()-interval \'30 days\' GROUP BY name'),
          db.query('SELECT count(*)::int AS started,count(completed_at)::int AS completed FROM learning_attempts WHERE created_at>now()-interval \'30 days\''),
          db.query("SELECT answer->'question'->>'skill' AS skill,count(*)::int AS answered,count(*) FILTER (WHERE (answer->>'correct')::boolean)::int AS correct FROM learning_attempts, jsonb_array_elements(answers) answer WHERE completed_at>now()-interval '30 days' GROUP BY skill")]);
        return json({events:events.rows,attempts:attempts.rows[0],skills:skills.rows,notice:'Events include consenting sessions only. Attempts are operational counts, not unique people. Payment and enrollment services are not connected.'});
      }
      if(path==='/api/learning/admin/insights' && request.method==='GET'){await admin(request,'metrics');return json(await conversionReport(db));}
      if(path==='/api/learning/admin/experiments' && request.method==='GET'){
        await admin(request,'metrics');const experiments=(await db.query('SELECT * FROM learning_experiments ORDER BY id')).rows;
        const outcomes=(await db.query(`SELECT a.experiment_id,a.variant,count(DISTINCT a.session_id)::int AS assigned,
          count(DISTINCT a.session_id) FILTER(WHERE e.name='assessment_completed')::int AS completed
          FROM learning_assignments a LEFT JOIN learning_events e ON e.session_id=a.session_id AND e.created_at>=a.created_at
          GROUP BY a.experiment_id,a.variant`)).rows;return json({experiments,outcomes,notice:'Descriptive counts only. No statistical significance or causal improvement is claimed.'});
      }
      if(path==='/api/learning/admin/experiments' && request.method==='POST'){
        const actor=await admin(request,'publish');const input=z.object({id:z.enum(['assessment-cta','consultation-prompt']),active:z.boolean()}).strict().parse(await body(request));
        const client=await db.connect();try{await client.query('BEGIN');await client.query('UPDATE learning_experiments SET active=$2 WHERE id=$1',[input.id,input.active]);await client.query("INSERT INTO learning_audit(admin_id,action,target,details) VALUES($1,'experiment-status',$2,$3)",[actor.id,input.id,JSON.stringify(input)]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}return json({success:true});
      }
      if(path==='/api/learning/admin/lead-detail' && request.method==='GET'){
        await admin(request,'leads');const leadId=id.parse(new URL(request.url).searchParams.get('id'));
        const lead=(await db.query('SELECT * FROM learning_leads WHERE id=$1',[leadId])).rows[0];if(!lead)throw new ApiError(404,'Lead unavailable.');
        return json({lead,followups:(await db.query('SELECT note,created_at FROM learning_followups WHERE lead_id=$1 ORDER BY created_at DESC',[leadId])).rows,
          assessment:(await db.query('SELECT result FROM learning_attempts WHERE session_id=$1 AND result IS NOT NULL AND expires_at>now() ORDER BY completed_at DESC LIMIT 1',[lead.session_id])).rows[0]?.result||null,
          counselors:(await db.query("SELECT id,email FROM learning_admins WHERE role IN ('owner','administrator','counselor') AND NOT disabled")).rows});
      }
      if(path==='/api/learning/admin/leads/update' && request.method==='POST'){
        const actor=await admin(request,'leads');const input=z.object({id,status:z.enum(['new','contacted','qualified','closed']),assignedTo:id.nullable(),note:z.string().trim().min(5).max(2000)}).strict().parse(await body(request));
        const client=await db.connect();try{await client.query('BEGIN');
          if(input.assignedTo && !(await client.query("SELECT id FROM learning_admins WHERE id=$1 AND role IN ('owner','administrator','counselor') AND NOT disabled",[input.assignedTo])).rowCount)throw new ApiError(400,'Choose an active counselor.');
          const updated=await client.query('UPDATE learning_leads SET status=$2,assigned_to=$3 WHERE id=$1 RETURNING id',[input.id,input.status,input.assignedTo]);if(!updated.rowCount)throw new ApiError(404,'Lead unavailable.');
          await client.query('INSERT INTO learning_followups(lead_id,admin_id,note) VALUES($1,$2,$3)',[input.id,actor.id,input.note]);
          await client.query("INSERT INTO learning_audit(admin_id,action,target,details) VALUES($1,'lead-update',$2,$3)",[actor.id,input.id,JSON.stringify({status:input.status,assignedTo:input.assignedTo})]);
          await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}return json({success:true});
      }
      if(path==='/api/learning/admin/leads/export' && request.method==='POST'){
        const actor=await admin(request,'leads');const rows=(await db.query('SELECT name,email,interest,status,created_at FROM learning_leads ORDER BY created_at DESC LIMIT 5000')).rows;
        await db.query("INSERT INTO learning_audit(admin_id,action,target,details) VALUES($1,'lead-export','consented-leads',$2)",[actor.id,JSON.stringify({count:rows.length})]);
        return json({csv:['name,email,interest,status,created_at',...rows.map(r=>[r.name,r.email,r.interest,r.status,r.created_at].map(csvCell).join(','))].join('\r\n')});
      }
      if(path==='/api/learning/admin/questions' && request.method==='GET'){await admin(request,'questions');return json({questions:(await db.query('SELECT * FROM learning_questions ORDER BY id,version DESC')).rows});}
      if(path==='/api/learning/admin/questions' && request.method==='POST') {
        const actor=await admin(request,'questions');const input=questionSchema.parse(await body(request));
        const client=await db.connect();try{await client.query('BEGIN');
          await client.query("INSERT INTO learning_questions(id,version,content,status) VALUES($1,$2,$3,'draft')",[input.id,input.version,JSON.stringify(input)]);
          await client.query('INSERT INTO learning_audit(admin_id,action,target,details) VALUES($1,\'question-draft\',$2,$3)',[actor.id,`${input.id}:${input.version}`,JSON.stringify(input)]);
          await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        return json({success:true},201);
      }
      if(path==='/api/learning/admin/questions/status' && request.method==='POST') {
        const actor=await admin(request,'publish');const input=z.object({id:z.string().max(80),version:z.number().int().positive(),status:z.enum(['published','retired']),reason:z.string().min(15).max(1000)}).strict().parse(await body(request));
        const client=await db.connect();try {await client.query('BEGIN');
          const q=await client.query('SELECT content FROM learning_questions WHERE id=$1 AND version=$2 FOR UPDATE',[input.id,input.version]);
          if(!q.rowCount) throw new ApiError(404,'Question not found.');questionSchema.parse(q.rows[0].content);
          if(input.status==='published') await client.query("UPDATE learning_questions SET status='retired' WHERE id=$1 AND status='published'",[input.id]);
          await client.query('UPDATE learning_questions SET status=$3,reviewed_at=now() WHERE id=$1 AND version=$2',[input.id,input.version,input.status]);
          await client.query('INSERT INTO learning_audit(admin_id,action,target,details) VALUES($1,\'question-status\',$2,$3)',[actor.id,`${input.id}:${input.version}`,JSON.stringify(input)]);
          await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        return json({success:true});
      }
      if(path==='/api/learning/admin/leads' && request.method==='GET'){await admin(request,'leads');return json({leads:(await db.query('SELECT id,name,email,interest,created_at FROM learning_leads ORDER BY created_at DESC LIMIT 500')).rows});}
      if(path==='/api/learning/admin/invites' && request.method==='POST'){
        const actor=await admin(request,'publish');const raw=token();
        const client=await db.connect();try{await client.query('BEGIN');await client.query('INSERT INTO learning_invites(token_hash,created_by) VALUES($1,$2)',[hash(raw),actor.id]);await client.query("INSERT INTO learning_audit(admin_id,action,target) VALUES($1,'learner-invited','one-time-invite')",[actor.id]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        return json({invite:raw,notice:'Give this single-use invitation to one verified learner. It expires in seven days. Do not create duplicate accounts for the same person.'});
      }
      if(path==='/api/learning/admin/submissions' && request.method==='GET'){
        await admin(request,'questions');
        return json({submissions:(await db.query("SELECT s.id,s.state,s.purpose,s.created_at,s.challenge->>'title' AS title,s.result,s.retries,(SELECT jsonb_agg(jsonb_build_object('reason',r.reason,'created_at',r.created_at) ORDER BY r.created_at DESC) FROM learning_rejudges r WHERE r.submission_id=s.id) AS rejudges,(SELECT jsonb_build_object('score',c.score,'reason',c.reason) FROM learning_score_corrections c WHERE c.submission_id=s.id ORDER BY c.id DESC LIMIT 1) AS correction FROM learning_submissions s ORDER BY s.created_at DESC LIMIT 100")).rows});
      }
      if(path==='/api/learning/admin/corrections' && request.method==='POST'){
        const actor=await admin(request,'publish');const input=z.object({submissionId:id,score:z.number().int().min(0).max(100),reason:z.string().trim().min(20).max(1000)}).strict().parse(await body(request));
        const client=await db.connect();try{await client.query('BEGIN');
          const row=(await client.query("SELECT id FROM learning_submissions WHERE id=$1 AND state='graded' AND purpose='submit' FOR UPDATE",[input.submissionId])).rows[0];
          if(!row)throw new ApiError(409,'Only a graded submission can receive a reviewed correction.');
          await client.query('INSERT INTO learning_score_corrections(submission_id,admin_id,score,reason) VALUES($1,$2,$3,$4)',[input.submissionId,actor.id,input.score,input.reason]);
          await client.query('INSERT INTO learning_audit(admin_id,action,target,details) VALUES($1,\'score-correction\',$2,$3)',[actor.id,input.submissionId,JSON.stringify({score:input.score,reason:input.reason})]);
          await recordPoints(client,input.submissionId,input.score);
          await client.query('COMMIT');return json({success:true});
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      }
      if(path==='/api/learning/challenges' && request.method==='GET') {const available=await judgingAvailable();return json({challenges:challenges.map(publicChallenge),available,message:available?'Isolated judging is available. Scores use sample correctness (60), hidden edge cases (20), and a related understanding check (20).':'Live judging is not enabled. A separately secured execution service and worker are required. You can prepare a solution and practice the related concepts.'});}
      const s=await session(request);
      if(path==='/api/learning/experiments' && request.method==='POST'){
        if(!s.analytics)return json({assignments:[]});const client=await db.connect();
        try{await client.query('BEGIN');const consent=(await client.query('SELECT analytics FROM learning_sessions WHERE id=$1 FOR SHARE',[s.id])).rows[0];if(!consent?.analytics){await client.query('COMMIT');return json({assignments:[]});}
          const experiments=(await client.query('SELECT * FROM learning_experiments WHERE active=true')).rows;
          for(const experiment of experiments){const variants=experiment.variants as string[];const index=parseInt(hash(`${s.id}:${experiment.id}:${experiment.version}`).slice(0,8),16)%variants.length;
            await client.query('INSERT INTO learning_assignments(session_id,experiment_id,version,variant) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[s.id,experiment.id,experiment.version,variants[index]]);}
          const assigned=(await client.query('SELECT a.experiment_id,a.variant FROM learning_assignments a JOIN learning_experiments e ON e.id=a.experiment_id AND e.version=a.version WHERE a.session_id=$1 AND e.active',[s.id])).rows;
          await client.query('COMMIT');return json({assignments:assigned});
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      }
      if(path==='/api/learning/account' && request.method==='GET'){
        const account=s.user_id?(await db.query('SELECT handle,public_name,public_participation FROM learning_users WHERE id=$1 AND NOT disabled',[s.user_id])).rows[0]:null;
        return json({account:account||null,history:account?(await db.query('SELECT challenge_id,points,reason,created_at FROM learning_point_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[s.user_id])).rows:[]});
      }
      if(path==='/api/learning/account/register' && request.method==='POST'){
        await rate(`register:${peer}`,5,3600);const input=registrationSchema.parse(await body(request));
        if(s.user_id)throw new ApiError(409,'Sign out before registering another account.');
        if(!await registerLearner(db,input,s.id))throw new ApiError(400,'The invitation is invalid, expired or already used.');
          const raw=token();await db.query('UPDATE learning_sessions SET token_hash=$2 WHERE id=$1',[s.id,hash(raw)]);
          return json({success:true},200,{'Set-Cookie':setCookie(sessionCookie,raw,604800)});
      }
      if(path==='/api/learning/account/login' && request.method==='POST'){
        await rate(`learner-login:${peer}`,5,900);const input=z.object({handle:z.string().max(40),password:z.string().min(16).max(200)}).strict().parse(await body(request));
        if(s.user_id)throw new ApiError(409,'Sign out before switching accounts.');
          if(!await loginLearner(db,input.handle,input.password,s.id))throw new ApiError(401,'Sign-in details were not accepted.');
          const raw=token();await db.query('UPDATE learning_sessions SET token_hash=$2 WHERE id=$1',[s.id,hash(raw)]);
          return json({success:true},200,{'Set-Cookie':setCookie(sessionCookie,raw,604800)});
      }
      if(path==='/api/learning/account/preferences' && request.method==='POST'){
        if(!s.user_id)throw new ApiError(401,'Learner sign-in required.');const input=z.object({publicParticipation:z.boolean(),publicName:z.string().trim().regex(/^[\p{L}\p{N} _-]{2,40}$/u)}).strict().parse(await body(request));
        await db.query('UPDATE learning_users SET public_participation=$2,public_name=$3 WHERE id=$1',[s.user_id,input.publicParticipation,input.publicName]);return json({success:true});
      }
      if(path==='/api/learning/account/logout' && request.method==='POST'){
        await db.query('DELETE FROM learning_sessions WHERE id=$1',[s.id]);return json({success:true},200,{'Set-Cookie':setCookie(sessionCookie,'',0)});
      }
      if(path==='/api/learning/account' && request.method==='DELETE'){
        const input=z.object({password:z.string().min(16).max(200)}).strict().parse(await body(request));
        const user=(await db.query('SELECT * FROM learning_users WHERE id=$1',[s.user_id])).rows[0];
        if(!user||!verifyPassword(input.password,user.password_hash))throw new ApiError(403,'Confirm your password to delete the account.');
        const client=await db.connect();try{await client.query('BEGIN');await client.query('DELETE FROM learning_sessions WHERE user_id=$1',[s.user_id]);await client.query('DELETE FROM learning_users WHERE id=$1',[s.user_id]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        return json({deleted:true},200,{'Set-Cookie':setCookie(sessionCookie,'',0)});
      }
      if(path==='/api/learning/report-shares' && request.method==='POST'){
        const input=z.object({roadmapId:id,consent:z.literal(true)}).strict().parse(await body(request));
        const row=(await db.query('SELECT r.id,r.report FROM learning_roadmaps r JOIN learning_attempts a ON a.id=r.attempt_id WHERE r.id=$1 AND r.session_id=$2 AND a.expires_at>now()',[input.roadmapId,s.id])).rows[0];
        if(!row)throw new ApiError(404,'Roadmap not found or expired.');
        await rate(`share:${s.id}`,10,3600);const raw=token(),shareId=randomUUID();
        await db.query('INSERT INTO learning_report_shares(id,roadmap_id,token_hash,report) VALUES($1,$2,$3,$4)',[shareId,input.roadmapId,hash(raw),JSON.stringify(row.report)]);
        return json({id:shareId,url:`${origin}/shared-roadmap#${raw}`,notice:'Anyone with this link can read the roadmap until revoked or expired. It expires no later than the assessment, within 24 hours.'},201);
      }
      if(path==='/api/learning/report-shares' && request.method==='GET')return json({shares:(await db.query('SELECT s.id,s.created_at,s.expires_at,s.revoked_at FROM learning_report_shares s JOIN learning_roadmaps r ON r.id=s.roadmap_id WHERE r.session_id=$1 ORDER BY s.created_at DESC',[s.id])).rows});
      if(path==='/api/learning/report-shares/revoke' && request.method==='POST'){
        const input=z.object({id}).strict().parse(await body(request));
        await db.query('UPDATE learning_report_shares s SET revoked_at=now() FROM learning_roadmaps r WHERE s.id=$1 AND s.roadmap_id=r.id AND r.session_id=$2',[input.id,s.id]);return json({revoked:true});
      }
      if(path==='/api/learning/submissions' && request.method==='POST') {
        const input=z.object({requestId:id,challengeId:z.string().max(80),version:z.number().int().positive(),code:z.string().min(1).max(16000),mode:z.enum(['practice','independent']),assisted:z.boolean(),purpose:z.enum(['sample','submit']).default('submit')}).strict().parse(await body(request));
        const fingerprint=hash(JSON.stringify(input));
        const prior=(await db.query('SELECT * FROM learning_submissions WHERE session_id=$1 AND request_id=$2',[s.id,input.requestId])).rows[0];
        if(prior){if(prior.fingerprint!==fingerprint)throw new ApiError(409,'The retry must contain the original submission.');return json(submissionView(prior));}
        if(!await judgingAvailable())throw new ApiError(503,'Live judging is not configured. Your code has not been executed or graded.');
        await rate(`submission:${s.id}`,10,3600);
        const challenge=challenges.find(c=>c.id===input.challengeId && c.version===input.version);
        if(!challenge)throw new ApiError(404,'Challenge version unavailable.');
        const client=await db.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(81244303)');
          const retry=(await client.query('SELECT * FROM learning_submissions WHERE session_id=$1 AND request_id=$2',[s.id,input.requestId])).rows[0];
          if(retry){if(retry.fingerprint!==fingerprint)throw new ApiError(409,'The retry must contain the original submission.');await client.query('COMMIT');return json(submissionView(retry));}
          const queue=(await client.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE session_id=$1)::int AS own FROM learning_submissions WHERE state IN ('queued','running')",[s.id])).rows[0];
          if(queue.total>=100 || queue.own>=2)throw new ApiError(429,'The judging queue is busy. Try again shortly.');
          const row=(await client.query('INSERT INTO learning_submissions(id,session_id,request_id,fingerprint,challenge,code,mode,assisted,understanding_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[randomUUID(),s.id,input.requestId,fingerprint,JSON.stringify(challenge),input.code,input.mode,input.assisted,JSON.stringify(shuffle([0,1,2,3]))])).rows[0];
          await client.query('UPDATE learning_submissions SET purpose=$2,code_hash=$3 WHERE id=$1',[row.id,input.purpose,hash(input.code)]);row.purpose=input.purpose;
          await event(client,s.id,'code_submitted');await client.query('COMMIT');return json(submissionView(row),202);
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      }
      const submissionMatch=path.match(/^\/api\/learning\/submissions\/([a-f0-9-]+)(\/understanding|\/cancel|\/rejudge)?$/);
      if(submissionMatch){
        const submissionId=id.parse(submissionMatch[1]);
        const row=(await db.query('SELECT * FROM learning_submissions WHERE id=$1 AND session_id=$2',[submissionId,s.id])).rows[0];
        if(!row)throw new ApiError(404,'Submission not found.');
        if(request.method==='GET'){const correction=(await db.query('SELECT score,reason,created_at FROM learning_score_corrections WHERE submission_id=$1 ORDER BY id DESC LIMIT 1',[submissionId])).rows[0];return json(submissionView({...row,correction}));}
        if(request.method==='POST' && submissionMatch[2]==='/understanding'){
          const input=z.object({option:z.number().int().min(0).max(3)}).strict().parse(await body(request));
          if(row.state!=='graded'||row.purpose==='sample')throw new ApiError(409,'Complete a graded submission first.');
          const client=await db.connect();try{await client.query('BEGIN');
            const updated=await client.query("UPDATE learning_submissions SET understanding_answer=$3 WHERE id=$1 AND session_id=$2 AND understanding_answer IS NULL AND state='graded' RETURNING *",[submissionId,s.id,row.understanding_order[input.option]]);
            const correction=(await client.query('SELECT score,reason FROM learning_score_corrections WHERE submission_id=$1 ORDER BY id DESC LIMIT 1',[submissionId])).rows[0];
            await recordPoints(client,submissionId,correction?.score);
            const current=updated.rows[0]||(await client.query('SELECT * FROM learning_submissions WHERE id=$1',[submissionId])).rows[0];
            await client.query('COMMIT');return json(submissionView({...current,correction}));
          }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        }
        if(request.method==='POST' && submissionMatch[2]==='/rejudge'){
          const input=z.object({code:z.string().min(1).max(16000),reason:z.string().trim().min(15).max(1000)}).strict().parse(await body(request));
          if(!await judgingAvailable())throw new ApiError(503,'Judging service is unavailable.');
          if(row.code_hash!==hash(input.code))throw new ApiError(409,'Rejudging requires the exact original code. Changed code is a new submission.');
          await rate(`rejudge:${s.id}`,3,3600);
          const client=await db.connect();try{await client.query('BEGIN');
            await client.query('SELECT pg_advisory_xact_lock(81244303)');
            const queue=(await client.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE session_id=$1)::int AS own FROM learning_submissions WHERE state IN ('queued','running')",[s.id])).rows[0];
            if(queue.total>=100 || queue.own>=2)throw new ApiError(429,'The judging queue is busy. Try again shortly.');
            const locked=(await client.query("SELECT * FROM learning_submissions WHERE id=$1 AND state IN ('graded','system-error') FOR UPDATE",[submissionId])).rows[0];
            if(!locked)throw new ApiError(409,'This submission is already queued or cannot be rejudged.');
            await client.query('INSERT INTO learning_rejudges(submission_id,requested_by,previous_result,reason) VALUES($1,$2,$3,$4)',[submissionId,s.id,locked.result,input.reason]);
            await client.query("UPDATE learning_submissions SET state='queued',code=$2,result=NULL,retries=0,updated_at=now() WHERE id=$1",[submissionId,input.code]);
            await client.query('COMMIT');return json({queued:true});
          }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        }
        if(request.method==='POST' && submissionMatch[2]==='/cancel'){
          await db.query("UPDATE learning_submissions SET state='cancelled',code=NULL WHERE id=$1 AND session_id=$2 AND state IN ('queued','running')",[submissionId,s.id]);
          return json({cancelled:true,notice:'No result will be recorded. An already running isolated test may finish within its resource limit.'});
        }
      }
      if(path==='/api/learning/preferences' && request.method==='POST') {
        const input=z.object({analytics:z.boolean()}).strict().parse(await body(request));
        const client=await db.connect();try{await client.query('BEGIN');
          await client.query('UPDATE learning_sessions SET analytics=$2 WHERE id=$1',[s.id,input.analytics]);
          await client.query('INSERT INTO learning_consents(session_id,analytics) VALUES($1,$2)',[s.id,input.analytics]);
          if(!input.analytics){await client.query('DELETE FROM learning_events WHERE session_id=$1',[s.id]);await client.query('DELETE FROM learning_assignments WHERE session_id=$1',[s.id]);}
          await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        return json(input);
      }
      if(path==='/api/learning/data' && request.method==='DELETE') {await db.query('DELETE FROM learning_sessions WHERE id=$1',[s.id]);return json({deleted:true},200,{'Set-Cookie':setCookie(sessionCookie,'',0)});}
      if(path==='/api/learning/events' && request.method==='POST'){const input=eventSchema.parse(await body(request));const saved=await db.query('INSERT INTO learning_events(session_id,name,path,attribution) SELECT id,$2,$3,$4 FROM learning_sessions WHERE id=$1 AND analytics=true FOR SHARE',[s.id,input.name,input.path,JSON.stringify(classifyAttribution(input.attribution||{},origin))]);return json({recorded:Boolean(saved.rowCount)});}
      if(path==='/api/learning/leads' && request.method==='POST') {
        if(process.env.LEGAL_APPROVED!=='true')throw new ApiError(503,'Contact requests are awaiting academy privacy approval. Your contact details have not been saved.');
        await rate(`lead:${s.id}`,5,3600);
        const input=z.object({name:z.string().trim().min(2).max(100),email:z.email().max(254),interest:z.string().min(2).max(150),consent:z.literal(true)}).strict().parse(await body(request));
        await db.query("INSERT INTO learning_leads(id,session_id,name,email,interest,consent_text) VALUES($1,$2,$3,$4,$5,'I request contact about my learning interests. Consent v1.') ON CONFLICT DO NOTHING",[randomUUID(),s.id,input.name,input.email,input.interest]);
        await event(db,s.id,'counselling_requested');
        return json({success:true});
      }
      if(path==='/api/learning/attempts' && request.method==='GET'){return json({attempts:(await db.query('SELECT * FROM learning_attempts WHERE session_id=$1 AND expires_at>now() ORDER BY created_at DESC LIMIT 10',[s.id])).rows.map(viewAttempt)});}
      if(path==='/api/learning/attempts' && request.method==='POST') {
        await rate(`start:${s.id}`,10,3600);
        const input=z.object({track:z.number().int().min(1).max(3)}).strict().parse(await body(request));
        const bank=(await db.query("SELECT DISTINCT ON(id) content FROM learning_questions WHERE status='published' ORDER BY id,version DESC")).rows.map(row=>questionSchema.parse(row.content));
        if(bank.length<10) throw new ApiError(503,'The reviewed question bank is not available yet.');
        const q=nextQuestion(bank,[],input.track)!, order=shuffle([0,1,2,3]);
        const attempt=(await db.query('INSERT INTO learning_attempts(id,session_id,track,bank,current_question,option_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),s.id,input.track,JSON.stringify(bank),JSON.stringify(q),JSON.stringify(order)])).rows[0];
        await event(db,s.id,'assessment_started');return json(viewAttempt(attempt),201);
      }
      const match=path.match(/^\/api\/learning\/attempts\/([a-f0-9-]+)(\/answer|\/roadmap)?$/);
      if(match) {
        const attemptId=id.parse(match[1]);
        if(request.method==='GET') {
          const row=(await db.query('SELECT * FROM learning_attempts WHERE id=$1 AND session_id=$2 AND expires_at>now()',[attemptId,s.id])).rows[0];
          if(!row) throw new ApiError(404,'Assessment is unavailable or expired.');
          return json(viewAttempt(row));
        }
        if(match[2]==='/roadmap' && request.method==='POST') {
          const input=z.object({role:z.enum(roles),profile:profileSchema.optional()}).strict().parse(await body(request));
          const row=(await db.query('SELECT result FROM learning_attempts WHERE id=$1 AND session_id=$2 AND expires_at>now()',[attemptId,s.id])).rows[0];
          if(!row?.result) throw new ApiError(404,'Complete your assessment first.');
          const report=roadmap(row.result,input.role,input.profile);
          const saved=(await db.query('INSERT INTO learning_roadmaps(id,session_id,attempt_id,profile,report) VALUES($1,$2,$3,$4,$5) ON CONFLICT(session_id,attempt_id) DO UPDATE SET profile=$4,report=$5 RETURNING id',[randomUUID(),s.id,attemptId,JSON.stringify({...input.profile,jobDescription:undefined}),JSON.stringify(report)])).rows[0];
          await event(db,s.id,'roadmap_viewed');return json({...report,id:saved.id});
        }
        if(match[2]==='/answer' && request.method==='POST') {
          const input=z.object({questionId:z.string().max(80),version:z.number().int().positive(),option:z.number().int().min(0).max(3)}).strict().parse(await body(request));
          const client=await db.connect();
          try {
            await client.query('BEGIN');
            const row=(await client.query('SELECT * FROM learning_attempts WHERE id=$1 AND session_id=$2 AND expires_at>now() FOR UPDATE',[attemptId,s.id])).rows[0];
            if(!row) throw new ApiError(404,'Assessment is unavailable or expired.');
            const answers=row.answers as Answer[];
            // A retry of an already committed answer returns the current state without scoring twice.
            if(answers.some(a=>a.question.id===input.questionId && a.question.version===input.version)){await client.query('COMMIT');return json(viewAttempt(row));}
            const q=row.current_question as Question;
            if(row.result || q.id!==input.questionId || q.version!==input.version) throw new ApiError(409,'The question changed. Resume your assessment.');
            const selected=row.option_order[input.option];answers.push({question:q,selected,correct:selected===q.answer});
            const result=answers.length===10 ? grade(answers) : null;
            const next=result?null:nextQuestion(row.bank,answers,row.track);
            if(!result && !next) throw new ApiError(503,'No reviewed questions remain.');
            const updated=(await client.query('UPDATE learning_attempts SET answers=$2,result=$3,current_question=$4,option_order=$5,completed_at=CASE WHEN $3::jsonb IS NOT NULL THEN now() ELSE NULL END WHERE id=$1 RETURNING *',[attemptId,JSON.stringify(answers),result?JSON.stringify(result):null,next?JSON.stringify(next):null,JSON.stringify(shuffle([0,1,2,3]))])).rows[0];
            if(result) await event(client,s.id,'assessment_completed');
            await client.query('COMMIT');return json(viewAttempt(updated));
          } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
        }
      }
      return json({message:'Endpoint not found.'},404);
    } catch(error) {
      if(error instanceof ApiError) return json({message:error.message,requestId},error.status);
      if(error instanceof z.ZodError) return json({message:'Check the supplied fields.',requestId},400);
      if((error as {code?:string}).code==='23505') return json({message:'That version already exists. Create a new version.',requestId},409);
      console.error(JSON.stringify({level:'error',requestId,type:'learning-request-failed'}));
      return json({message:'The learning service is temporarily unavailable. Your result has not been assumed.',requestId},503);
    }
  };
}
