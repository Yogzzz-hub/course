// Only version-controlled reference/faulty fixtures, never a visitor submission.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { challenges } from '../server/challenges.ts';
const image='python:3.12.12-alpine';
const local=process.argv.includes('--trusted-local');
if(process.argv.slice(2).some(arg=>arg!=='--trusted-local'))throw new Error('Only --trusted-local is supported; arbitrary source paths are not accepted.');
if(local)console.log('Trusted checked-in fixture validation using local Python. This is NOT sandbox validation and must never receive visitor code.');
const docker=local?null:spawnSync('docker',['info','--format','{{.ServerVersion}}'],{encoding:'utf8',timeout:15000,maxBuffer:65536});
if(docker && (docker.error || docker.status!==0)){
  console.error(docker.error?.code==='ENOENT'
    ? 'Challenge validation requires Docker on PATH. Install/start Docker Desktop, then rerun npm run test:challenge-fixtures.'
    : 'Challenge validation cannot reach the Docker engine. Start Docker Desktop and verify docker info, then rerun npm run test:challenge-fixtures.');
  process.exit(1);
}
let checks=0;
for(const challenge of challenges){
  for(const [index,source] of [challenge.reference,...challenge.faulty].entries()){
    const name='academy-fixture-'+randomUUID();
    const cases=[...challenge.samples,...challenge.hidden];
    const payload=JSON.stringify({source,inputs:cases.map(test=>test.input)});
    const harness=`import json,sys,io,contextlib\np=json.load(sys.stdin)\nresults=[]\nfor value in p['inputs']:\n old=sys.stdin\n sys.stdin=io.StringIO(json.dumps(value))\n out=io.StringIO()\n try:\n  with contextlib.redirect_stdout(out): exec(compile(p['source'],'fixture','exec'),{'__name__':'__main__'})\n  results.append({'ok':True,'output':json.loads(out.getvalue())} if len(out.getvalue().encode('utf8'))<=32768 else {'ok':False})\n except Exception: results.append({'ok':False})\n finally: sys.stdin=old\nprint(json.dumps(results))`;
    try{
      const result=spawnSync(local?'python':'docker',local?['-I','-c',harness]:['run','--rm','--name',name,'-i','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','16','--memory','64m','--cpus','1','--user','65534:65534',image,'python','-I','-c',harness],{input:payload,encoding:'utf8',timeout:30000,maxBuffer:65536,windowsHide:true});
      if(result.error || result.status!==0)throw new Error('Fixture runner failed: '+(result.error?.message||result.stderr||`exit ${result.status}`));
      const outputs=JSON.parse(result.stdout);
      if(!Array.isArray(outputs)||outputs.length!==cases.length)throw new Error('Incomplete fixture results.');
      // Use the same type-sensitive comparison as the authoritative grader (true !== 1).
      const passed=outputs.map((output,i)=>output.ok===true&&isDeepStrictEqual(output.output,cases[i].output));
      if(index===0?!passed.every(Boolean):passed.every(Boolean))throw new Error(`Fixture validation failed: ${challenge.id}, solution ${index}`);
      checks+=passed.length;console.log(`${challenge.id}: ${index===0?'reference passes every case':'faulty solution rejected'} (${passed.filter(Boolean).length}/${passed.length})`);
    }finally{if(!local)spawnSync('docker',['rm','-f',name],{stdio:'ignore',timeout:5000,windowsHide:true});}
  }
}
console.log(`${checks} fixture-case checks completed ${local?'with trusted local fixtures (no sandbox assurance)':'in isolated containers'}.`);
