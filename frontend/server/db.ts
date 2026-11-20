import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { bank } from './bank.ts';
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(81244301)');
    await client.query('CREATE TABLE IF NOT EXISTS platform_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied=new Set((await client.query('SELECT version FROM platform_migrations')).rows.map(row=>row.version as number));
    const migrations=['001_learning.sql','002_judging.sql','003_score_reviews.sql','004_roadmaps.sql','005_learners.sql','006_engagement.sql','007_judge_operations.sql','008_supabase_and_enquiries.sql'];
    for(const name of migrations){
      if(!applied.has(Number(name.slice(0,3))))await client.query(await readFile(new URL('./migrations/'+name,import.meta.url),'utf8'));
    }
    for (const question of bank) await client.query("INSERT INTO learning_questions(id,version,content,status,reviewed_at) VALUES($1,$2,$3,'published',now()) ON CONFLICT DO NOTHING", [question.id,question.version,JSON.stringify(question)]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
