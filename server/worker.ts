import { pool } from './db.ts';
import { judgeCode, judgeConfig, verifyJudgeConfiguration } from './judge.ts';
import { recordPoints } from './ranking.ts';
import { challengeRubric } from './rubric.ts';
const config=judgeConfig();
await verifyJudgeConfiguration(config);
const worker=await pool.connect();
const lock=await worker.query('SELECT pg_try_advisory_lock(81244302) AS locked');
if(!lock.rows[0].locked)throw new Error('Another judging worker already owns the concurrency lock.');
let stopped=false;
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopped=true;});
try {
  // A previous worker may have died after claiming a job. Never treat that as candidate failure.
  await worker.query("UPDATE learning_submissions SET state='system-error',code=NULL,updated_at=now() WHERE state='running'");
  while(!stopped){
    await verifyJudgeConfiguration(config);
    await worker.query('INSERT INTO learning_worker_health(id,checked_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET checked_at=now()');
    const {rows}=await worker.query("UPDATE learning_submissions SET state='running',updated_at=now() WHERE id=(SELECT id FROM learning_submissions WHERE state='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *");
    if(!rows[0]){await new Promise(resolve=>setTimeout(resolve,1000));continue;}
    const job=rows[0];
    try {
      const result=await judgeCode(job.code,job.challenge,config,fetch,job.purpose,async()=>{
        await worker.query('UPDATE learning_worker_health SET checked_at=now() WHERE id=1');
        return !(await worker.query("SELECT id FROM learning_submissions WHERE id=$1 AND state='running'",[job.id])).rowCount;
      });
      await worker.query('BEGIN');
      try{
        await worker.query("UPDATE learning_submissions SET state='graded',result=$2,code=NULL,updated_at=now() WHERE id=$1 AND state='running'",[job.id,JSON.stringify(result)]);
        const correction=(await worker.query('SELECT score FROM learning_score_corrections WHERE submission_id=$1 ORDER BY id DESC LIMIT 1',[job.id])).rows[0];
        if(job.understanding_answer!==null)await recordPoints(worker,job.id,correction?.score??result.correctness+result.edgeCases+(job.understanding_answer===job.challenge.understanding.answer?challengeRubric(job.challenge).understanding:0));
        await worker.query('COMMIT');
      }catch(error){await worker.query('ROLLBACK');throw error;}
    }catch {
      // Only infrastructure failures retry. Candidate failures are normal graded outcomes.
      await worker.query("UPDATE learning_submissions SET state=CASE WHEN retries<2 THEN 'queued' ELSE 'system-error' END,retries=retries+1,code=CASE WHEN retries<2 THEN code ELSE NULL END,updated_at=now() WHERE id=$1 AND state='running'",[job.id]);
      console.error(JSON.stringify({level:'error',type:'judging-service-failure',submissionId:job.id}));
    }
  }
}finally{await worker.query('DELETE FROM learning_worker_health WHERE id=1');await worker.query('SELECT pg_advisory_unlock(81244302)');worker.release();await pool.end();}
