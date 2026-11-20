import { describe,it,expect,vi } from 'vitest';
import { judgeCode,validateJudge,verifyJudgeConfiguration } from '../server/judge';
import { challenges } from '../server/challenges';
import { challengeRubric } from '../server/rubric';
import { understandingQuestions } from '../server/understanding';
const config={url:'https://isolated-judge.example.test',token:'test-only',languageId:71,reviewed:true};
function fetcher(outputs:unknown[],status=3){let n=0;return vi.fn<typeof fetch>().mockImplementation(async(_url,init)=>new Response(JSON.stringify(init?.method==='POST'?{token:'job-1'}:{status:{id:status,description:'test'},stdout:JSON.stringify(outputs[n++])})));}
describe('Isolated execution adapter',()=>{
  it('provides versioned reasoning, complexity and changed-requirement checkpoints without modifying challenges',()=>{
    for(const challenge of challenges){
      const before=JSON.stringify(challenge),checks=understandingQuestions(challenge);
      expect(checks).toHaveLength(3);expect(new Set(checks.map(q=>q.id)).size).toBe(3);
      expect(new Set(checks.map(q=>q.kind))).toEqual(new Set(['reasoning','complexity','modification']));
      for(const q of checks){expect(q.version).toBe(1);expect(q.options).toHaveLength(4);expect(new Set(q.options).size).toBe(4);expect(q.options[q.answer]).toBeTruthy();expect(q.explanation.length).toBeGreaterThan(20);}
      expect(JSON.stringify(challenge)).toBe(before);
    }
  });
  it('records reported time/memory without deriving authorship or altering grades',async()=>{
    const c=challenges[0],base=fetcher([...c.samples,...c.hidden].map(t=>t.output));
    const transport:typeof fetch=async(url,init)=>{
      const response=await base(url,init);if(init?.method==='POST')return response;
      const value=await response.json();return Response.json({...value,time:'0.012',memory:2048});
    };
    const result=await judgeCode(c.reference,c,config,transport);
    expect(result.correctness+result.edgeCases).toBe(80);expect(result.performance.maxTimeSeconds).toBe(0.012);expect(result.performance.maxMemoryKB).toBe(2048);
    expect(result.performance.timeCases).toBe(c.samples.length+c.hidden.length);expect(result.performance.notice).toContain('do not change your score');
    expect(result).not.toHaveProperty('aiDetected');expect(base.mock.calls[1][0]).toContain('fields=status,stdout,time,memory');
  });
  it('does not invent zero metrics when resource data is missing or malformed',async()=>{
    const c=challenges[0];
    for(const metadata of [{},{time:'Infinity',memory:-1},{time:'',memory:'2048'},{time:-2,memory:null}]){
      const base=fetcher([...c.samples,...c.hidden].map(t=>t.output));
      const transport:typeof fetch=async(url,init)=>{const response=await base(url,init);return init?.method==='POST'?response:Response.json({...await response.json(),...metadata});};
      const result=await judgeCode(c.reference,c,config,transport);
      expect(result.performance.maxTimeSeconds).toBeNull();expect(result.performance.maxMemoryKB).toBeNull();expect(result.performance.timeCases).toBe(0);expect(result.correctness).toBe(60);
    }
  });
  it('preserves a genuinely reported zero measurement',async()=>{
    const c=challenges[0],base=fetcher(c.samples.map(t=>t.output));
    const transport:typeof fetch=async(url,init)=>{const response=await base(url,init);return init?.method==='POST'?response:Response.json({...await response.json(),time:'0.000',memory:0});};
    const result=await judgeCode(c.reference,c,config,transport,'sample');
    expect(result.performance.maxTimeSeconds).toBe(0);expect(result.performance.maxMemoryKB).toBe(0);expect(result.performance.timeCases).toBe(c.samples.length);
  });
  it('uses snapshotted rubric weights and rejects invalid rubrics before execution',async()=>{
    const c={...challenges[0],rubric:{sampleCorrectness:40,edgeCases:35,understanding:25}};
    const result=await judgeCode(c.reference,c,config,fetcher([...c.samples,...c.hidden].map(t=>t.output)));
    expect(result.correctness).toBe(40);expect(result.edgeCases).toBe(35);
    expect(challengeRubric(challenges[0]).understanding).toBe(20);
    for(const rubric of [{sampleCorrectness:60,edgeCases:20,understanding:30},{sampleCorrectness:-1,edgeCases:81,understanding:20},{sampleCorrectness:60.5,edgeCases:19.5,understanding:20}]){
      const transport=fetcher([]);
      await expect(judgeCode(c.reference,{...c,rubric},config,transport)).rejects.toThrow('rubric');
      expect(transport).not.toHaveBeenCalled();
    }
  });
  it('fails closed on insecure or unreviewed infrastructure',async()=>{
    expect(()=>validateJudge({...config,url:'http://localhost'})).toThrow();expect(()=>validateJudge({...config,reviewed:false})).toThrow();
    await expect(verifyJudgeConfiguration(config,vi.fn().mockResolvedValue(new Response(JSON.stringify({enable_network:true,allow_enable_network:true}))))).rejects.toThrow();
  });
  it('grades by outputs and sends resource limits without sending expected outputs',async()=>{
    const c=challenges[0],f=fetcher([...c.samples,...c.hidden].map(t=>t.output));const result=await judgeCode(c.reference,c,config,f);
    expect(result.correctness).toBe(60);expect(result.edgeCases).toBe(20);
    const payload=JSON.parse(f.mock.calls[0][1]!.body as string);expect(payload.enable_network).toBe(false);expect(payload.max_processes_and_or_threads).toBe(1);expect(payload).not.toHaveProperty('expected_output');
  });
  it('accepts equivalent object key order and rejects incorrect outputs',async()=>{
    const c=challenges[1];const output=[...c.samples,...c.hidden].map(t=>t.output);output[0]={dog:1,cat:2};expect((await judgeCode('valid alternative',c,config,fetcher(output))).correctness).toBe(60);
    expect((await judgeCode('faulty',challenges[0],config,fetcher([0,0,0,0,0]))).edgeCases).toBe(0);
  });
  it.each([5,6,7,8,9,10,11,12])('records candidate execution status %s without infrastructure retries',async status=>{
    const result=await judgeCode('untrusted input',challenges[0],config,fetcher([],status));expect(result.correctness).toBe(0);expect(result.outcomes.every(o=>!o.passed)).toBe(true);
  });
  it('does not convert outages, internal errors or malformed responses into zero scores',async()=>{
    await expect(judgeCode('code',challenges[0],config,vi.fn().mockRejectedValue(new Error('outage')))).rejects.toThrow();
    await expect(judgeCode('code',challenges[0],config,fetcher([],13))).rejects.toThrow();
    await expect(judgeCode('code',challenges[0],config,vi.fn().mockResolvedValue(new Response('{}')))).rejects.toThrow();
  });
  it('runs only public cases for a sample request',async()=>{
    const c=challenges[0],f=fetcher(c.samples.map(t=>t.output));
    const result=await judgeCode(c.reference,c,config,f,'sample');
    expect(result.outcomes).toHaveLength(c.samples.length);
    expect(result.outcomes.every(o=>o.kind==='sample')).toBe(true);
    expect(result.edgeCases).toBe(0);
    expect(f).toHaveBeenCalledTimes(c.samples.length*2);
  });
  it('stops before dispatching another test after cancellation',async()=>{
    const c=challenges[0],f=fetcher(c.samples.map(t=>t.output));let checked=0;
    await expect(judgeCode(c.reference,c,config,f,'submit',async()=>++checked>1)).rejects.toThrow('cancelled');
    expect(f).toHaveBeenCalledTimes(2);
  });
  it.each(challenges.map(challenge=>[challenge.id,challenge] as const))('grades every public and hidden case for %s',async(_id,challenge)=>{
    const cases=[...challenge.samples,...challenge.hidden];
    const correct=await judgeCode('fixture response transport',challenge,config,fetcher(cases.map(test=>test.output)));
    expect(correct.correctness+correct.edgeCases).toBe(80);
    expect(correct.outcomes).toHaveLength(cases.length);
    const wrong=await judgeCode('fixture response transport',challenge,config,fetcher(cases.map(()=>({unexpected:'wrong result'}))));
    expect(wrong.correctness+wrong.edgeCases).toBe(0);
  });
});
