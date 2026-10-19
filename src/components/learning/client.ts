export interface QuestionView {id:string;version:number;skill:string;difficulty:number;kind:string;prompt:string;options:string[]}
export interface Result {graderVersion:string;correct:number;total:number;percent:number;limitation:string;skills:{skill:string;correct:number;total:number;percent:number;module:string}[];explanations:{id:string;version:number;prompt:string;selected:string;answer:string;correct:boolean;explanation:string;objective:string}[]}
export interface Attempt {id:string;answered:number;total:number;track:number;question:QuestionView|null;result:Result|null}
export interface Roadmap {id?:string;jobNotice?:string;jobSkills?:string[];version:string;role:string;basis:string;steps:{skill:string;evidence:string;priority:string;project:string;module:string}[]}
export interface ChallengeView {id:string;version:number;title:string;difficulty:string;category:string;statement:string;starter:string;samples:{input:unknown;output:unknown}[]}
let csrf='';
let adminCsrf='';
let analyticsOptedIn=false;
export function learningAnalyticsEnabled(){return analyticsOptedIn;}
export function setLearningAnalytics(enabled:boolean){analyticsOptedIn=enabled;if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('learning-consent',{detail:enabled}));}
export function trackLearningPage(path:string){
  if(!analyticsOptedIn || !csrf || !/^\/[a-z0-9/-]*$/.test(path))return;
  const name=path.startsWith('/programmes/')?'course_viewed':'page_view';
  const query=new URLSearchParams(location.search);
  void learningApi('/events',{name,path,attribution:{source:query.get('utm_source')?.slice(0,80),medium:query.get('utm_medium')?.slice(0,80),campaign:query.get('utm_campaign')?.slice(0,80),referrer:document.referrer.slice(0,2048)}}).catch(()=>{});
}
export function setAdminCsrf(value:string){adminCsrf=value;}
export async function learningApi<T>(path:string, input?:unknown, method=input===undefined?'GET':'POST'):Promise<T> {
  let response:Response;
  try{response=await fetch(`/api/learning${path}`,{method,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json',...(input===undefined?{}:{'Content-Type':'application/json'}),'X-CSRF-Token':path.startsWith('/admin')?adminCsrf:csrf},body:input===undefined?undefined:JSON.stringify(input)});}
  catch{throw new Error('The learning service could not be reached. Check your connection and retry. If you just submitted an answer, it may already be saved.');}
  let data:unknown;
  try{data=await response.json();}catch{throw new Error('The learning service is unavailable. Please retry shortly.');}
  if(typeof data!=='object'||data===null)throw new Error('The learning service returned an invalid response. Please retry shortly.');
  if(!response.ok) throw new Error(typeof data==='object' && data && 'message' in data && typeof data.message==='string' ? data.message : 'The learning service could not complete the request.');
  return data as T;
}
export async function learningSession(){const result=await learningApi<{csrf:string;analytics:boolean}>('/session');csrf=result.csrf;setLearningAnalytics(result.analytics);return result;}
export async function restoreLearningSession(){
  if(csrf)return;
  const result=await learningApi<{csrf:string;analytics:boolean}>('/session/current');
  if(!csrf){csrf=result.csrf;setLearningAnalytics(result.analytics);}
}
export const careerRoles=['Python Developer','Backend Developer','Full-Stack Developer','Frontend Developer','Software Engineer'];
