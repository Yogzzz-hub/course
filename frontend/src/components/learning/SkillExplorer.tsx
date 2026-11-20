import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Compass, Layers3, Sparkles } from 'lucide-react';
import { skillAreas } from '../../data/skillAreas';
import type { Result } from './client';

export function SkillExplorer({selected,onSelect}:{selected:string;onSelect:(id:string)=>void}){
  const [group,setGroup]=useState('All areas');
  return <div className="skill-explorer">
    <div className="skill-section-heading"><div><p className="learning-eyebrow">Follow your curiosity</p><h2>Where would you like to begin?</h2></div><span className="skill-count">12 connected skills</span></div>
    <button type="button" className={`skill-overview ${selected==='all'?'is-selected':''}`} aria-pressed={selected==='all'} onClick={()=>onSelect('all')}><Compass size={28}/><span><strong>Discover my starting point</strong><small>Recommended · 12 questions across all 12 areas</small></span><ArrowUpRight size={22}/></button>
    <p className="learning-muted">Or follow one question that catches your attention. A focused check has 3 questions.</p>
    <div className="skill-filters" role="group" aria-label="Filter skill areas">{['All areas','Foundations','Interfaces','Data & services','Delivery'].map(name=><button type="button" aria-pressed={group===name} className={group===name?'active':''} key={name} onClick={()=>setGroup(name)}>{name}</button>)}</div>
    <div className="skill-discovery-grid">{skillAreas.filter(area=>group==='All areas'||area.group===group).map(area=><button type="button" className={`skill-topic ${selected===area.id?'is-selected':''}`} key={area.id} aria-pressed={selected===area.id} onClick={()=>onSelect(area.id)}><span className="skill-topic-top"><span className="skill-symbol" aria-hidden="true">{area.symbol}</span><span className="skill-group">{area.group}</span></span><strong>{area.name}</strong><span className="skill-curiosity">{area.question}</span><span className="skill-topic-footer">{selected===area.id?'Selected · 3-question check':'Explore this skill'}<ArrowUpRight size={16}/></span></button>)}</div>
  </div>;
}

export function SkillResults({result,busy,onExplore}:{result:Result;busy:boolean;onExplore:(id:string)=>void}){
  const [filter,setFilter]=useState('All skills');
  const areas=skillAreas.map(area=>({...area,evidence:result.skills.find(s=>s.skill===area.id)}));
  const priorities=[...areas].sort((a,b)=>(a.evidence?.percent??50)-(b.evidence?.percent??50));
  const next=priorities.find(area=>area.evidence&&area.evidence.percent<100)??areas.find(area=>!area.evidence)??areas[0];
  const demonstrated=result.skills.filter(s=>s.correct>0).length;
  const visible=areas.filter(area=>filter==='All skills'||filter==='Practice next'&&area.evidence&&area.evidence.percent<100||filter==='Correct answers'&&area.evidence&&area.evidence.correct>0||filter==='Not explored'&&!area.evidence);
  return <>
    <section className="skill-result-overview" aria-label="Assessment summary"><div><p className="learning-eyebrow">Your starting point, discovered</p><h2>Your demonstrated skills</h2><p>You have a clearer picture. Now make your next step count.</p><div className="skill-summary-stats"><span><strong>{result.skills.length}</strong> areas explored</span><span><strong>{demonstrated}</strong> with correct answers</span></div></div><div className="skill-score-ring" style={{'--score':`${result.percent}%`} as CSSProperties}><div><strong>{result.correct} / {result.total}</strong><span>{result.percent}% correct</span></div></div></section>
    <p className="learning-muted skill-evidence-note">{result.limitation} One correct answer is a useful signal, not proof of mastery.</p>
    <section className="skill-next-step"><span className="skill-symbol" aria-hidden="true"><Sparkles size={24}/></span><div><p className="learning-eyebrow">A useful next experiment</p><h3>{next.name}: {next.evidence?'look a little deeper':'explore an untested area'}</h3><p>{next.question} Try a focused check, then use the project idea to practice.</p></div><button className="learning-button" disabled={busy} onClick={()=>onExplore(next.id)}>Explore {next.name}<ArrowUpRight size={17}/></button></section>
    <div className="skill-section-heading"><div><h2>Your 12-skill map</h2><p>Open a card to find a practical next step.</p></div><span className="skill-count"><Layers3 size={16}/> {result.skills.length} of 12 explored</span></div>
    <div className="skill-filters" role="group" aria-label="Filter your skill results">{['All skills','Practice next','Correct answers','Not explored'].map(name=><button type="button" key={name} aria-pressed={filter===name} className={filter===name?'active':''} onClick={()=>setFilter(name)}>{name}</button>)}</div>
    {visible.length===0&&<p role="status" className="learning-card">No areas in this view. Choose another filter to keep exploring.</p>}<div className="skill-result-grid">{visible.map(area=><details className="skill-result-card" key={area.id}><summary><span className="skill-topic-top"><span className="skill-symbol" aria-hidden="true">{area.symbol}</span><span className={`skill-status ${!area.evidence?'untested':area.evidence.percent===100?'observed':'practice'}`}>{!area.evidence?'Not explored':area.evidence.percent===100?'Correct in this sample':'Practice next'}</span></span><span className="skill-result-name">{area.name}</span><span className="skill-result-evidence">{area.evidence?`${area.evidence.correct}/${area.evidence.total} correct · limited sample`:'No answers in this area yet'}</span><span className="skill-meter" aria-hidden="true"><span style={{width:`${area.evidence?.percent??0}%`}}/></span><span className="skill-topic-footer">Discover your next step <span aria-hidden="true">+</span></span></summary><div className="skill-card-detail"><p>{area.description}</p><p><strong>Try building this</strong><br/>{area.project}</p><button className="learning-button secondary" disabled={busy} onClick={()=>onExplore(area.id)}>Try {area.name} check</button><a href={`/programmes/${area.module}`}>Explore the related course module →</a></div></details>)}</div>
  </>;
}
