import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import type { Challenge } from './challenges.ts';
import { challengeRubric } from './rubric.ts';
export const GRADER_VERSION='python-stdio-1.2.0';
export interface JudgeConfig {url:string;token:string;languageId:number;reviewed:boolean}
export interface TestOutcome {passed:boolean;kind:'sample'|'hidden';status:string;timeSeconds?:number;memoryKB?:number}
export function executionMetrics(outcomes:TestOutcome[]){
  const times=outcomes.flatMap(o=>o.timeSeconds===undefined?[]:[o.timeSeconds]);
  const memory=outcomes.flatMap(o=>o.memoryKB===undefined?[]:[o.memoryKB]);
  return {maxTimeSeconds:times.length?Math.max(...times):null,maxMemoryKB:memory.length?Math.max(...memory):null,timeCases:times.length,memoryCases:memory.length,totalCases:outcomes.length,
    notice:'Observed execution measurements for these cases and this runtime, including interpreter and input-processing overhead. They do not establish Big-O complexity or AI authorship and do not change your score.'};
}
function metric(value:unknown,max:number,allowString=false){
  if(allowString&&typeof value==='string'&&value.length<=40&&/^\d+(\.\d+)?$/.test(value))value=Number(value);
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max?value:undefined;
}
export function judgeConfig():JudgeConfig {
  return {url:process.env.JUDGE0_URL||'',token:process.env.JUDGE0_AUTH_TOKEN||'',languageId:Number(process.env.JUDGE0_PYTHON_LANGUAGE_ID),reviewed:process.env.JUDGE0_SANDBOX_REVIEWED==='true'};
}
export function validateJudge(config:JudgeConfig) {
  const url=new URL(config.url);
  if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash || !config.reviewed || !Number.isInteger(config.languageId) || config.languageId<1) throw new Error('Secure reviewed Judge0 configuration is required.');
}
const responseSchema=z.object({status:z.object({id:z.number().int(),description:z.string()}),stdout:z.string().max(32768).nullable().optional(),time:z.unknown().optional(),memory:z.unknown().optional()});
async function limitedJson(response:Response) {
  if(!response.ok)throw new Error('Judging service unavailable.');
  const reader=response.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
  if(reader)for(;;){const value=await reader.read();if(value.done)break;size+=value.value.length;if(size>65536){await reader.cancel();throw new Error('Oversized judging response.');}chunks.push(value.value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
export async function verifyJudgeConfiguration(config:JudgeConfig,fetcher:typeof fetch=fetch) {
  validateJudge(config);
  const response=await fetcher(`${config.url.replace(/\/$/,'')}/config_info`,{headers:{'X-Auth-Token':config.token},signal:AbortSignal.timeout(5000),redirect:'error'});
  const settings=await limitedJson(response) as Record<string,unknown>;
  if(settings.enable_network!==false || settings.allow_enable_network!==false)throw new Error('Judge0 must disable network and prohibit overrides.');
}
export async function judgeCode(code:string,challenge:Challenge,config:JudgeConfig,fetcher:typeof fetch=fetch,purpose:'sample'|'submit'='submit',cancelled:()=>Promise<boolean>=async()=>false) {
  validateJudge(config);
  const rubric=challengeRubric(challenge);
  const outcomes:TestOutcome[]=[];
  for(const [kind,cases] of [['sample',challenge.samples],['hidden',challenge.hidden]] as const){
    if(purpose==='sample' && kind==='hidden')continue;
    for(const test of cases){
      if(await cancelled())throw new Error('Submission cancelled.');
      const created=await limitedJson(await fetcher(`${config.url.replace(/\/$/,'')}/submissions?base64_encoded=false&wait=false`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','X-Auth-Token':config.token},body:JSON.stringify({language_id:config.languageId,source_code:code,stdin:JSON.stringify(test.input),cpu_time_limit:2,wall_time_limit:4,memory_limit:65536,max_processes_and_or_threads:1,max_file_size:32,enable_network:false,number_of_runs:1})}));
      const job=z.object({token:z.string().regex(/^[a-zA-Z0-9-]{1,200}$/)}).parse(created);
      let complete=false;
      for(let poll=0;poll<20;poll++){
        const raw=await limitedJson(await fetcher(`${config.url.replace(/\/$/,'')}/submissions/${job.token}?base64_encoded=false&fields=status,stdout,time,memory`,{headers:{'X-Auth-Token':config.token},redirect:'error',signal:AbortSignal.timeout(5000)}));
        const result=responseSchema.parse(raw);
        if([1,2].includes(result.status.id)){await new Promise(resolve=>setTimeout(resolve,250));continue;}
        if(result.status.id===13 || result.status.id===14 || ![3,4,5,6,7,8,9,10,11,12].includes(result.status.id))throw new Error('Judging infrastructure failure.');
        let parsed:unknown;try{parsed=JSON.parse(result.stdout||'');}catch{parsed=undefined;}
        const timeSeconds=metric(result.time,3600,true),memoryKB=metric(result.memory,1e9);
        outcomes.push({kind,passed:result.status.id===3 && isDeepStrictEqual(parsed,test.output),status:result.status.id===3?'executed':result.status.id===5?'time-limit':result.status.id===6?'compilation-error':'runtime-or-resource-error',...(timeSeconds===undefined?{}:{timeSeconds}),...(memoryKB===undefined?{}:{memoryKB})});
        complete=true;break;
      }
      if(!complete)throw new Error('Judging job deadline exceeded.');
    }
  }
  const fraction=(kind:TestOutcome['kind'])=>{const group=outcomes.filter(o=>o.kind===kind);return group.length?group.filter(o=>o.passed).length/group.length:0;};
  return {graderVersion:GRADER_VERSION,outcomes,correctness:Math.round(fraction('sample')*rubric.sampleCorrectness),edgeCases:Math.round(fraction('hidden')*rubric.edgeCases),performance:executionMetrics(outcomes)};
}
