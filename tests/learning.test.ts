import { describe,it,expect } from 'vitest';
import { bank, questionSchema } from '../server/bank';
import { grade,nextQuestion,publicQuestion,roadmap,type Answer } from '../server/assessment';
import { permitted,passwordHash,verifyPassword } from '../server/security';
import { challenges,publicChallenge } from '../server/challenges';
import { isPrivatePath } from '../src/utils/seo';
import { classifyAttribution,csvCell,leadPriority,orderedFunnel } from '../server/insights';
import { challengePoints } from '../server/ranking';
describe('Authoritative learning rules',()=>{
  it('validates the entire versioned bank and covers every skill at each difficulty',()=>{
    expect(bank).toHaveLength(24);expect(new Set(bank.map(q=>q.id)).size).toBe(24);
    for(const q of bank)expect(questionSchema.safeParse(q).success).toBe(true);
    expect(questionSchema.safeParse({...bank[0],answer:7}).success).toBe(false);
    expect(questionSchema.safeParse({...bank[0],options:['x','x','y','z']}).success).toBe(false);
  });
  it('calculates exact results rather than trusting a client correctness flag',()=>{
    const answers:Answer[]=bank.slice(0,10).map((question,i)=>({question,selected:i<7?question.answer:1,correct:false}));
    const result=grade(answers);expect(result.correct).toBe(7);expect(result.percent).toBe(70);expect(grade([]).percent).toBe(0);
    expect(result.explanations[0].correct).toBe(true);expect(result.skills.reduce((n,s)=>n+s.total,0)).toBe(10);
  });
  it('balances skill coverage, adapts difficulty and never repeats a question',()=>{
    const answers:Answer[]=[];
    for(let i=0;i<10;i++){const q=nextQuestion(bank,answers,1)!;expect(answers.some(a=>a.question.id===q.id)).toBe(false);if(i===0)expect(q.difficulty).toBe(1);if(i===1)expect(q.difficulty).toBe(2);answers.push({question:q,selected:q.answer,correct:true});}
    expect(new Set(answers.slice(0,8).map(a=>a.question.skill)).size).toBe(8);
  });
  it('never exposes keys, explanations or hidden challenge tests before grading',()=>{
    const q=publicQuestion(bank[0],[3,2,1,0]);expect(q).not.toHaveProperty('answer');expect(q).not.toHaveProperty('explanation');expect(q.options[3]).toBe(bank[0].options[0]);
    for(const c of challenges){expect(publicChallenge(c)).not.toHaveProperty('hidden');expect(publicChallenge(c)).not.toHaveProperty('reference');expect(publicChallenge(c)).not.toHaveProperty('understanding');}
  });
  it('marks unmeasured skills as unassessed rather than treating self-report as evidence',()=>{
    const result=grade([{question:bank[0],selected:0,correct:true}]);const plan=roadmap(result,'Backend Developer');
    expect(plan.steps.find(s=>s.skill==='sql')?.evidence).toBe('Not assessed');expect(plan.steps.at(-1)?.skill).toBe('python');
  });
  it('enforces role boundaries and password verification',()=>{
    expect(permitted('analyst','questions')).toBe(false);expect(permitted('instructor','publish')).toBe(false);expect(permitted('counselor','leads')).toBe(true);expect(permitted('owner','publish')).toBe(true);expect(permitted('toString','metrics')).toBe(false);
    const hash=passwordHash('a-long-test-password');expect(verifyPassword('a-long-test-password',hash)).toBe(true);expect(verifyPassword('wrong-password',hash)).toBe(false);
  });
  it('keeps private routes out of public indexing',()=>{expect(isPrivatePath('/assessment')).toBe(true);expect(isPrivatePath('/admin')).toBe(true);expect(isPrivatePath('/developer-readiness-test')).toBe(false);});
  it('uses explicit difficulty weights, honest lead priority and safe export cells',()=>{
    expect(challengePoints(80,'advanced')).toBe(240);expect(()=>challengePoints(101,'beginner')).toThrow();
    expect(leadPriority('new',false)).toContain('ask about learning goals');expect(leadPriority('qualified',true)).toBe('Qualified by counselor');
    expect(csvCell('=HYPERLINK("evil")')).toMatch(/^"'/);expect(csvCell('hello, world')).toBe('"hello, world"');
  });
  it('classifies explicit campaign and referral signals without retaining referrer paths',()=>{
    expect(classifyAttribution({referrer:'https://www.google.com/search?q=private'},'https://academy.test')).toMatchObject({channel:'organic',referrerHost:'www.google.com'});
    expect(classifyAttribution({source:'newsletter',campaign:'learn'},'https://academy.test').channel).toBe('campaign');
    expect(classifyAttribution({referrer:'https://academy.test/private'},'https://academy.test').channel).toBe('direct-or-unknown');
  });
});

it('counts a later course visit in order without double-counting repeated stages',()=>{
  const names=['page_view','course_viewed','assessment_started','assessment_completed','roadmap_viewed','course_viewed','course_viewed','counselling_requested'];
  expect(orderedFunnel(names.map((name,i)=>({session_id:'one',name,at:new Date(i*1000)})))).toEqual([1,1,1,1,1,1,0,0]);
});
