import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { learningApi,type Roadmap } from '../components/learning/client';
import '../components/learning/learning.css';
export default function SharedRoadmap(){
  const [report,setReport]=useState<Roadmap|null>(null),[error,setError]=useState('');
  const [shareToken]=useState(()=>typeof location==='undefined'?'':location.hash.slice(1));
  useEffect(()=>{let active=true;history.replaceState(null,'',location.pathname);if(!/^[a-f0-9]{64}$/.test(shareToken)){setError('Open the complete share link provided by its owner.');return;}void learningApi<{report:Roadmap}>('/shared-report',{token:shareToken}).then(data=>{if(active)setReport(data.report);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[shareToken]);
  return <div className="learning-shell"><h1>Shared learning roadmap</h1><p>This report was explicitly shared by its owner. It is a learning guide, not a hiring certification.</p>{error&&<p role="alert">{error}</p>}{report?<section className="learning-card"><h2>{report.role}</h2><p>{report.basis}</p><ol>{report.steps.map(step=><li key={step.skill}><h3>{step.skill}: {step.priority}</h3><p>{step.evidence}. {step.project}</p><Link to={step.module}>Explore relevant learning</Link></li>)}</ol></section>:!error&&<p role="status">Checking access…</p>}</div>;
}
