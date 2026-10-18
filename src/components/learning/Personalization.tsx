import { useEffect,useState } from 'react';
import { Link,useLocation } from 'react-router-dom';
import { learningApi,learningSession,setLearningAnalytics,trackLearningPage,restoreLearningSession,learningAnalyticsEnabled } from './client';
export function Personalization(){
  const {pathname}=useLocation();const [enabled,setEnabled]=useState(learningAnalyticsEnabled),[error,setError]=useState('');
  useEffect(()=>{const update=(event:Event)=>setEnabled((event as CustomEvent<boolean>).detail);window.addEventListener('learning-consent',update);return()=>window.removeEventListener('learning-consent',update);},[]);
  useEffect(()=>{void restoreLearningSession().catch(()=>{});},[]);
  const contextual=pathname.startsWith('/programmes/')?'Want to test your skills before choosing a programme?':'Discover your skills and plan your next learning step.';
  if(pathname.startsWith('/admin') || pathname==='/assessment' || pathname==='/shared-roadmap')return null;
  return <aside className="container" style={{paddingBlock:'1.5rem'}} aria-label="Learning preferences"><details><summary>Learning suggestions and privacy preferences</summary><p>{contextual}</p><p><Link to="/assessment">Take or resume your private assessment</Link> · <Link to="/leaderboard">Optional learner community</Link></p><p>Optional first-party analytics and stable experiment assignment are off by default. Enabling creates a seven-day session cookie. You can opt out and erase optional events at any time.</p><label><input type="checkbox" checked={enabled} onChange={e=>{const value=e.target.checked;void learningSession().then(()=>learningApi('/preferences',{analytics:value})).then(()=>{setLearningAnalytics(value);setEnabled(value);if(value)trackLearningPage(pathname);}).catch(e=>setError(e.message));}}/> Allow optional learning analytics and experiments</label>{error&&<p role="alert">{error}</p>}</details></aside>;
}
