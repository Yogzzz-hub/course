import type { Pool } from 'pg';
export const funnelStages=['page_view','assessment_started','assessment_completed','roadmap_viewed','course_viewed','counselling_requested','enrollment_started','payment_confirmed'];
export function classifyAttribution(input:{source?:string;medium?:string;campaign?:string;referrer?:string},origin:string){
  const clean=(value?:string)=>value?.replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,80)||'';
  let host='';try{const url=new URL(input.referrer||'');if(['https:','http:'].includes(url.protocol)&&url.origin!==origin)host=url.hostname;}catch{/* Missing referrer is direct/unknown. */}
  const source=clean(input.source),medium=clean(input.medium),campaign=clean(input.campaign);
  return {channel:source||campaign?'campaign':/\b(google|bing|duckduckgo|yahoo)\./.test(host)?'organic':host?'referral':'direct-or-unknown',source,medium,campaign,referrerHost:host};
}
export function leadPriority(status:string,hasAssessment:boolean){return status==='qualified'?'Qualified by counselor':hasAssessment?'Assessment completed; review expressed interest':'New enquiry; ask about learning goals';}
export function csvCell(value:unknown){const text=String(value??'');return '"'+(/^[\s]*[=+\-@\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
export function orderedFunnel(rows:{session_id:string;name:string;at:Date|string}[]){
  const progress=new Map<string,number>(),counts=funnelStages.map(()=>0);
  for(const row of [...rows].sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime())){
    const stage=progress.get(row.session_id)??0;
    if(row.name===funnelStages[stage]){counts[stage]++;progress.set(row.session_id,stage+1);}
  }
  return counts;
}
export async function conversionReport(db:Pool){
  const rows=(await db.query(`SELECT session_id,name,created_at AS at FROM learning_events
    WHERE created_at>now()-interval '30 days' ORDER BY created_at,id`)).rows;
  const counts=orderedFunnel(rows);
  const sources=await db.query(`SELECT COALESCE(attribution->>'channel','unattributed') AS channel,count(DISTINCT session_id)::int AS sessions
    FROM learning_events WHERE name='page_view' AND created_at>now()-interval '30 days' GROUP BY channel`);
  const quality=await db.query(`SELECT state,count(*)::int AS submissions,sum(retries)::int AS retries FROM learning_submissions GROUP BY state`);
  const demand=await db.query(`SELECT interest,count(*)::int AS enquiries,count(*) FILTER(WHERE status='qualified')::int AS qualified FROM learning_leads GROUP BY interest ORDER BY enquiries DESC`);
  return {funnel:funnelStages.map((name,i)=>({name,sessions:counts[i],conversion:i&&counts[i-1]?Math.round(counts[i]/counts[i-1]*100):null,connected:!['enrollment_started','payment_confirmed'].includes(name)})),sources:sources.rows,quality:quality.rows,demand:demand.rows,
    notice:'Funnel counts consenting sessions that reached every preceding stage in order within 30 days. This is not a count of unique people. Missing downstream payment integrations are reported as unavailable, not zero revenue.'};
}
