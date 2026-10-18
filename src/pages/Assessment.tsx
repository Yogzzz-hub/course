import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { careerRoles, learningApi, learningSession, setLearningAnalytics, type Attempt, type Roadmap } from '../components/learning/client';
import '../components/learning/learning.css';
import { ProfileFields, ShareRoadmap, emptyProfile } from '../components/learning/RoadmapTools';
import { LearningContact } from '../components/learning/LearningContact';
import { ExperimentLink } from '../components/learning/ExperimentLink';

export default function Assessment(){
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [attempt,setAttempt]=useState<Attempt|null>(null),[saved,setSaved]=useState<Attempt[]>([]);
  const [track,setTrack]=useState(1),[answer,setAnswer]=useState<number|null>(null),[analytics,setAnalytics]=useState(false);
  const [role,setRole]=useState(careerRoles[0]),[plan,setPlan]=useState<Roadmap|null>(null);
  const questionHeading=useRef<HTMLHeadingElement>(null);
  const locked=useRef(false);
  const run=useCallback(async(action:()=>Promise<void>)=>{if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{locked.current=false;setBusy(false);}},[]);
  const connect=useCallback(async()=>{await run(async()=>{const s=await learningSession();setAnalytics(s.analytics);const list=await learningApi<{attempts:Attempt[]}>('/attempts');setSaved(list.attempts);setReady(true);});},[run]);
  useEffect(()=>{void connect();},[connect]);
  useEffect(()=>{if(attempt)questionHeading.current?.focus();},[attempt]);
  const [profile,setProfile]=useState(emptyProfile);
  const result=attempt?.result;
  return <div className="learning-shell">
    <p className="learning-eyebrow">Developer reality check · free · no account required</p>
    <h1>Discover what you know. Decide what to learn next.</h1>
    <p>Ten questions, about 5–10 minutes. Your answers determine your result. No percentile claims, hiring guarantees or hidden score adjustments.</p>
    {error && <div role="alert" className="learning-error">{error}{!ready && <button className="learning-button secondary" onClick={()=>void connect()} disabled={busy}>Retry connection</button>}</div>}
    {!ready && !error && <p role="status">Connecting your private assessment session…</p>}
    {ready && !attempt && <section className="learning-card" aria-labelledby="start-title">
      <h2 id="start-title">Choose your starting level</h2><p>Questions cover Python, logic, SQL, JavaScript, backend development, debugging, APIs and web fundamentals. Difficulty adapts after each answer.</p>
      <label htmlFor="assessment-track">Starting level</label><select id="assessment-track" value={track} onChange={e=>setTrack(Number(e.target.value))}><option value={1}>Beginner — build the foundations</option><option value={2}>Intermediate — connect the concepts</option><option value={3}>Advanced — reason about edge cases</option></select>
      <p className="learning-muted">Starting creates a necessary private session cookie. Answers are saved on the server for up to 24 hours so you can resume in this browser. The session expires after seven days. No email is needed. You can delete your data below.</p>
      <button className="learning-button" disabled={busy} onClick={()=>void run(async()=>{setAttempt(await learningApi<Attempt>('/attempts',{track}));setPlan(null);})}>Start assessment</button>
      {saved.length>0 && <div><h3>Continue in this browser</h3>{saved.map(item=><p key={item.id}><button className="learning-button secondary" disabled={busy} onClick={()=>{setAttempt(item);setAnswer(null);setPlan(null);}}>{item.result?'Review completed assessment':`Resume at question ${item.answered+1}`} · level {item.track}</button></p>)}</div>}
    </section>}
    {attempt?.question && <section className="learning-card" aria-labelledby="question-title">
      <p className="learning-eyebrow">Question {attempt.answered+1} of {attempt.total} · {attempt.question.skill} · difficulty {attempt.question.difficulty}/3</p>
      <progress value={attempt.answered} max={attempt.total} aria-label="Assessment progress"/>
      <h2 id="question-title" tabIndex={-1} ref={questionHeading}>Choose the best answer</h2><pre>{attempt.question.prompt}</pre>
      <form onSubmit={e=>{e.preventDefault();if(answer===null)return;void run(async()=>{const next=await learningApi<Attempt>(`/attempts/${attempt.id}/answer`,{questionId:attempt.question!.id,version:attempt.question!.version,option:answer});setAttempt(next);setAnswer(null);});}}>
        <fieldset disabled={busy}><legend className="learning-muted">Select one option. Explanations appear when you finish.</legend>{attempt.question.options.map((option,index)=><label className="learning-option" key={`${attempt.question!.id}-${index}`}><input required type="radio" name="answer" checked={answer===index} onChange={()=>setAnswer(index)}/><span>{option}</span></label>)}</fieldset>
        <button className="learning-button" disabled={busy || answer===null}>{busy?'Saving answer…':attempt.answered===9?'See my results':'Save and continue'}</button>
      </form>
    </section>}
    {result && <>
      <section className="learning-card"><h2 tabIndex={-1} ref={questionHeading}>Your demonstrated skills</h2><p className="learning-score">{result.correct} / {result.total}</p><p>{result.percent}% of these questions answered correctly.</p><p>{result.limitation}</p>
        <div className="learning-grid">{result.skills.map(skill=><article className="learning-card" key={skill.skill}><h3>{skill.skill}</h3><p>{skill.correct}/{skill.total} correct · {skill.percent===100?'A strength in this sample':'An area to practice'}</p><Link to={skill.module}>Explore the related course module →</Link></article>)}</div>
      </section>
      <section className="learning-card"><h2>Build My Career Roadmap</h2><label htmlFor="career-role">Your target role</label><select id="career-role" value={role} onChange={e=>{setRole(e.target.value);setPlan(null);}}>{careerRoles.map(r=><option key={r}>{r}</option>)}</select><ProfileFields value={profile} onChange={setProfile}/><button className="learning-button" disabled={busy} onClick={()=>void run(async()=>setPlan(await learningApi<Roadmap>(`/attempts/${attempt!.id}/roadmap`,{role,profile})))}>Build My Career Roadmap</button>
        {plan && <div aria-live="polite"><h3>Your Personalized Learning Roadmap</h3><p>{plan.basis}</p><ol>{plan.steps.map(step=><li key={step.skill}><strong>{step.skill}: {step.priority}</strong><p>{step.evidence}. {step.project}</p><Link to={step.module}>Explore relevant learning →</Link></li>)}</ol><p>{plan.jobNotice}</p>{plan.jobSkills?.length ? <p>Job-description skill matches: {plan.jobSkills.join(', ')}</p> : null}{plan.id && <ShareRoadmap roadmapId={plan.id}/>}<div className="learning-actions"><Link className="learning-button" to="/python-coding-challenge">Practice with a coding challenge</Link><ExperimentLink id="consultation-prompt" className="learning-button secondary" to="/book-session" label="Discuss this roadmap with a counselor"/></div></div>}
      </section>
      <section className="learning-card"><h2>Review every answer</h2>{result.explanations.map(item=><details key={item.id}><summary>{item.correct?'Correct':'Practice next'} · {item.objective}</summary><pre>{item.prompt}</pre><p>Your answer: {item.selected}</p><p>Correct answer: {item.answer}</p><p>{item.explanation}</p><p className="learning-muted">Question {item.id}, version {item.version}</p></details>)}<p className="learning-muted">Grader {result.graderVersion}</p></section>
      <LearningContact interest={role}/>
    </>}
    {ready && <details className="learning-card"><summary>Privacy and data controls</summary><p>Optional analytics record learning activity without contact details or fingerprinting. Operational assessment data is needed to calculate and recover your result. Optional events are retained for at most 30 days; this anonymous session expires after seven days. Scheduled deletion must be enabled by the operator.</p><label className="learning-option"><input type="checkbox" checked={analytics} disabled={busy} onChange={e=>{const enabled=e.target.checked;void run(async()=>{await learningApi('/preferences',{analytics:enabled});setAnalytics(enabled);setLearningAnalytics(enabled);});}}/>Allow optional first-party learning analytics</label><p>Turning analytics off also deletes your recorded optional events.</p><button className="learning-button secondary" disabled={busy} onClick={()=>void run(async()=>{await learningApi('/data',{},'DELETE');setLearningAnalytics(false);setAttempt(null);setSaved([]);setPlan(null);setReady(false);})}>Delete my assessment data and session</button><p><Link to="/privacy-policy">Read the privacy notice and approval status</Link></p></details>}
  </div>;
}
