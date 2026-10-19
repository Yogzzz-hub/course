import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { careerRoles, learningApi, learningSession, setLearningAnalytics, type Attempt, type Roadmap } from '../components/learning/client';
import '../components/learning/learning.css';
import '../components/learning/assessment.css';
import { ProfileFields, ShareRoadmap, emptyProfile } from '../components/learning/RoadmapTools';
import { LearningContact } from '../components/learning/LearningContact';
import { ExperimentLink } from '../components/learning/ExperimentLink';
import { SkillExplorer, SkillResults } from '../components/learning/SkillExplorer';
import { skillLabel } from '../data/skillAreas';
import { ArrowRight, Check, Compass, Map, ShieldCheck } from 'lucide-react';

export default function Assessment(){
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [attempt,setAttempt]=useState<Attempt|null>(null),[saved,setSaved]=useState<Attempt[]>([]);
  const [track,setTrack]=useState(1),[answer,setAnswer]=useState<number|null>(null),[analytics,setAnalytics]=useState(false);
  const [role,setRole]=useState(careerRoles[0]),[plan,setPlan]=useState<Roadmap|null>(null);
  const questionHeading=useRef<HTMLHeadingElement>(null);
  const resultRegion=useRef<HTMLDivElement>(null);
  const locked=useRef(false);
  const run=useCallback(async(action:()=>Promise<void>)=>{if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{locked.current=false;setBusy(false);}},[]);
  const connect=useCallback(async()=>{await run(async()=>{const s=await learningSession();setAnalytics(s.analytics);const list=await learningApi<{attempts:Attempt[]}>('/attempts');setSaved(list.attempts);setReady(true);});},[run]);
  useEffect(()=>{void connect();},[connect]);
  useEffect(()=>{if(attempt?.result)resultRegion.current?.focus();else if(attempt)questionHeading.current?.focus();},[attempt]);
  const [profile,setProfile]=useState(emptyProfile);
  const [selectedSkill,setSelectedSkill]=useState('all');
  const startCheck=(skill=selectedSkill)=>run(async()=>{const next=await learningApi<Attempt>('/attempts',{track,...(skill==='all'?{}:{skill})});setAttempt(next);setAnswer(null);setPlan(null);setSelectedSkill(skill);});
  const result=attempt?.result;
  return <div className="learning-shell assessment-experience">
    <p className="learning-eyebrow">Developer reality check · free · no account required</p>
    <h1>{result?'You found your starting point. Let’s find your next move.':attempt?'One question. A new connection.':'What could you build if you knew where to start?'}</h1>
    <p className="assessment-intro">{result?'Explore the evidence behind your answers, follow a curiosity, and turn your next skill into a small project.':'Discover your strengths across 12 developer skills. Explore the full picture in 12 questions, or follow your curiosity with a 3-question focused check.'}</p>
    <div className="assessment-journey" aria-label="Your learning journey">{[{icon:Compass,label:'Explore',active:!attempt},{icon:Check,label:'Discover',active:!!attempt&&!result},{icon:Map,label:'Build your path',active:!!result}].map((step,i)=><div key={step.label} aria-current={step.active?'step':undefined}><step.icon size={18}/><span>{step.label}</span>{i<2&&<ArrowRight size={14} aria-hidden="true"/>}</div>)}</div>
    {attempt&&<button className="learning-button secondary" disabled={busy} onClick={()=>void run(async()=>{const list=await learningApi<{attempts:Attempt[]}>('/attempts');setSaved(list.attempts);setAttempt(null);setAnswer(null);setPlan(null);})}>Explore other skill areas</button>}
    {error && <div role="alert" className="learning-error">{error}{!ready && <button className="learning-button secondary" onClick={()=>void connect()} disabled={busy}>Retry connection</button>}</div>}
    {!ready && !error && <p role="status">Connecting your private assessment session…</p>}
    {ready && !attempt && <section className="learning-card" aria-labelledby="start-title">
      <div className="assessment-quick-start"><div><strong>{selectedSkill==='all'?'Your full 12-skill discovery':`${skillLabel(selectedSkill)} · focused discovery`}</strong><span>{selectedSkill==='all'?'12 questions · about 6–10 minutes':'3 questions · about 2–4 minutes'} · free</span></div><button className="learning-button" disabled={busy} onClick={()=>void startCheck()}>Let’s explore <ArrowRight size={17}/></button></div>
      <SkillExplorer selected={selectedSkill} onSelect={setSelectedSkill}/>
      <div className="assessment-start-panel"><div><h2 id="start-title">Make it your starting point</h2><p>{selectedSkill==='all'?'The full discovery check · 12 questions · about 6–10 minutes':`${skillLabel(selectedSkill)} focus · 3 questions · about 2–4 minutes`}. Difficulty adapts as you answer.</p>
      <label htmlFor="assessment-track">Starting level</label><select id="assessment-track" value={track} onChange={e=>setTrack(Number(e.target.value))}><option value={1}>Beginner — build the foundations</option><option value={2}>Intermediate — connect the concepts</option><option value={3}>Advanced — reason about edge cases</option></select>
      <button className="learning-button" disabled={busy} onClick={()=>void startCheck()}>Start assessment <ArrowRight size={18}/></button></div><aside><ShieldCheck size={24}/><h3>Curiosity is the only requirement.</h3><p>No account. No leaderboard pressure. No trick scores. Choose the answer you believe is right; explanations come at the end.</p><p className="learning-muted">A necessary private session cookie lets you resume. Answers remain available for 24 hours; the session expires after seven days. You can delete your data below.</p></aside></div>
      {saved.length>0 && <div><h3>Continue in this browser</h3>{saved.map(item=><p key={item.id}><button className="learning-button secondary" disabled={busy} onClick={()=>{setAttempt(item);setAnswer(null);setPlan(null);}}>{item.result?'Review completed assessment':`Resume at question ${item.answered+1}`} · level {item.track}</button></p>)}</div>}
    </section>}
    {attempt?.question && <section className="learning-card" aria-labelledby="question-title">
      <p className="learning-eyebrow">Question {attempt.answered+1} of {attempt.total} · {skillLabel(attempt.question.skill)} · difficulty {attempt.question.difficulty}/3</p>
      <progress value={attempt.answered} max={attempt.total} aria-label="Assessment progress"/>
      <h2 id="question-title" tabIndex={-1} ref={questionHeading}>Choose the best answer</h2><p className="assessment-question-hint">{attempt.question.kind==='output'?'Trace it in your head. What changes at each step?':attempt.question.kind==='debugging'?'Look for the assumption. Which small detail changes the outcome?':'Pause and picture it in a real project. What would you trust?'}</p><pre>{attempt.question.prompt}</pre>
      <form onSubmit={e=>{e.preventDefault();if(answer===null)return;void run(async()=>{const next=await learningApi<Attempt>(`/attempts/${attempt.id}/answer`,{questionId:attempt.question!.id,version:attempt.question!.version,option:answer});setAttempt(next);setAnswer(null);});}}>
        <fieldset disabled={busy}><legend className="learning-muted">Select one option. Explanations appear when you finish.</legend>{attempt.question.options.map((option,index)=><label className="learning-option" key={`${attempt.question!.id}-${index}`}><input required type="radio" name="answer" checked={answer===index} onChange={()=>setAnswer(index)}/><span>{option}</span></label>)}</fieldset>
        <div className="assessment-answer-footer"><span>{answer===null?'Take your time. Pick the answer that makes sense to you.':'Answer selected. Ready to explore the next connection?'}</span><button className="learning-button" disabled={busy || answer===null}>{busy?'Saving answer…':attempt.answered===attempt.total-1?'See my results':'Save and continue'}</button></div>
      </form>
    </section>}
    {result && <>
      <div tabIndex={-1} ref={resultRegion}><SkillResults result={result} busy={busy} onExplore={skill=>void startCheck(skill)}/></div>
      <section className="learning-card"><h2>Build My Career Roadmap</h2><label htmlFor="career-role">Your target role</label><select id="career-role" value={role} onChange={e=>{setRole(e.target.value);setPlan(null);}}>{careerRoles.map(r=><option key={r}>{r}</option>)}</select><ProfileFields value={profile} onChange={setProfile}/><button className="learning-button" disabled={busy} onClick={()=>void run(async()=>setPlan(await learningApi<Roadmap>(`/attempts/${attempt!.id}/roadmap`,{role,profile})))}>Build My Career Roadmap</button>
        {plan && <div aria-live="polite"><h3>Your Personalized Learning Roadmap</h3><p>{plan.basis}</p><ol className="assessment-roadmap">{plan.steps.map((step,index)=><li key={step.skill}><span className="roadmap-step-number">{String(index+1).padStart(2,'0')}</span><div><strong>{skillLabel(step.skill)}: {step.priority}</strong><p>{step.evidence}. {step.project}</p><Link to={step.module}>Explore relevant learning →</Link></div></li>)}</ol><p>{plan.jobNotice}</p>{plan.jobSkills?.length ? <p>Job-description skill matches: {plan.jobSkills.join(', ')}</p> : null}{plan.id && <ShareRoadmap roadmapId={plan.id}/>}<div className="learning-actions"><Link className="learning-button" to="/python-coding-challenge">Practice with a Python coding challenge</Link><ExperimentLink id="consultation-prompt" className="learning-button secondary" to="/book-session" label="Discuss this roadmap with a counselor"/></div></div>}
      </section>
      <section className="learning-card"><h2>Review every answer</h2>{result.explanations.map(item=><details key={item.id}><summary>{item.correct?'Correct':'Practice next'} · {item.objective}</summary><pre>{item.prompt}</pre><p>Your answer: {item.selected}</p><p>Correct answer: {item.answer}</p><p>{item.explanation}</p><p className="learning-muted">Question {item.id}, version {item.version}</p></details>)}<p className="learning-muted">Grader {result.graderVersion}</p></section>
      <LearningContact interest={role}/>
    </>}
    {ready && <details className="learning-card"><summary>Privacy and data controls</summary><p>Optional analytics record learning activity without contact details or fingerprinting. Operational assessment data is needed to calculate and recover your result. Optional events are retained for at most 30 days; this anonymous session expires after seven days. Scheduled deletion must be enabled by the operator.</p><label className="learning-option"><input type="checkbox" checked={analytics} disabled={busy} onChange={e=>{const enabled=e.target.checked;void run(async()=>{await learningApi('/preferences',{analytics:enabled});setAnalytics(enabled);setLearningAnalytics(enabled);});}}/>Allow optional first-party learning analytics</label><p>Turning analytics off also deletes your recorded optional events.</p><button className="learning-button secondary" disabled={busy} onClick={()=>void run(async()=>{await learningApi('/data',{},'DELETE');setLearningAnalytics(false);setAttempt(null);setSaved([]);setPlan(null);setReady(false);})}>Delete my assessment data and session</button><p><Link to="/privacy-policy">Read the privacy notice and approval status</Link></p></details>}
  </div>;
}
