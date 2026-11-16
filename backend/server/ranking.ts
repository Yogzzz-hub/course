import type { Pool,PoolClient } from 'pg';
import type { Challenge } from './challenges.ts';
import { challengeRubric } from './rubric.ts';
export function challengePoints(score:number,difficulty:string){
  if(!Number.isInteger(score)||score<0||score>100)throw new Error('Invalid verified score');
  const multiplier={beginner:1,intermediate:2,advanced:3}[difficulty];if(!multiplier)throw new Error('Unknown difficulty');
  return score*multiplier;
}
export async function recordPoints(db:Pool|PoolClient,submissionId:string,correction?:number){
  const rows=await db.query('SELECT s.*,owner.user_id FROM learning_submissions s JOIN learning_sessions owner ON owner.id=s.session_id WHERE s.id=$1 AND s.state=\'graded\' AND s.understanding_answer IS NOT NULL',[submissionId]);
  const row=rows.rows[0];if(!row?.user_id || row.mode!=='independent' || row.assisted || row.purpose==='sample')return;
  const challenge=row.challenge as Challenge;
  const total=correction??(row.result.correctness+row.result.edgeCases+(row.understanding_answer===challenge.understanding.answer?challengeRubric(challenge).understanding:0));
  const points=challengePoints(total,challenge.difficulty);
  const saved=await db.query(`INSERT INTO learning_points(user_id,challenge_id,challenge_version,difficulty,skill,points,total,source_submission)
    VALUES($1,$2,$3,$4,'python',$5,$6,$7) ON CONFLICT(user_id,challenge_id) DO UPDATE SET
    points=$5,total=$6,source_submission=$7,challenge_version=$3,updated_at=now()
    WHERE learning_points.points<$5 OR ($8 AND learning_points.source_submission=$7) RETURNING user_id`,
    [row.user_id,challenge.id,challenge.version,challenge.difficulty,points,total,submissionId,correction!==undefined]);
  if(saved.rowCount)await db.query('INSERT INTO learning_point_history(user_id,challenge_id,points,reason) VALUES($1,$2,$3,$4)',[row.user_id,challenge.id,points,correction===undefined?'verified-best-result':'audited-score-correction']);
}
