import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
if(existsSync('.env.learning.local'))loadEnvFile('.env.learning.local');
if(!process.env.TEST_DATABASE_URL){
  const url=new URL(process.env.DATABASE_URL||'http://missing');
  if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Set TEST_DATABASE_URL explicitly. Integration tests create a temporary schema.');
  process.env.TEST_DATABASE_URL=process.env.DATABASE_URL;
}
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/learning-integration.test.ts'],{stdio:'inherit',env:process.env});
process.exit(result.status??1);
