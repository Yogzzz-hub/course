import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { bank } from '../server/bank';
import { createApp } from '../server/app';
import { passwordHash } from '../server/security';
import { hash } from '../server/security';
import { recordPoints } from '../server/ranking';
const enabled=Boolean(process.env.TEST_DATABASE_URL);
describe.skipIf(!enabled)('Learning API against PostgreSQL',()=>{
  const schema='learning_test_'+randomUUID().replaceAll('-','');
  let root:pg.Pool,db:pg.Pool,app:ReturnType<typeof createApp>;
  const origin='http://127.0.0.1:5173';
  type Session={cookie:string;csrf:string};
  async function call(path:string,method='GET',input?:unknown,s?:Session){return app(new Request(origin+'/api/learning'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:s?.cookie||'','X-CSRF-Token':s?.csrf||''},body:input===undefined?undefined:JSON.stringify(input)}),randomUUID());}
  async function session():Promise<Session>{const response=await call('/session');const data=await response.json();return {cookie:response.headers.get('set-cookie')!.split(';')[0],csrf:data.csrf};}
  beforeAll(async()=>{
    root=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});await root.query(`CREATE SCHEMA ${schema}`);
    db=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`});
    for(const name of ['001_learning.sql','002_judging.sql','003_score_reviews.sql','004_roadmaps.sql','005_learners.sql','006_engagement.sql','007_judge_operations.sql'])await db.query(await readFile(new URL('../server/migrations/'+name,import.meta.url),'utf8'));
    for(const q of bank)await db.query("INSERT INTO learning_questions(id,version,content,status) VALUES($1,$2,$3,'published')",[q.id,q.version,JSON.stringify(q)]);
    app=createApp(db,origin,false);
  },30000);
  afterAll(async()=>{await db?.end();if(root){await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end();}});
  it('completes a real assessment, protects keys, recovers concurrent retries, and generates a roadmap',async()=>{
    const s=await session();let response=await call('/attempts','POST',{track:1},s);expect(response.status).toBe(201);let a=await response.json();const aid=a.id;
    for(let i=0;i<10;i++){
      expect(a.question).not.toHaveProperty('answer');const key=bank.find(q=>q.id===a.question.id)!;const input={questionId:key.id,version:key.version,option:a.question.options.indexOf(key.options[key.answer])};
      if(i===0){const retries=await Promise.all([call(`/attempts/${aid}/answer`,'POST',input,s),call(`/attempts/${aid}/answer`,'POST',input,s)]);expect(retries.map(r=>r.status)).toEqual([200,200]);a=await retries[0].json();expect(a.answered).toBe(1);}
      else {response=await call(`/attempts/${aid}/answer`,'POST',input,s);expect(response.status).toBe(200);a=await response.json();}
    }
    expect(a.result.correct).toBe(10);expect(a.result.percent).toBe(100);
    const plan=await call(`/attempts/${aid}/roadmap`,'POST',{role:'Backend Developer'},s);expect(plan.status).toBe(200);expect((await plan.json()).steps.length).toBeGreaterThan(0);
    const other=await session();expect((await call(`/attempts/${aid}`,'GET',undefined,other)).status).toBe(404);
    expect((await call('/events','POST',{name:'payment_confirmed',path:'/'},s)).status).toBe(400);
    expect((await call('/data','DELETE',{},s)).status).toBe(200);expect((await call(`/attempts/${aid}`,'GET',undefined,s)).status).toBe(401);
  });
  it('rejects forged scores, missing CSRF, hostile origins and unauthenticated administration',async()=>{
    const s=await session();expect((await call('/attempts','POST',{track:1,score:100},s)).status).toBe(400);
    expect((await call('/attempts','POST',{track:1},{...s,csrf:'wrong'})).status).toBe(403);
    expect((await app(new Request(origin+'/api/learning/attempts',{method:'POST',headers:{Origin:'https://evil.test'}}))).status).toBe(403);
    expect((await call('/admin/metrics')).status).toBe(401);expect((await call('/admin/questions')).status).toBe(401);
  });
  it('records events only with consent and deletes them on opt-out',async()=>{
    const s=await session();expect((await (await call('/events','POST',{name:'page_view',path:'/'},s)).json()).recorded).toBe(false);
    await call('/preferences','POST',{analytics:true},s);expect((await (await call('/events','POST',{name:'page_view',path:'/'},s)).json()).recorded).toBe(true);
    await call('/preferences','POST',{analytics:false},s);expect((await db.query("SELECT count(*)::int AS n FROM learning_events WHERE name='page_view'")).rows[0].n).toBe(0);
  });
  it('authorizes roles server-side and audits publishing',async()=>{
    await db.query('INSERT INTO learning_admins(id,email,password_hash,role) VALUES($1,$2,$3,$4)',[randomUUID(),'instructor@example.test',passwordHash('test-password-long-enough'),'instructor']);
    const login=await call('/admin/login','POST',{email:'instructor@example.test',password:'test-password-long-enough'});expect(login.status).toBe(200);const data=await login.json();const s={cookie:login.headers.get('set-cookie')!.split(';')[0],csrf:data.csrf};
    expect((await call('/admin/metrics','GET',undefined,s)).status).toBe(200);expect((await call('/admin/leads','GET',undefined,s)).status).toBe(403);
    expect((await call('/admin/questions','POST',{...bank[0],version:2},s)).status).toBe(201);
    expect((await call('/admin/questions/status','POST',{id:bank[0].id,version:2,status:'published',reason:'Reviewed independently in test'},s)).status).toBe(403);
    await db.query("UPDATE learning_admins SET role='owner' WHERE email='instructor@example.test'");
    expect((await call('/admin/questions/status','POST',{id:bank[0].id,version:2,status:'published',reason:'Reviewed independently in test'},s)).status).toBe(200);
    expect((await db.query("SELECT * FROM learning_audit WHERE action='question-status'")).rowCount).toBe(1);
  });
  it('fails closed when judging is disabled and does not leak private tests',async()=>{
    const s=await session();const result=await (await call('/challenges')).json();expect(result.available).toBe(false);expect(result.challenges[0]).not.toHaveProperty('hidden');
    const response=await call('/submissions','POST',{requestId:randomUUID(),challengeId:'sum-values',version:1,code:'while True: pass',mode:'practice',assisted:false},s);expect(response.status).toBe(503);
    expect((await db.query('SELECT * FROM learning_submissions')).rowCount).toBe(0);
  });
  it('queues idempotently, isolates owners and records understanding once after a trusted worker result',async()=>{
    const original=process.env.LEARNING_JUDGING_ENABLED;process.env.LEARNING_JUDGING_ENABLED='true';
    try{
      await db.query('INSERT INTO learning_worker_health(id,checked_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET checked_at=now()');
      const s=await session();const input={requestId:randomUUID(),challengeId:'sum-values',version:1,code:'print(0)',mode:'practice',assisted:false};
      const responses=await Promise.all([call('/submissions','POST',input,s),call('/submissions','POST',input,s)]);
      const first=await responses[0].json(),second=await responses[1].json();expect(first.id).toBe(second.id);expect(first.state).toBe('queued');
      expect((await call('/submissions','POST',{...input,code:'print(1)'},s)).status).toBe(409);
      expect((await call(`/submissions/${first.id}`,'GET',undefined,await session())).status).toBe(404);
      expect((await call(`/submissions/${first.id}/understanding`,'POST',{option:0},s)).status).toBe(409);
      expect((await call('/submissions','POST',{...input,score:100},s)).status).toBe(400);
      await db.query("UPDATE learning_submissions SET state='graded',code=NULL,result=$2 WHERE id=$1",[first.id,JSON.stringify({correctness:60,edgeCases:20,outcomes:[],graderVersion:'test-worker'})]);
      const order=(await db.query('SELECT understanding_order FROM learning_submissions WHERE id=$1',[first.id])).rows[0].understanding_order;
      const graded=await (await call(`/submissions/${first.id}/understanding`,'POST',{option:order.indexOf(0)},s)).json();expect(graded.result.total).toBe(100);
      const retry=await (await call(`/submissions/${first.id}/understanding`,'POST',{option:order.indexOf(1)},s)).json();expect(retry.result.total).toBe(100);
    }finally{if(original===undefined)delete process.env.LEARNING_JUDGING_ENABLED;else process.env.LEARNING_JUDGING_ENABLED=original;await db.query('DELETE FROM learning_worker_health');}
  });
  it('shares only explicit report snapshots and revokes access without exposing tokens in storage',async()=>{
    const s=await session();const owner=(await db.query('SELECT id FROM learning_sessions WHERE token_hash=$1',[hash(s.cookie.split('=')[1])])).rows[0].id;
    const aid=randomUUID(),rid=randomUUID();await db.query("INSERT INTO learning_attempts(id,session_id,track,bank,answers,result,completed_at) VALUES($1,$2,1,'[]','[]','{}',now())",[aid,owner]);
    await db.query("INSERT INTO learning_roadmaps(id,session_id,attempt_id,profile,report) VALUES($1,$2,$3,'{}',$4)",[rid,owner,aid,JSON.stringify({role:'Python Developer',steps:[]})]);
    expect((await call('/report-shares','POST',{roadmapId:rid,consent:false},s)).status).toBe(400);
    expect((await call('/report-shares','POST',{roadmapId:rid,consent:true},await session())).status).toBe(404);
    const shared=await (await call('/report-shares','POST',{roadmapId:rid,consent:true},s)).json();const token=shared.url.split('#')[1];
    expect((await call('/shared-report','POST',{token})).status).toBe(200);
    await db.query("UPDATE learning_roadmaps SET report='{}' WHERE id=$1",[rid]);
    expect((await (await call('/shared-report','POST',{token})).json()).report.role).toBe('Python Developer');
    await call('/report-shares/revoke','POST',{id:shared.id},s);expect((await call('/shared-report','POST',{token})).status).toBe(404);
  });
  it('requires a single-use invitation, defaults to private rankings and never farms repeated points',async()=>{
    const s=await session(),invite='a'.repeat(64);const actor=(await db.query('SELECT id FROM learning_admins LIMIT 1')).rows[0].id;
    await db.query('INSERT INTO learning_invites(token_hash,created_by) VALUES($1,$2)',[hash(invite),actor]);
    const credentials={handle:'test_learner',password:'long-learner-test-password'};
    const registered=await call('/account/register','POST',{...credentials,invite,publicName:'Quiet Coder'},s);expect(registered.status).toBe(200);
    expect((await call('/account','GET',undefined,s)).status).toBe(401);
    s.cookie=registered.headers.get('set-cookie')!.split(';')[0];
    expect((await call('/account/register','POST',{...credentials,handle:'second_learner',invite,publicName:'Second'},await session())).status).toBe(400);
    const owner=(await db.query('SELECT id,user_id FROM learning_sessions WHERE token_hash=$1',[hash(s.cookie.split('=')[1])])).rows[0];
    const {challenges}=await import('../server/challenges');const sid=randomUUID();
    await db.query("INSERT INTO learning_submissions(id,session_id,request_id,fingerprint,challenge,mode,assisted,state,result,understanding_order,understanding_answer) VALUES($1,$2,$3,'test',$4,'independent',false,'graded',$5,'[0,1,2,3]',0)",[sid,owner.id,randomUUID(),JSON.stringify(challenges[0]),JSON.stringify({correctness:60,edgeCases:20,outcomes:[],graderVersion:'test'})]);
    await recordPoints(db,sid);await recordPoints(db,sid);
    expect((await db.query('SELECT * FROM learning_points WHERE user_id=$1',[owner.user_id])).rowCount).toBe(1);
    expect((await db.query('SELECT * FROM learning_point_history WHERE user_id=$1',[owner.user_id])).rowCount).toBe(1);
    expect((await (await call('/leaderboard?period=all')).json()).entries).toHaveLength(0);
    await call('/account/preferences','POST',{publicName:'Quiet Coder',publicParticipation:true},s);
    const ranked=await (await call('/leaderboard?period=all')).json();expect(ranked.entries[0].points).toBe(100);expect(ranked.entries[0]).not.toHaveProperty('handle');
    await recordPoints(db,sid,50);expect((await (await call('/leaderboard?period=all')).json()).entries[0].points).toBe(50);
    const newSession=await session();const login=await call('/account/login','POST',credentials,newSession);expect(login.status).toBe(200);newSession.cookie=login.headers.get('set-cookie')!.split(';')[0];
    expect((await call('/account','DELETE',{password:credentials.password},newSession)).status).toBe(200);
    expect((await (await call('/leaderboard?period=all')).json()).entries).toHaveLength(0);
    expect((await call('/account','GET',undefined,s)).status).toBe(401);
  });
  it('keeps experiment assignment stable and removes it on opt-out',async()=>{
    const s=await session();await db.query("UPDATE learning_experiments SET active=true WHERE id='assessment-cta'");
    expect((await (await call('/experiments','POST',{},s)).json()).assignments).toHaveLength(0);
    await call('/preferences','POST',{analytics:true},s);
    const a=await (await call('/experiments','POST',{},s)).json();const b=await (await call('/experiments','POST',{},s)).json();expect(a).toEqual(b);expect(a.assignments).toHaveLength(1);
    await call('/preferences','POST',{analytics:false},s);expect((await (await call('/experiments','POST',{},s)).json()).assignments).toHaveLength(0);
  });
});
