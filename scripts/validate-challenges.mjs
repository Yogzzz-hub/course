// Only version-controlled reference/faulty fixtures, never a visitor submission.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { challenges } from '../server/challenges.ts';
const image='python:3.12.12-alpine';
let checks=0;
for(const challenge of challenges){
  for(const [index,source] of [challenge.reference,...challenge.faulty].entries()){
    const name='academy-fixture-'+randomUUID();
    const payload=JSON.stringify({source,tests:[...challenge.samples,...challenge.hidden]});
    const harness=`import json,sys,io,contextlib\np=json.load(sys.stdin)\npassed=[]\nfor case in p['tests']:\n old=sys.stdin\n sys.stdin=io.StringIO(json.dumps(case['input']))\n out=io.StringIO()\n try:\n  with contextlib.redirect_stdout(out): exec(compile(p['source'],'fixture','exec'),{'__name__':'__main__'})\n  passed.append(json.loads(out.getvalue())==case['output'])\n except Exception: passed.append(False)\n finally: sys.stdin=old\nprint(json.dumps(passed))`;
    try{
      const result=spawnSync('docker',['run','--rm','--name',name,'-i','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','16','--memory','64m','--cpus','1','--user','65534:65534',image,'python','-I','-c',harness],{input:payload,encoding:'utf8',timeout:30000,maxBuffer:65536});
      if(result.status!==0)throw new Error('Fixture container failed: '+result.stderr);
      const passed=JSON.parse(result.stdout);
      if(index===0?!passed.every(Boolean):passed.every(Boolean))throw new Error(`Fixture validation failed: ${challenge.id}, solution ${index}`);
      checks+=passed.length;console.log(`${challenge.id}: ${index===0?'reference passes every case':'faulty solution rejected'} (${passed.filter(Boolean).length}/${passed.length})`);
    }finally{spawnSync('docker',['rm','-f',name],{stdio:'ignore',timeout:5000});}
  }
}
console.log(`${checks} fixture-case checks completed in isolated containers.`);
