import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { learningApi,learningAnalyticsEnabled } from './client';
export function ExperimentLink({id,to,label,className}:{id:string;to:string;label:string;className?:string}){
  const [text,setText]=useState(label);
  useEffect(()=>{
    let active=true;let revision=0;const update=(enabled:boolean)=>{
      const current=++revision;
      if(!enabled){setText(label);return;}
      void learningApi<{assignments:{experiment_id:string;variant:string}[]}>('/experiments',{}).then(r=>{if(active&&current===revision)setText(r.assignments.find(a=>a.experiment_id===id)?.variant||label);}).catch(()=>{});
    };
    const change=(event:Event)=>update((event as CustomEvent<boolean>).detail);
    update(learningAnalyticsEnabled());
    window.addEventListener('learning-consent',change);return()=>{active=false;window.removeEventListener('learning-consent',change);};
  },[id,label]);
  return <Link className={className} to={to}>{text}</Link>;
}
